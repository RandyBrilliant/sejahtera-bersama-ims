from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory

from account.filters import PhraseSearchFilter
from account.models import UserRole

User = get_user_model()

RESET_URL = "/api/account/auth/change-password-user/"


class AdminResetUserPasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            "pimpinan1", full_name="Pimpinan", role=UserRole.LEADERSHIP, password="OwnerPass1!"
        )
        self.admin = User.objects.create_user(
            "admin1", full_name="Admin", role=UserRole.ADMIN, password="AdminPass1!"
        )
        self.staff = User.objects.create_user(
            "gudang1", full_name="Staf Gudang", role=UserRole.WAREHOUSE_STAFF, password="StaffPass1!"
        )
        self.sales = User.objects.create_user(
            "sales1", full_name="Staf Sales", role=UserRole.SALES_STAFF, password="SalesPass1!"
        )

    def test_admin_can_set_chosen_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            RESET_URL,
            {"user_id": self.staff.id, "new_password": "BaruSekali99!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password("BaruSekali99!"))

    def test_pimpinan_can_set_chosen_password(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            RESET_URL,
            {"user_id": self.staff.id, "new_password": "PimpinanSet88!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password("PimpinanSet88!"))

    def test_staff_cannot_reset_password(self):
        self.client.force_authenticate(self.sales)
        response = self.client.post(
            RESET_URL,
            {"user_id": self.staff.id, "new_password": "TidakBoleh77!"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password("StaffPass1!"))

    def test_admin_cannot_reset_pimpinan_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            RESET_URL,
            {"user_id": self.owner.id, "new_password": "TidakBoleh77!"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.check_password("OwnerPass1!"))

    def test_rejects_password_equal_to_username(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            RESET_URL,
            {"user_id": self.staff.id, "new_password": self.staff.username},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password("StaffPass1!"))


class PhraseSearchFilterTests(TestCase):
    def test_keeps_multi_word_query_as_one_term(self):
        wsgi = APIRequestFactory().get("/", {"search": "bakar kayu"})
        terms = PhraseSearchFilter().get_search_terms(Request(wsgi))
        self.assertEqual(terms, ["bakar kayu"])

    def test_blank_search_is_empty(self):
        wsgi = APIRequestFactory().get("/", {"search": "   "})
        terms = PhraseSearchFilter().get_search_terms(Request(wsgi))
        self.assertEqual(terms, [])
