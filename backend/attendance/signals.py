from django.db.models.signals import post_save
from django.dispatch import receiver

from account.models import EmployeeProfile

from .models import StaffAttendanceBadge


@receiver(post_save, sender=EmployeeProfile)
def ensure_attendance_badge(sender, instance: EmployeeProfile, created: bool, **kwargs) -> None:
    """Setiap EmployeeProfile dapat satu badge untuk QR kartu."""

    StaffAttendanceBadge.objects.get_or_create(user_id=instance.user_id)
