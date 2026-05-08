from decimal import Decimal

from django.db.models.signals import post_save

from payroll.models import EmployeeCompensation


def ensure_payroll_compensation(sender, instance, created: bool, **kwargs) -> None:
    EmployeeCompensation.objects.get_or_create(
        user_id=instance.user_id,
        defaults={"monthly_base_salary_idr": Decimal("0")},
    )


def register_payroll_signals() -> None:
    from account.models import EmployeeProfile

    post_save.connect(
        ensure_payroll_compensation,
        sender=EmployeeProfile,
        weak=False,
        dispatch_uid="payroll.ensure_compensation_profile",
    )
