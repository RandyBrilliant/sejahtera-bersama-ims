from __future__ import annotations

import calendar
from datetime import date, timedelta

from django.db import migrations, models


def _last_saturday_of_month(year: int, month: int) -> date:
    last_day = calendar.monthrange(year, month)[1]
    d = date(year, month, last_day)
    while d.weekday() != 5:
        d -= timedelta(days=1)
    return d


def forwards_populate_weekly_dates(apps, schema_editor) -> None:
    PayrollPeriod = apps.get_model("payroll", "PayrollPeriod")
    for period in PayrollPeriod.objects.all():
        if period.pay_date:
            continue
        pay = _last_saturday_of_month(int(period.year), int(period.month))
        period.pay_date = pay
        period.period_end_date = pay
        period.period_start_date = pay - timedelta(days=5)
        period.save(update_fields=["pay_date", "period_start_date", "period_end_date"])


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0002_alter_employeecompensation_id_alter_payrollentry_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollperiod",
            name="pay_date",
            field=models.DateField(db_index=True, null=True, verbose_name="pay date (Saturday)"),
        ),
        migrations.AddField(
            model_name="payrollperiod",
            name="period_end_date",
            field=models.DateField(null=True, verbose_name="period end (Saturday)"),
        ),
        migrations.AddField(
            model_name="payrollperiod",
            name="period_start_date",
            field=models.DateField(null=True, verbose_name="period start (Monday)"),
        ),
        migrations.RunPython(forwards_populate_weekly_dates, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="payrollperiod",
            name="uniq_payroll_year_month",
        ),
        migrations.RemoveField(
            model_name="payrollperiod",
            name="month",
        ),
        migrations.RemoveField(
            model_name="payrollperiod",
            name="year",
        ),
        migrations.AlterField(
            model_name="payrollperiod",
            name="pay_date",
            field=models.DateField(db_index=True, verbose_name="pay date (Saturday)"),
        ),
        migrations.AlterField(
            model_name="payrollperiod",
            name="period_end_date",
            field=models.DateField(verbose_name="period end (Saturday)"),
        ),
        migrations.AlterField(
            model_name="payrollperiod",
            name="period_start_date",
            field=models.DateField(verbose_name="period start (Monday)"),
        ),
        migrations.AddConstraint(
            model_name="payrollperiod",
            constraint=models.UniqueConstraint(fields=("pay_date",), name="uniq_payroll_pay_date"),
        ),
    ]
