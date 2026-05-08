# Generated migration for attendance settings, lateness fields, checkout

import datetime

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def seed_attendance_settings(apps, schema_editor) -> None:
    Settings = apps.get_model("attendance", "AttendanceSettings")
    Settings.objects.get_or_create(
        pk=1,
        defaults={
            "work_start_time": datetime.time(8, 0),
            "grace_minutes": 15,
        },
    )


def noop_reverse(apps, schema_editor) -> None:
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("attendance", "0001_initial_attendance_badge_and_checkin"),
    ]

    operations = [
        migrations.CreateModel(
            name="AttendanceSettings",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                (
                    "work_start_time",
                    models.TimeField(
                        default=datetime.time(8, 0),
                        help_text="Jam mulai efektif (zona Jakarta).",
                        verbose_name="work start time",
                    ),
                ),
                (
                    "grace_minutes",
                    models.PositiveSmallIntegerField(
                        default=15,
                        help_text="Menit setelah jam mulai tanpa dihitung terlambat.",
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="grace period (minutes)",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "attendance settings",
                "verbose_name_plural": "attendance settings",
            },
        ),
        migrations.AddField(
            model_name="attendancedailycheckin",
            name="checked_out_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="checked out at"),
        ),
        migrations.AddField(
            model_name="attendancedailycheckin",
            name="minutes_late",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Hanya untuk hari baru setelah cutoff toleransi.",
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
                verbose_name="minutes late",
            ),
        ),
        migrations.AddField(
            model_name="attendancedailycheckin",
            name="verified_out_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
                verbose_name="verified out by",
            ),
        ),
        migrations.AddField(
            model_name="attendancedailycheckin",
            name="is_late",
            field=models.BooleanField(db_index=True, default=False, verbose_name="is late"),
        ),
        migrations.RunPython(seed_attendance_settings, noop_reverse),
    ]
