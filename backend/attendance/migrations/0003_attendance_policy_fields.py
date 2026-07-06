from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0002_attendance_settings_lateness_and_checkout"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancesettings",
            name="late_fine_idr",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("20000"),
                help_text="Potongan per hari terlambat.",
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                verbose_name="late fine (IDR)",
            ),
        ),
        migrations.AddField(
            model_name="attendancesettings",
            name="minimum_hours_before_checkout",
            field=models.PositiveSmallIntegerField(
                default=1,
                help_text="Jam minimal antara absen masuk dan absen pulang (cegah double tap).",
                validators=[django.core.validators.MinValueValidator(1)],
                verbose_name="minimum hours before checkout",
            ),
        ),
        migrations.AddField(
            model_name="attendancesettings",
            name="minimum_work_hours_full_day",
            field=models.PositiveSmallIntegerField(
                default=6,
                help_text="Jam kerja minimum agar gaji harian dihitung penuh.",
                validators=[django.core.validators.MinValueValidator(1)],
                verbose_name="minimum work hours for full day pay",
            ),
        ),
    ]
