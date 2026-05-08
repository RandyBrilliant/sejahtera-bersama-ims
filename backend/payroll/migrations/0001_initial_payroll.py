import decimal

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_compensation(apps, schema_editor) -> None:
    EmployeeProfile = apps.get_model("account", "EmployeeProfile")
    EmployeeCompensation = apps.get_model("payroll", "EmployeeCompensation")
    dec0 = decimal.Decimal("0")
    for row in EmployeeProfile.objects.all().only("user_id"):
        EmployeeCompensation.objects.get_or_create(
            user_id=row.user_id,
            defaults={"monthly_base_salary_idr": dec0},
        )


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("account", "0002_backfill_employee_profiles"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayrollPeriod",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("year", models.PositiveSmallIntegerField(verbose_name="year")),
                ("month", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(12)], verbose_name="month")),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("FINALIZED", "Final")], db_index=True, default="DRAFT", max_length=16)),
                ("finalized_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "finalized_by",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "payroll period",
                "verbose_name_plural": "payroll periods",
                "ordering": ["-year", "-month"],
            },
        ),
        migrations.CreateModel(
            name="EmployeeCompensation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("monthly_base_salary_idr", models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14, validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))], verbose_name="monthly base salary (IDR)")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payroll_compensation", to=settings.AUTH_USER_MODEL, verbose_name="employee")),
            ],
            options={
                "verbose_name": "employee compensation",
            },
        ),
        migrations.CreateModel(
            name="PayrollEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("base_salary_snapshot_idr", models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14, validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))], verbose_name="base salary snapshot (IDR)")),
                ("days_present", models.PositiveIntegerField(default=0, verbose_name="days present")),
                ("late_count", models.PositiveIntegerField(default=0, verbose_name="late count")),
                ("deductions_idr", models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14, validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))], verbose_name="deductions (IDR)")),
                ("net_pay_idr", models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14, validators=[django.core.validators.MinValueValidator(decimal.Decimal("0"))], verbose_name="net pay (IDR)")),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payroll_entries", to=settings.AUTH_USER_MODEL, verbose_name="employee")),
                ("period", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="entries", to="payroll.payrollperiod", verbose_name="period")),
            ],
            options={
                "verbose_name": "payroll entry",
                "verbose_name_plural": "payroll entries",
                "ordering": ["employee__full_name"],
            },
        ),
        migrations.AddConstraint(
            model_name="payrollperiod",
            constraint=models.UniqueConstraint(fields=("year", "month"), name="uniq_payroll_year_month"),
        ),
        migrations.AddConstraint(
            model_name="payrollentry",
            constraint=models.UniqueConstraint(fields=("period", "employee"), name="uniq_payroll_entry_period_employee"),
        ),
        migrations.RunPython(backfill_compensation, migrations.RunPython.noop),
    ]
