from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from account.models import UserRole
from attendance.models import AttendanceDailyCheckIn, StaffAttendanceBadge

User = get_user_model()

PREVIEW_URL = "/api/attendance/admin/check-ins/preview/"
CONFIRM_URL = "/api/attendance/admin/check-ins/confirm/"


class StaffScannerTests(TestCase):
    """Semua staf aplikasi boleh memindai; pemindai tercatat sebagai verifikator."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("adm", full_name="Admin", role=UserRole.ADMIN)
        self.warehouse = User.objects.create_user("gud", full_name="Gudang", role=UserRole.WAREHOUSE_STAFF)
        self.sales = User.objects.create_user("sal", full_name="Sales", role=UserRole.SALES_STAFF)
        self.kupas = User.objects.create_user("kup", full_name="Kupas", role=UserRole.KUPAS_STAFF)
        self.badges = {
            u.pk: StaffAttendanceBadge.objects.get_or_create(user=u)[0]
            for u in (self.admin, self.warehouse, self.sales, self.kupas)
        }

    def _raw(self, user) -> str:
        return str(self.badges[user.pk].id)

    def test_staff_can_preview_and_check_in_colleague_and_is_recorded(self):
        self.client.force_authenticate(self.warehouse)

        res = self.client.post(PREVIEW_URL, {"raw": self._raw(self.sales)}, format="json")
        self.assertEqual(res.status_code, 200, res.content)

        res = self.client.post(
            CONFIRM_URL, {"raw": self._raw(self.sales), "intent": "check_in"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)
        row = AttendanceDailyCheckIn.objects.get(employee=self.sales)
        self.assertEqual(row.verified_by_id, self.warehouse.pk)

    def test_staff_cannot_scan_own_badge(self):
        self.client.force_authenticate(self.sales)

        res = self.client.post(PREVIEW_URL, {"raw": self._raw(self.sales)}, format="json")
        self.assertEqual(res.status_code, 403)

        res = self.client.post(
            CONFIRM_URL, {"raw": self._raw(self.sales), "intent": "check_in"}, format="json"
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(AttendanceDailyCheckIn.objects.filter(employee=self.sales).exists())

    def test_admin_may_still_scan_own_badge(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            CONFIRM_URL, {"raw": self._raw(self.admin), "intent": "check_in"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)

    def test_kupas_staff_cannot_scan(self):
        self.client.force_authenticate(self.kupas)
        res = self.client.post(PREVIEW_URL, {"raw": self._raw(self.sales)}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_staff_still_cannot_manage_badges(self):
        self.client.force_authenticate(self.warehouse)
        res = self.client.get(f"/api/attendance/admin/badges/{self.sales.pk}/")
        self.assertEqual(res.status_code, 403)

    def test_my_rows_include_who_scanned(self):
        self.client.force_authenticate(self.warehouse)
        self.client.post(
            CONFIRM_URL, {"raw": self._raw(self.sales), "intent": "check_in"}, format="json"
        )
        self.client.force_authenticate(self.sales)
        res = self.client.get("/api/attendance/me/rows/")
        self.assertEqual(res.status_code, 200, res.content)
        row = res.json()["data"]["results"][0]
        self.assertEqual(row["verified_in_by"], "Gudang")
        self.assertIsNone(row["verified_out_by"])
