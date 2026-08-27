"""Sync payroll gaji & pinjaman into operational cash (kas operasional)."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce

from expenses.models import EntryKind, OperationalCashEntry, OperationalCategory, PaymentMethod
from payroll.exceptions import PayrollWorkflowError
from payroll.models import PayrollEntry, PayrollLoanItem, PayrollPeriod

GAJI_CATEGORY_SLUG = "gaji-upah"
PINJAMAN_CATEGORY_SLUG = "pinjaman-karyawan"


def _quantize_idr(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _compute_net(gross: Decimal, bonus: Decimal, deductions: Decimal, advance: Decimal) -> Decimal:
    net = gross + bonus - deductions - advance
    if net < 0:
        net = Decimal("0")
    return _quantize_idr(net)


def _idr_int(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _expense_category(slug: str, name: str, description: str, sort_order: int) -> OperationalCategory:
    cat, _created = OperationalCategory.objects.get_or_create(
        slug=slug,
        defaults={
            "name": name,
            "entry_kind": EntryKind.EXPENSE,
            "description": description,
            "sort_order": sort_order,
            "is_active": True,
        },
    )
    return cat


def refresh_entry_advance_from_loans(entry: PayrollEntry) -> PayrollEntry:
    total = entry.loan_items.aggregate(
        s=Coalesce(Sum("amount_idr"), Value(Decimal("0")))
    )["s"] or Decimal("0")
    entry.advance_deduction_idr = _quantize_idr(total)
    entry.net_pay_idr = _compute_net(
        entry.gross_idr,
        entry.bonus_idr,
        entry.deductions_idr,
        entry.advance_deduction_idr,
    )
    entry.save(update_fields=["advance_deduction_idr", "net_pay_idr", "updated_at"])
    return entry


def sync_loan_cash_entry(item: PayrollLoanItem, user) -> OperationalCashEntry | None:
    """Create/update the kas pengeluaran for a loan disbursement."""
    amount = _idr_int(item.amount_idr)
    if amount < 1:
        return None
    category = _expense_category(
        PINJAMAN_CATEGORY_SLUG,
        "Pinjaman karyawan",
        "Uang pinjaman yang diberikan ke pegawai (dipotong dari gaji).",
        15,
    )
    employee_name = item.entry.employee.full_name or item.entry.employee.username
    note = (item.note or "").strip()
    description = f"Pinjaman {employee_name}" + (f" — {note}" if note else "")
    reference = f"PAYROLL-LOAN-{item.pk}"
    method = item.payment_method if item.payment_method in PaymentMethod.values else PaymentMethod.CASH

    if item.cash_entry_id:
        cash = item.cash_entry
        cash.direction = EntryKind.EXPENSE
        cash.payment_method = method
        cash.category = category
        cash.amount_idr = amount
        cash.occurred_on = item.occurred_on
        cash.description = description
        cash.reference = reference
        cash.updated_by = user
        cash.save()
        return cash

    cash = OperationalCashEntry.objects.create(
        direction=EntryKind.EXPENSE,
        payment_method=method,
        category=category,
        amount_idr=amount,
        occurred_on=item.occurred_on,
        description=description,
        reference=reference,
        created_by=user,
        updated_by=user,
    )
    item.cash_entry = cash
    item.save(update_fields=["cash_entry", "updated_at"])
    return cash


def delete_loan_item(item: PayrollLoanItem) -> PayrollEntry:
    entry = item.entry
    cash = item.cash_entry
    item.delete()
    if cash is not None:
        cash.delete()
    return refresh_entry_advance_from_loans(entry)


@transaction.atomic
def save_loan_item(*, entry: PayrollEntry, user, amount: Decimal, occurred_on, payment_method: str, note: str, item: PayrollLoanItem | None = None) -> PayrollLoanItem:
    if entry.period.status != PayrollPeriod.Status.DRAFT:
        raise PayrollWorkflowError("Pinjaman hanya bisa diubah pada periode draft.")
    if item is None:
        item = PayrollLoanItem(
            entry=entry,
            created_by=user,
        )
    item.amount_idr = _quantize_idr(amount)
    item.occurred_on = occurred_on
    item.payment_method = payment_method
    item.note = (note or "").strip()
    item.save()
    refresh_entry_advance_from_loans(entry)
    sync_loan_cash_entry(item, user)
    return item


def delete_period_gaji_cash_entry(period: PayrollPeriod) -> None:
    """Remove the period's gaji kas line so saldo dana is restored."""
    cash = period.gaji_cash_entry
    if cash is None and not period.gaji_cash_entry_id:
        return
    period.gaji_cash_entry = None
    period.save(update_fields=["gaji_cash_entry", "updated_at"])
    if cash is not None:
        cash.delete()


@transaction.atomic
def post_period_gaji_to_cash(
    period: PayrollPeriod,
    user,
    payment_method: str = PaymentMethod.CASH,
    *,
    allow_zero: bool = False,
) -> OperationalCashEntry | None:
    """Record total net pay as one kas pengeluaran (Gaji & upah) after tutup buku."""
    if period.status != PayrollPeriod.Status.FINALIZED:
        raise PayrollWorkflowError("Catat gaji ke kas hanya setelah tutup buku (periode dikunci).")

    entries = list(PayrollEntry.objects.filter(period=period))
    if not entries:
        raise PayrollWorkflowError("Belum ada entri payroll. Jalankan generate terlebih dahulu.")

    total_net = sum((e.net_pay_idr for e in entries), Decimal("0"))
    amount = _idr_int(total_net)
    if amount < 1:
        if allow_zero:
            delete_period_gaji_cash_entry(period)
            return None
        raise PayrollWorkflowError("Total gaji bersih bernilai 0 — tidak ada yang dicatat ke kas.")

    category = _expense_category(
        GAJI_CATEGORY_SLUG,
        "Gaji & upah",
        "Gaji karyawan dan upah harian.",
        20,
    )
    method = payment_method if payment_method in PaymentMethod.values else PaymentMethod.CASH
    label = f"{period.get_cadence_display()} {period.pay_date.isoformat()}"
    description = f"Gaji {label} — total bersih {len(entries)} pegawai"
    reference = f"PAYROLL-GAJI-{period.pk}"

    if period.gaji_cash_entry_id:
        cash = period.gaji_cash_entry
        cash.direction = EntryKind.EXPENSE
        cash.payment_method = method
        cash.category = category
        cash.amount_idr = amount
        cash.occurred_on = period.pay_date
        cash.description = description
        cash.reference = reference
        cash.updated_by = user
        cash.save()
        return cash

    cash = OperationalCashEntry.objects.create(
        direction=EntryKind.EXPENSE,
        payment_method=method,
        category=category,
        amount_idr=amount,
        occurred_on=period.pay_date,
        description=description,
        reference=reference,
        created_by=user,
        updated_by=user,
    )
    period.gaji_cash_entry = cash
    period.save(update_fields=["gaji_cash_entry", "updated_at"])
    return cash
