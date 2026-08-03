from decimal import Decimal

from django.db.models.signals import post_save

from payroll.models import EmployeeCompensation, PayCadence
from payroll.period_week import default_cadence_for_role


def ensure_payroll_compensation(sender, instance, created: bool, **kwargs) -> None:
    user = getattr(instance, "user", None)
    role = getattr(user, "role", None) if user is not None else None
    cadence = default_cadence_for_role(role) if role else PayCadence.MONTHLY
    EmployeeCompensation.objects.get_or_create(
        user_id=instance.user_id,
        defaults={
            "monthly_base_salary_idr": Decimal("0"),
            "pay_cadence": cadence,
        },
    )


def register_payroll_signals() -> None:
    from account.models import EmployeeProfile

    post_save.connect(
        ensure_payroll_compensation,
        sender=EmployeeProfile,
        weak=False,
        dispatch_uid="payroll.ensure_compensation_profile",
    )
