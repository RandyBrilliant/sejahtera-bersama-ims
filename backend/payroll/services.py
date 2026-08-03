"""Generate & finalisasi periode gaji dari presensi (DAILY) atau kupas (PIECE_RATE)."""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

from attendance.services import work_hours_between
from attendance.utils_lateness import get_attendance_settings
from payroll.models import (
    EmployeeCompensation,
    KupasProductionRecord,
    PayCadence,
    PayrollEntry,
    PayrollPeriod,
    PayType,
)


class PayrollWorkflowError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def _quantize_idr(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _quantize_kg(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def period_cutoff(period: PayrollPeriod):
    return period.period_end_date


def _previous_finalized_cutoff(before_pay_date, cadence: str) -> date | None:
    prev = (
        PayrollPeriod.objects.filter(
            status=PayrollPeriod.Status.FINALIZED,
            cadence=cadence,
            pay_date__lt=before_pay_date,
        )
        .order_by("-period_end_date")
        .values_list("period_end_date", flat=True)
        .first()
    )
    return prev


def compute_period_start_hint(period: PayrollPeriod, swept_min_date=None):
    """Informational period_start: day after last finalized cutoff, or min swept date."""
    from datetime import timedelta

    prev_cutoff = _previous_finalized_cutoff(period.pay_date, period.cadence)
    if prev_cutoff is not None:
        return prev_cutoff + timedelta(days=1)
    if swept_min_date is not None:
        return swept_min_date
    return period.period_start_date


def compute_day_pay(row, daily_rate: Decimal, settings) -> tuple[Decimal, Decimal]:
    """Return (gross_for_day, deductions_for_day)."""
    gross = daily_rate
    deduction = Decimal("0")

    hours = work_hours_between(row.checked_in_at, row.checked_out_at)
    if hours is None or hours < settings.minimum_work_hours_full_day:
        gross = _quantize_idr(daily_rate / Decimal("2"))

    if row.is_late:
        deduction += settings.late_fine_idr

    return gross, deduction


def _compute_net(gross: Decimal, bonus: Decimal, deductions: Decimal, advance: Decimal) -> Decimal:
    net = gross + bonus - deductions - advance
    if net < 0:
        net = Decimal("0")
    return _quantize_idr(net)


def _unpaid_attendance_qs(employee_id: int, cutoff):
    from attendance.models import AttendanceDailyCheckIn

    return AttendanceDailyCheckIn.objects.filter(
        employee_id=employee_id,
        work_date__lte=cutoff,
        paid_in_period__isnull=True,
    )


def _unpaid_kupas_qs(employee_id: int, cutoff):
    return KupasProductionRecord.objects.filter(
        employee_id=employee_id,
        work_date__lte=cutoff,
        paid_in_period__isnull=True,
    ).select_related("kupas_item")


def _generate_daily_entry(period, comp, settings, existing_bonus=Decimal("0"), existing_advance=Decimal("0")):
    """DAILY: unpaid attendance × day pay (Sunday included at same rate)."""
    cutoff = period_cutoff(period)
    rows = list(_unpaid_attendance_qs(comp.user_id, cutoff))
    days_present = len(rows)
    late_count = sum(1 for row in rows if row.is_late)
    daily_rate = comp.daily_rate_idr

    gross_total = Decimal("0")
    deductions = Decimal("0")
    for row in rows:
        day_gross, day_deduction = compute_day_pay(row, daily_rate, settings)
        gross_total += day_gross
        deductions += day_deduction

    gross_total = _quantize_idr(gross_total)
    deductions = _quantize_idr(deductions)
    net_pay = _compute_net(gross_total, existing_bonus, deductions, existing_advance)

    return {
        "pay_type_snapshot": PayType.DAILY,
        "base_salary_snapshot_idr": comp.monthly_base_salary_idr,
        "daily_rate_snapshot_idr": daily_rate,
        "days_present": days_present,
        "late_count": late_count,
        "total_kg": Decimal("0"),
        "gross_idr": gross_total,
        "deductions_idr": deductions,
        "bonus_idr": existing_bonus,
        "advance_deduction_idr": existing_advance,
        "net_pay_idr": net_pay,
    }


def _generate_monthly_fixed_entry(
    period, comp, settings, existing_bonus=Decimal("0"), existing_advance=Decimal("0")
):
    """Monthly DAILY with gaji pokok set: fixed base + late fines from unpaid attendance."""
    cutoff = period_cutoff(period)
    rows = list(_unpaid_attendance_qs(comp.user_id, cutoff))
    late_count = sum(1 for row in rows if row.is_late)
    deductions = _quantize_idr(settings.late_fine_idr * late_count)
    gross_total = _quantize_idr(comp.monthly_base_salary_idr)
    net_pay = _compute_net(gross_total, existing_bonus, deductions, existing_advance)

    return {
        "pay_type_snapshot": PayType.DAILY,
        "base_salary_snapshot_idr": comp.monthly_base_salary_idr,
        "daily_rate_snapshot_idr": Decimal("0"),
        "days_present": len(rows),
        "late_count": late_count,
        "total_kg": Decimal("0"),
        "gross_idr": gross_total,
        "deductions_idr": deductions,
        "bonus_idr": existing_bonus,
        "advance_deduction_idr": existing_advance,
        "net_pay_idr": net_pay,
    }


def uses_monthly_fixed_salary(comp: EmployeeCompensation) -> bool:
    """True when monthly cadence + DAILY + gaji pokok bulanan > 0."""
    return (
        comp.pay_cadence == PayCadence.MONTHLY
        and comp.pay_type == PayType.DAILY
        and comp.monthly_base_salary_idr > 0
    )


def _generate_piece_rate_entry(period, comp, existing_bonus=Decimal("0"), existing_advance=Decimal("0")):
    """PIECE_RATE (weekly or monthly): unpaid kg × rate — never gaji pokok."""
    cutoff = period_cutoff(period)
    records = list(_unpaid_kupas_qs(comp.user_id, cutoff))

    gross_total = Decimal("0")
    total_kg = Decimal("0")
    for rec in records:
        rate = rec.kupas_item.rate_per_kg_idr
        amount = _quantize_idr(rec.kg * rate)
        gross_total += amount
        total_kg += rec.kg

    gross_total = _quantize_idr(gross_total)
    total_kg = _quantize_kg(total_kg)
    net_pay = _compute_net(gross_total, existing_bonus, Decimal("0"), existing_advance)

    return {
        "pay_type_snapshot": PayType.PIECE_RATE,
        "base_salary_snapshot_idr": comp.monthly_base_salary_idr,
        "daily_rate_snapshot_idr": Decimal("0"),
        "days_present": 0,
        "late_count": 0,
        "total_kg": total_kg,
        "gross_idr": gross_total,
        "deductions_idr": Decimal("0"),
        "bonus_idr": existing_bonus,
        "advance_deduction_idr": existing_advance,
        "net_pay_idr": net_pay,
    }


@transaction.atomic
def generate_payroll_entries(period: PayrollPeriod) -> int:
    if period.status != PayrollPeriod.Status.DRAFT:
        raise PayrollWorkflowError("Hanya periode DRAFT yang dapat dihasilkan ulang.")

    settings = get_attendance_settings()
    cutoff = period_cutoff(period)

    existing_entries = {
        e.employee_id: e
        for e in PayrollEntry.objects.filter(period=period).select_for_update()
    }

    comps = EmployeeCompensation.objects.select_related("user").filter(
        user__is_active=True,
        pay_cadence=period.cadence,
    )
    count = 0
    swept_dates = []

    for c in comps:
        existing = existing_entries.get(c.user_id)
        existing_bonus = existing.bonus_idr if existing else Decimal("0")
        existing_advance = existing.advance_deduction_idr if existing else Decimal("0")
        existing_notes = existing.notes if existing else ""

        if c.pay_type == PayType.PIECE_RATE:
            has_work = _unpaid_kupas_qs(c.user_id, cutoff).exists()
            if not has_work and existing is None:
                continue
            payload = _generate_piece_rate_entry(period, c, existing_bonus, existing_advance)
            dates = list(_unpaid_kupas_qs(c.user_id, cutoff).values_list("work_date", flat=True))
            swept_dates.extend(dates)
        elif uses_monthly_fixed_salary(c):
            # Gaji pokok set → fixed monthly (entry even with no attendance)
            payload = _generate_monthly_fixed_entry(
                period, c, settings, existing_bonus, existing_advance
            )
            dates = list(_unpaid_attendance_qs(c.user_id, cutoff).values_list("work_date", flat=True))
            swept_dates.extend(dates)
        else:
            # No gaji pokok → tarif harian × hadir (weekly or monthly)
            has_work = _unpaid_attendance_qs(c.user_id, cutoff).exists()
            if not has_work and existing is None:
                continue
            payload = _generate_daily_entry(period, c, settings, existing_bonus, existing_advance)
            dates = list(_unpaid_attendance_qs(c.user_id, cutoff).values_list("work_date", flat=True))
            swept_dates.extend(dates)

        if existing:
            for key, val in payload.items():
                setattr(existing, key, val)
            existing.notes = existing_notes
            existing.save()
        else:
            PayrollEntry.objects.create(
                period=period,
                employee_id=c.user_id,
                notes=existing_notes,
                **payload,
            )
        count += 1

    # Drop entries for employees who no longer match this period's cadence
    kept_user_ids = set(
        EmployeeCompensation.objects.filter(
            user__is_active=True,
            pay_cadence=period.cadence,
        ).values_list("user_id", flat=True)
    )
    PayrollEntry.objects.filter(period=period).exclude(employee_id__in=kept_user_ids).delete()

    min_swept = min(swept_dates) if swept_dates else None
    new_start = compute_period_start_hint(period, min_swept)
    if new_start != period.period_start_date:
        period.period_start_date = new_start
        period.save(update_fields=["period_start_date", "updated_at"])
    else:
        period.save(update_fields=["updated_at"])

    return count


@transaction.atomic
def finalize_payroll_period(period: PayrollPeriod, finalized_by_user_id: int) -> PayrollPeriod:
    if period.status == PayrollPeriod.Status.FINALIZED:
        raise PayrollWorkflowError("Periode sudah dikunci.")

    entries = list(PayrollEntry.objects.filter(period=period).select_related("employee"))
    if not entries:
        raise PayrollWorkflowError("Belum ada entri payroll. Jalankan Generate terlebih dahulu.")

    cutoff = period_cutoff(period)
    from attendance.models import AttendanceDailyCheckIn

    for entry in entries:
        comp = EmployeeCompensation.objects.filter(user_id=entry.employee_id).first()
        if comp is None:
            continue

        if entry.pay_type_snapshot == PayType.PIECE_RATE:
            records = list(_unpaid_kupas_qs(entry.employee_id, cutoff))
            for rec in records:
                rate = rec.kupas_item.rate_per_kg_idr
                rec.rate_snapshot_idr = rate
                rec.amount_idr = _quantize_idr(rec.kg * rate)
                rec.paid_in_period = period
                rec.save(update_fields=["rate_snapshot_idr", "amount_idr", "paid_in_period", "updated_at"])
        else:
            AttendanceDailyCheckIn.objects.filter(
                employee_id=entry.employee_id,
                work_date__lte=cutoff,
                paid_in_period__isnull=True,
            ).update(paid_in_period=period)

    period.status = PayrollPeriod.Status.FINALIZED
    period.finalized_at = timezone.now()
    period.finalized_by_id = finalized_by_user_id
    period.save(update_fields=["status", "finalized_at", "finalized_by_id", "updated_at"])
    return period


@transaction.atomic
def unfinalize_payroll_period(period: PayrollPeriod) -> PayrollPeriod:
    """Buka kunci periode (DRAFT lagi) — hanya jika tidak ada periode lebih baru yang sudah dikunci."""
    if period.status != PayrollPeriod.Status.FINALIZED:
        raise PayrollWorkflowError("Periode belum dikunci.")

    later_locked = PayrollPeriod.objects.filter(
        cadence=period.cadence,
        status=PayrollPeriod.Status.FINALIZED,
        pay_date__gt=period.pay_date,
    ).exists()
    if later_locked:
        raise PayrollWorkflowError(
            "Tidak bisa membuka kunci: ada periode dengan cadence yang sama yang lebih baru dan sudah dikunci."
        )

    from attendance.models import AttendanceDailyCheckIn

    AttendanceDailyCheckIn.objects.filter(paid_in_period=period).update(paid_in_period=None)
    KupasProductionRecord.objects.filter(paid_in_period=period).update(paid_in_period=None)

    period.status = PayrollPeriod.Status.DRAFT
    period.finalized_at = None
    period.finalized_by_id = None
    period.save(update_fields=["status", "finalized_at", "finalized_by_id", "updated_at"])
    return period


def build_payroll_slip_detail(entry: PayrollEntry) -> dict:
    """Detail slip gaji satu pegawai — hanya periode FINALIZED."""
    period = entry.period
    if period.status != PayrollPeriod.Status.FINALIZED:
        raise PayrollWorkflowError("Slip hanya tersedia untuk periode yang dikunci.")

    settings = get_attendance_settings()
    lines: list[dict] = []

    if entry.pay_type_snapshot == PayType.PIECE_RATE:
        records = (
            KupasProductionRecord.objects.filter(
                employee_id=entry.employee_id,
                paid_in_period=period,
            )
            .select_related("kupas_item")
            .order_by("work_date", "id")
        )
        for rec in records:
            lines.append(
                {
                    "line_type": "KUPAS",
                    "work_date": rec.work_date.isoformat(),
                    "kupas_item_name": rec.kupas_item.name,
                    "kg": str(rec.kg),
                    "rate_per_kg_idr": str(rec.rate_snapshot_idr),
                    "gross_idr": str(rec.amount_idr),
                    "deduction_idr": "0",
                    "is_late": False,
                    "is_half_day": False,
                }
            )
    elif (
        period.cadence == PayCadence.MONTHLY
        and entry.pay_type_snapshot == PayType.DAILY
        and entry.daily_rate_snapshot_idr == 0
        and entry.base_salary_snapshot_idr > 0
    ):
        # Fixed monthly (gaji pokok diisi): one salary line + late fine lines
        lines.append(
            {
                "line_type": "SALARY",
                "work_date": period.period_start_date.isoformat(),
                "kupas_item_name": "Gaji pokok bulanan",
                "kg": "0",
                "rate_per_kg_idr": "0",
                "gross_idr": str(entry.base_salary_snapshot_idr),
                "deduction_idr": "0",
                "is_late": False,
                "is_half_day": False,
            }
        )
        from attendance.models import AttendanceDailyCheckIn

        rows = AttendanceDailyCheckIn.objects.filter(
            employee_id=entry.employee_id,
            paid_in_period=period,
            is_late=True,
        ).order_by("work_date")
        for row in rows:
            lines.append(
                {
                    "line_type": "ATTENDANCE",
                    "work_date": row.work_date.isoformat(),
                    "kupas_item_name": "",
                    "kg": "0",
                    "rate_per_kg_idr": "0",
                    "gross_idr": "0",
                    "deduction_idr": str(settings.late_fine_idr),
                    "is_late": True,
                    "is_half_day": False,
                }
            )
    else:
        from attendance.models import AttendanceDailyCheckIn

        rows = AttendanceDailyCheckIn.objects.filter(
            employee_id=entry.employee_id,
            paid_in_period=period,
        ).order_by("work_date")
        daily_rate = entry.daily_rate_snapshot_idr
        for row in rows:
            gross, deduction = compute_day_pay(row, daily_rate, settings)
            hours = work_hours_between(row.checked_in_at, row.checked_out_at)
            is_half_day = hours is None or hours < settings.minimum_work_hours_full_day
            lines.append(
                {
                    "line_type": "ATTENDANCE",
                    "work_date": row.work_date.isoformat(),
                    "kupas_item_name": "",
                    "kg": "0",
                    "rate_per_kg_idr": "0",
                    "gross_idr": str(gross),
                    "deduction_idr": str(deduction),
                    "is_late": row.is_late,
                    "is_half_day": is_half_day,
                }
            )

    employee = entry.employee
    return {
        "entry_id": entry.id,
        "period_id": period.id,
        "pay_date": period.pay_date.isoformat(),
        "period_start_date": period.period_start_date.isoformat(),
        "period_end_date": period.period_end_date.isoformat(),
        "cadence": period.cadence,
        "finalized_at": period.finalized_at.isoformat() if period.finalized_at else None,
        "employee_id": employee.pk,
        "employee_name": employee.full_name,
        "employee_username": employee.username,
        "pay_type_snapshot": entry.pay_type_snapshot,
        "daily_rate_snapshot_idr": str(entry.daily_rate_snapshot_idr),
        "base_salary_snapshot_idr": str(entry.base_salary_snapshot_idr),
        "days_present": entry.days_present,
        "late_count": entry.late_count,
        "total_kg": str(entry.total_kg),
        "gross_idr": str(entry.gross_idr),
        "bonus_idr": str(entry.bonus_idr),
        "advance_deduction_idr": str(entry.advance_deduction_idr),
        "deductions_idr": str(entry.deductions_idr),
        "net_pay_idr": str(entry.net_pay_idr),
        "notes": entry.notes,
        "lines": lines,
    }
