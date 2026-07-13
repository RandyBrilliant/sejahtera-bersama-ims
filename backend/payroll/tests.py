from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from account.models import UserRole
from attendance.models import AttendanceDailyCheckIn, AttendanceSettings
from inventory.models import ProductionBatch
from payroll.costing import production_labor_for_range
from payroll.models import EmployeeCompensation, KupasItem, KupasProductionRecord, PayType

User = get_user_model()


class ProductionLaborForRangeTests(TestCase):
    def setUp(self):
        AttendanceSettings.objects.get_or_create(pk=1, defaults={})
        self.admin = User.objects.create_user("admin1", full_name="Admin", role=UserRole.ADMIN)
        self.wh = User.objects.create_user("wh1", full_name="WH", role=UserRole.WAREHOUSE_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=self.wh,
            defaults={"pay_type": PayType.DAILY, "daily_rate_idr": Decimal("100000")},
        )

        self.prod_date = date(2026, 7, 1)
        self.non_prod_date = date(2026, 7, 2)
        ProductionBatch.objects.create(production_date=self.prod_date)

        self._full_day(self.prod_date)
        self._full_day(self.non_prod_date)

        kupas_user = User.objects.create_user("k1", full_name="K", role=UserRole.WAREHOUSE_STAFF)
        item = KupasItem.objects.create(name="Bawang", rate_per_kg_idr=Decimal("2000"))
        KupasProductionRecord.objects.create(
            employee=kupas_user, work_date=self.prod_date, kupas_item=item, kg=Decimal("10")
        )

    def _full_day(self, d):
        tz = timezone.get_current_timezone()
        AttendanceDailyCheckIn.objects.create(
            employee=self.wh,
            work_date=d,
            checked_in_at=timezone.make_aware(datetime.combine(d, time(8, 0)), tz),
            checked_out_at=timezone.make_aware(datetime.combine(d, time(17, 0)), tz),
            verified_by=self.admin,
            is_late=False,
        )

    def test_splits_labor_by_production_date(self):
        res = production_labor_for_range(date(2026, 7, 1), date(2026, 7, 31))
        self.assertEqual(res["kupas_idr"], Decimal("20000.00"))
        self.assertEqual(res["daily_production_idr"], Decimal("100000.00"))
        self.assertEqual(res["daily_nonproduction_idr"], Decimal("100000.00"))

    def test_ignores_non_warehouse_daily_wages(self):
        sales = User.objects.create_user("s1", full_name="S", role=UserRole.SALES_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=sales,
            defaults={"pay_type": PayType.DAILY, "daily_rate_idr": Decimal("999999")},
        )
        tz = timezone.get_current_timezone()
        AttendanceDailyCheckIn.objects.create(
            employee=sales,
            work_date=self.prod_date,
            checked_in_at=timezone.make_aware(datetime.combine(self.prod_date, time(8, 0)), tz),
            checked_out_at=timezone.make_aware(datetime.combine(self.prod_date, time(17, 0)), tz),
            verified_by=self.admin,
            is_late=False,
        )
        res = production_labor_for_range(date(2026, 7, 1), date(2026, 7, 31))
        self.assertEqual(res["daily_production_idr"], Decimal("100000.00"))
