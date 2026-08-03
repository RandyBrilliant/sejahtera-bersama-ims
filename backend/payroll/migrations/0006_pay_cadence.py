# Generated manually for pay cadence

from decimal import Decimal

import django.core.validators
from django.db import migrations, models


def backfill_cadence(apps, schema_editor):
    EmployeeCompensation = apps.get_model("payroll", "EmployeeCompensation")
    User = apps.get_model("account", "CustomUser")
    weekly_roles = {"WAREHOUSE_STAFF", "KUPAS_STAFF"}

    user_roles = dict(
        User.objects.filter(
            pk__in=EmployeeCompensation.objects.values_list("user_id", flat=True)
        ).values_list("pk", "role")
    )
    for comp in EmployeeCompensation.objects.all():
        role = user_roles.get(comp.user_id, "")
        comp.pay_cadence = "WEEKLY" if role in weekly_roles else "MONTHLY"
        comp.save(update_fields=["pay_cadence"])

    PayrollPeriod = apps.get_model("payroll", "PayrollPeriod")
    PayrollPeriod.objects.all().update(cadence="WEEKLY")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0005_allow_multiple_kupas_records_per_day"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeecompensation",
            name="pay_cadence",
            field=models.CharField(
                choices=[("WEEKLY", "Weekly"), ("MONTHLY", "Monthly")],
                db_index=True,
                default="MONTHLY",
                help_text="Mingguan atau bulanan — independen dari pay_type.",
                max_length=16,
                verbose_name="pay cadence",
            ),
        ),
        migrations.AddField(
            model_name="payrollperiod",
            name="cadence",
            field=models.CharField(
                choices=[("WEEKLY", "Weekly"), ("MONTHLY", "Monthly")],
                db_index=True,
                default="WEEKLY",
                max_length=16,
                verbose_name="cadence",
            ),
        ),
        migrations.AlterField(
            model_name="employeecompensation",
            name="daily_rate_idr",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Gaji per hari hadir (untuk pay_type DAILY + cadence WEEKLY).",
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                verbose_name="daily rate (IDR)",
            ),
        ),
        migrations.AlterField(
            model_name="employeecompensation",
            name="monthly_base_salary_idr",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Gaji pokok bulanan (untuk pay_type DAILY + cadence MONTHLY).",
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                verbose_name="monthly base salary (IDR)",
            ),
        ),
        migrations.RunPython(backfill_cadence, noop_reverse),
        migrations.RemoveConstraint(
            model_name="payrollperiod",
            name="uniq_payroll_pay_date",
        ),
        migrations.AddConstraint(
            model_name="payrollperiod",
            constraint=models.UniqueConstraint(
                fields=("cadence", "pay_date"),
                name="uniq_payroll_cadence_pay_date",
            ),
        ),
    ]
