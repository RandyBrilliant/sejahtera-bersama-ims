from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("account", "0002_backfill_employee_profiles"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeprofile",
            name="resigned_date",
            field=models.DateField(blank=True, null=True, verbose_name="resigned date"),
        ),
    ]
