from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_advances_into_loan_items(apps, schema_editor):
    PayrollEntry = apps.get_model("payroll", "PayrollEntry")
    PayrollLoanItem = apps.get_model("payroll", "PayrollLoanItem")
    PayrollPeriod = apps.get_model("payroll", "PayrollPeriod")
    periods = {p.pk: p.pay_date for p in PayrollPeriod.objects.all()}
    for entry in PayrollEntry.objects.filter(advance_deduction_idr__gt=0):
        pay_date = periods.get(entry.period_id)
        if pay_date is None:
            continue
        PayrollLoanItem.objects.create(
            entry_id=entry.pk,
            amount_idr=entry.advance_deduction_idr,
            occurred_on=pay_date,
            payment_method="CASH",
            note="Pinjaman (migrasi)",
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("expenses", "0004_operationalcashentry_payment_method"),
        ("payroll", "0008_alter_employeecompensation_rate_help_text"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollperiod",
            name="gaji_cash_entry",
            field=models.OneToOneField(
                blank=True,
                help_text="Entri kas operasional untuk total gaji bersih periode ini.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payroll_period_gaji",
                to="expenses.operationalcashentry",
                verbose_name="gaji kas entry",
            ),
        ),
        migrations.CreateModel(
            name="PayrollLoanItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "amount_idr",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=14,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                        verbose_name="amount (IDR)",
                    ),
                ),
                ("occurred_on", models.DateField(db_index=True, verbose_name="occurred on")),
                (
                    "payment_method",
                    models.CharField(
                        choices=[("CASH", "Cash"), ("TRANSFER", "Transfer")],
                        db_index=True,
                        default="CASH",
                        max_length=10,
                        verbose_name="payment method",
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=255, verbose_name="note")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "cash_entry",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payroll_loan_item",
                        to="expenses.operationalcashentry",
                        verbose_name="kas entry",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="created by",
                    ),
                ),
                (
                    "entry",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="loan_items",
                        to="payroll.payrollentry",
                        verbose_name="payroll entry",
                    ),
                ),
            ],
            options={
                "verbose_name": "payroll loan item",
                "verbose_name_plural": "payroll loan items",
                "ordering": ["occurred_on", "id"],
            },
        ),
        migrations.RunPython(copy_advances_into_loan_items, noop_reverse),
    ]
