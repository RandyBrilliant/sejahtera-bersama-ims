from decimal import ROUND_HALF_UP, Decimal

from django.db import migrations, models


def recompute_signed_net_pay(apps, schema_editor):
    PayrollEntry = apps.get_model("payroll", "PayrollEntry")
    quantize = Decimal("0.01")
    for entry in PayrollEntry.objects.iterator():
        net = (
            entry.gross_idr
            + entry.bonus_idr
            - entry.deductions_idr
            - entry.advance_deduction_idr
        ).quantize(quantize, rounding=ROUND_HALF_UP)
        if entry.net_pay_idr != net:
            entry.net_pay_idr = net
            entry.save(update_fields=["net_pay_idr"])


class Migration(migrations.Migration):
    dependencies = [
        ("payroll", "0010_uppercase_loan_notes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payrollentry",
            name="net_pay_idr",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Bisa negatif jika pinjaman melebihi gaji periode ini.",
                max_digits=14,
                verbose_name="net pay (IDR)",
            ),
        ),
        migrations.RunPython(recompute_signed_net_pay, migrations.RunPython.noop),
    ]
