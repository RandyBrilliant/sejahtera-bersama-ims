"""Hubungan User ↔ EmployeeProfile (kode karyawan di-generate di model EmployeeProfile.save)."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CustomUser, EmployeeProfile


@receiver(post_save, sender=CustomUser)
def ensure_employee_profile(sender, instance: CustomUser, created: bool, **kwargs) -> None:
    """Setiap pengguna baru mendapat satu EmployeeProfile; kode diisi otomatis."""
    if created:
        EmployeeProfile.objects.get_or_create(user=instance)
