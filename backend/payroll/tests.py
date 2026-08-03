from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from account.models import UserRole
from attendance.models import AttendanceDailyCheckIn, AttendanceSettings
from inventory.models import ProductionBatch
from payroll.costing import production_labor_for_range
from payroll.models import (
    EmployeeCompensation,
    KupasItem,
    KupasProductionRecord,
    PayCadence,
    PayrollEntry,
    PayrollPeriod,
    PayType,
)
from payroll.period_week import default_bounds_for_pay_date, week_bounds_for_pay_saturday
from payroll.services import generate_payroll_entries, finalize_payroll_period, unfinalize_payroll_period
from payroll.services import PayrollWorkflowError

User = get_user_model()


class ProductionLaborForRangeTests(TestCase):
    def setUp(self):
        AttendanceSettings.objects.get_or_create(pk=1, defaults={})
        self.admin = User.objects.create_user("admin1", full_name="Admin", role=UserRole.ADMIN)
        self.wh = User.objects.create_user("wh1", full_name="WH", role=UserRole.WAREHOUSE_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=self.wh,
            defaults={
                "pay_type": PayType.DAILY,
                "pay_cadence": PayCadence.WEEKLY,
                "daily_rate_idr": Decimal("100000"),
            },
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
            defaults={
                "pay_type": PayType.DAILY,
                "pay_cadence": PayCadence.MONTHLY,
                "daily_rate_idr": Decimal("999999"),
            },
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


class PayCadencePeriodTests(TestCase):
    def setUp(self):
        AttendanceSettings.objects.get_or_create(
            pk=1, defaults={"late_fine_idr": Decimal("10000")}
        )
        self.admin = User.objects.create_user("cad_admin", full_name="Admin", role=UserRole.ADMIN)

    def _full_day(self, employee, d, *, is_late=False):
        tz = timezone.get_current_timezone()
        return AttendanceDailyCheckIn.objects.create(
            employee=employee,
            work_date=d,
            checked_in_at=timezone.make_aware(datetime.combine(d, time(8, 0)), tz),
            checked_out_at=timezone.make_aware(datetime.combine(d, time(17, 0)), tz),
            verified_by=self.admin,
            is_late=is_late,
        )

    def test_weekly_bounds_are_sunday_to_saturday(self):
        pay = date(2026, 8, 8)  # Saturday
        start, end = week_bounds_for_pay_saturday(pay)
        self.assertEqual(start, date(2026, 8, 2))  # Sunday
        self.assertEqual(end, pay)

    def test_monthly_bounds_calendar_month(self):
        start, end = default_bounds_for_pay_date(
            date(2026, 8, 31), cadence=PayCadence.MONTHLY
        )
        self.assertEqual(start, date(2026, 8, 1))
        self.assertEqual(end, date(2026, 8, 31))

    def test_weekly_daily_includes_sunday_as_extra_day(self):
        wh = User.objects.create_user("wh_sun", full_name="WH Sun", role=UserRole.WAREHOUSE_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=wh,
            defaults={
                "pay_type": PayType.DAILY,
                "pay_cadence": PayCadence.WEEKLY,
                "daily_rate_idr": Decimal("100000"),
            },
        )
        # Sun Aug 2 + Mon Aug 3 in week ending Sat Aug 8
        self._full_day(wh, date(2026, 8, 2))
        self._full_day(wh, date(2026, 8, 3))

        period = PayrollPeriod.objects.create(
            cadence=PayCadence.WEEKLY,
            pay_date=date(2026, 8, 8),
            period_start_date=date(2026, 8, 2),
            period_end_date=date(2026, 8, 8),
        )
        n = generate_payroll_entries(period)
        self.assertEqual(n, 1)
        entry = PayrollEntry.objects.get(period=period, employee=wh)
        self.assertEqual(entry.days_present, 2)
        self.assertEqual(entry.gross_idr, Decimal("200000.00"))

    def test_monthly_kupas_sums_kg(self):
        kupas = User.objects.create_user("kupas_m", full_name="Kupas M", role=UserRole.KUPAS_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=kupas,
            defaults={
                "pay_type": PayType.PIECE_RATE,
                "pay_cadence": PayCadence.MONTHLY,
            },
        )
        item = KupasItem.objects.create(name="Cabe", rate_per_kg_idr=Decimal("3000"))
        KupasProductionRecord.objects.create(
            employee=kupas, work_date=date(2026, 8, 5), kupas_item=item, kg=Decimal("10")
        )
        KupasProductionRecord.objects.create(
            employee=kupas, work_date=date(2026, 8, 12), kupas_item=item, kg=Decimal("5")
        )
        # Sunday work also counts
        KupasProductionRecord.objects.create(
            employee=kupas, work_date=date(2026, 8, 9), kupas_item=item, kg=Decimal("2")
        )

        period = PayrollPeriod.objects.create(
            cadence=PayCadence.MONTHLY,
            pay_date=date(2026, 8, 31),
            period_start_date=date(2026, 8, 1),
            period_end_date=date(2026, 8, 31),
        )
        generate_payroll_entries(period)
        entry = PayrollEntry.objects.get(period=period, employee=kupas)
        self.assertEqual(entry.total_kg, Decimal("17.000"))
        self.assertEqual(entry.gross_idr, Decimal("51000.00"))

    def test_monthly_fixed_salary_when_pokok_set(self):
        sales = User.objects.create_user("sales_m", full_name="Sales", role=UserRole.SALES_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=sales,
            defaults={
                "pay_type": PayType.DAILY,
                "pay_cadence": PayCadence.MONTHLY,
                "daily_rate_idr": Decimal("100000"),
                "monthly_base_salary_idr": Decimal("5000000"),
            },
        )
        self._full_day(sales, date(2026, 8, 3))

        weekly = PayrollPeriod.objects.create(
            cadence=PayCadence.WEEKLY,
            pay_date=date(2026, 8, 8),
            period_start_date=date(2026, 8, 2),
            period_end_date=date(2026, 8, 8),
        )
        generate_payroll_entries(weekly)
        self.assertFalse(PayrollEntry.objects.filter(period=weekly, employee=sales).exists())

        monthly = PayrollPeriod.objects.create(
            cadence=PayCadence.MONTHLY,
            pay_date=date(2026, 8, 31),
            period_start_date=date(2026, 8, 1),
            period_end_date=date(2026, 8, 31),
        )
        generate_payroll_entries(monthly)
        entry = PayrollEntry.objects.get(period=monthly, employee=sales)
        self.assertEqual(entry.gross_idr, Decimal("5000000.00"))
        self.assertEqual(entry.daily_rate_snapshot_idr, Decimal("0"))
        self.assertEqual(entry.days_present, 1)

    def test_monthly_uses_daily_rate_when_pokok_empty(self):
        sales = User.objects.create_user("sales_d", full_name="Sales D", role=UserRole.SALES_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=sales,
            defaults={
                "pay_type": PayType.DAILY,
                "pay_cadence": PayCadence.MONTHLY,
                "daily_rate_idr": Decimal("150000"),
                "monthly_base_salary_idr": Decimal("0"),
            },
        )
        self._full_day(sales, date(2026, 8, 3))
        self._full_day(sales, date(2026, 8, 4))

        monthly = PayrollPeriod.objects.create(
            cadence=PayCadence.MONTHLY,
            pay_date=date(2026, 8, 31),
            period_start_date=date(2026, 8, 1),
            period_end_date=date(2026, 8, 31),
        )
        generate_payroll_entries(monthly)
        entry = PayrollEntry.objects.get(period=monthly, employee=sales)
        self.assertEqual(entry.days_present, 2)
        self.assertEqual(entry.gross_idr, Decimal("300000.00"))
        self.assertEqual(entry.daily_rate_snapshot_idr, Decimal("150000"))

    def test_unique_constraint_allows_same_pay_date_different_cadence(self):
        pay = date(2026, 8, 29)
        PayrollPeriod.objects.create(
            cadence=PayCadence.WEEKLY,
            pay_date=pay,
            period_start_date=date(2026, 8, 23),
            period_end_date=pay,
        )
        PayrollPeriod.objects.create(
            cadence=PayCadence.MONTHLY,
            pay_date=pay,
            period_start_date=date(2026, 8, 1),
            period_end_date=date(2026, 8, 31),
        )
        self.assertEqual(PayrollPeriod.objects.filter(pay_date=pay).count(), 2)

    def test_unfinalize_returns_to_draft_and_clears_paid_links(self):
        wh = User.objects.create_user("wh_unf", full_name="WH Unf", role=UserRole.WAREHOUSE_STAFF)
        EmployeeCompensation.objects.update_or_create(
            user=wh,
            defaults={
                "pay_type": PayType.DAILY,
                "pay_cadence": PayCadence.WEEKLY,
                "daily_rate_idr": Decimal("100000"),
            },
        )
        self._full_day(wh, date(2026, 8, 3))
        period = PayrollPeriod.objects.create(
            cadence=PayCadence.WEEKLY,
            pay_date=date(2026, 8, 8),
            period_start_date=date(2026, 8, 2),
            period_end_date=date(2026, 8, 8),
        )
        generate_payroll_entries(period)
        finalize_payroll_period(period, self.admin.pk)
        period.refresh_from_db()
        self.assertEqual(period.status, PayrollPeriod.Status.FINALIZED)
        self.assertTrue(
            AttendanceDailyCheckIn.objects.filter(employee=wh, paid_in_period=period).exists()
        )

        unfinalize_payroll_period(period)
        period.refresh_from_db()
        self.assertEqual(period.status, PayrollPeriod.Status.DRAFT)
        self.assertIsNone(period.finalized_at)
        self.assertFalse(
            AttendanceDailyCheckIn.objects.filter(employee=wh, paid_in_period=period).exists()
        )

    def test_unfinalize_blocked_when_later_period_locked(self):
        older = PayrollPeriod.objects.create(
            cadence=PayCadence.WEEKLY,
            pay_date=date(2026, 8, 1),
            period_start_date=date(2026, 7, 26),
            period_end_date=date(2026, 8, 1),
            status=PayrollPeriod.Status.FINALIZED,
            finalized_at=timezone.now(),
        )
        PayrollPeriod.objects.create(
            cadence=PayCadence.WEEKLY,
            pay_date=date(2026, 8, 8),
            period_start_date=date(2026, 8, 2),
            period_end_date=date(2026, 8, 8),
            status=PayrollPeriod.Status.FINALIZED,
            finalized_at=timezone.now(),
        )
        with self.assertRaises(PayrollWorkflowError):
            unfinalize_payroll_period(older)
