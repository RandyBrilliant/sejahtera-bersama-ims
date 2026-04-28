"""Buat EmployeeProfile + kode karyawan untuk pengguna yang sudah ada sebelum sinyal ditambahkan."""

from django.db import migrations


def backfill_profiles(apps, schema_editor):
    # Pakai model hidup agar EmployeeProfile.save() mengisi employee_code.
    from django.contrib.auth import get_user_model

    from account.models import EmployeeProfile

    User = get_user_model()
    for user in User.objects.iterator():
        EmployeeProfile.objects.get_or_create(user=user)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(backfill_profiles, noop_reverse),
    ]
