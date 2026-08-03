# Generated manually for payroll entry paid_out tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0006_pay_cadence"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollentry",
            name="paid_out",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Centang saat uang gaji sudah diserahkan ke pegawai.",
                verbose_name="paid out",
            ),
        ),
        migrations.AddField(
            model_name="payrollentry",
            name="paid_out_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="paid out at"),
        ),
    ]
