from datetime import date

from django.test import TestCase

from expenses.models import EntryKind, OperationalCashEntry, OperationalCategory, PaymentMethod
from expenses.reporting import current_saldo, opex_total_for_range


class OpexTotalForRangeTests(TestCase):
    def setUp(self):
        # slugs derived from names: bahan-baku-produksi, gaji-upah (both excluded).
        self.bahan = OperationalCategory.objects.create(
            name="Bahan baku & produksi", entry_kind=EntryKind.EXPENSE
        )
        self.gaji = OperationalCategory.objects.create(
            name="Gaji & upah", entry_kind=EntryKind.EXPENSE
        )
        self.listrik = OperationalCategory.objects.create(
            name="Listrik", entry_kind=EntryKind.EXPENSE
        )
        self.penjualan = OperationalCategory.objects.create(
            name="Penjualan", entry_kind=EntryKind.INCOME
        )

    def _entry(self, category, amount, direction=EntryKind.EXPENSE, on=date(2026, 7, 10)):
        return OperationalCashEntry.objects.create(
            direction=direction,
            category=category,
            amount_idr=amount,
            occurred_on=on,
            description="x",
        )

    def test_excludes_bahan_gaji_income_and_out_of_range(self):
        self._entry(self.listrik, 100000)
        self._entry(self.bahan, 500000)
        self._entry(self.gaji, 300000)
        self._entry(self.penjualan, 999, direction=EntryKind.INCOME)
        self._entry(self.listrik, 777, on=date(2026, 8, 1))  # outside range

        total = opex_total_for_range(date(2026, 7, 1), date(2026, 7, 31))
        self.assertEqual(total, 100000)

    def test_empty_range_returns_zero(self):
        self.assertEqual(opex_total_for_range(date(2026, 1, 1), date(2026, 1, 31)), 0)


class CurrentSaldoTests(TestCase):
    def setUp(self):
        self.income_cat = OperationalCategory.objects.create(
            name="Penjualan", entry_kind=EntryKind.INCOME
        )
        self.expense_cat = OperationalCategory.objects.create(
            name="Listrik", entry_kind=EntryKind.EXPENSE
        )

    def _entry(self, amount, direction, payment_method, on=date(2026, 7, 10)):
        category = self.income_cat if direction == EntryKind.INCOME else self.expense_cat
        return OperationalCashEntry.objects.create(
            direction=direction,
            payment_method=payment_method,
            category=category,
            amount_idr=amount,
            occurred_on=on,
            description="x",
        )

    def test_empty_ledger_is_zero(self):
        payload = current_saldo()
        self.assertEqual(payload["saldo_idr"], 0)
        self.assertEqual(payload["income_idr"], 0)
        self.assertEqual(payload["expense_idr"], 0)
        self.assertEqual(payload["line_count"], 0)
        methods = {row["payment_method"]: row for row in payload["by_payment_method"]}
        self.assertEqual(methods["CASH"]["saldo_idr"], 0)
        self.assertEqual(methods["TRANSFER"]["saldo_idr"], 0)

    def test_splits_saldo_by_payment_method(self):
        self._entry(500_000, EntryKind.INCOME, PaymentMethod.CASH)
        self._entry(200_000, EntryKind.EXPENSE, PaymentMethod.CASH)
        self._entry(1_000_000, EntryKind.INCOME, PaymentMethod.TRANSFER)
        self._entry(100_000, EntryKind.EXPENSE, PaymentMethod.TRANSFER)

        payload = current_saldo()
        self.assertEqual(payload["income_idr"], 1_500_000)
        self.assertEqual(payload["expense_idr"], 300_000)
        self.assertEqual(payload["saldo_idr"], 1_200_000)
        self.assertEqual(payload["line_count"], 4)
        methods = {row["payment_method"]: row for row in payload["by_payment_method"]}
        self.assertEqual(methods["CASH"]["saldo_idr"], 300_000)
        self.assertEqual(methods["TRANSFER"]["saldo_idr"], 900_000)


class OperationalCashSaldoViewTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        from account.models import UserRole

        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            "kas_admin", full_name="Admin Kas", role=UserRole.ADMIN, password="pass"
        )
        income_cat = OperationalCategory.objects.create(
            name="Penjualan", entry_kind=EntryKind.INCOME
        )
        OperationalCashEntry.objects.create(
            direction=EntryKind.INCOME,
            payment_method=PaymentMethod.CASH,
            category=income_cat,
            amount_idr=250000,
            occurred_on=date(2026, 7, 10),
            description="setor",
        )

    def test_returns_current_saldo(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/expenses/saldo/")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["saldo_idr"], 250000)
        self.assertEqual(data["income_idr"], 250000)
        self.assertEqual(data["line_count"], 1)


class OperationalCashEntryUppercaseTests(TestCase):
    def test_save_uppercases_description_and_reference(self):
        cat = OperationalCategory.objects.create(name="Listrik", entry_kind=EntryKind.EXPENSE)
        entry = OperationalCashEntry.objects.create(
            direction=EntryKind.EXPENSE,
            payment_method=PaymentMethod.CASH,
            category=cat,
            amount_idr=10000,
            occurred_on=date(2026, 8, 1),
            description="Bakar kayu",
            reference="inv-12",
        )
        self.assertEqual(entry.description, "BAKAR KAYU")
        self.assertEqual(entry.reference, "INV-12")


class OperationalCashEntrySearchTests(TestCase):
    """Phrase search must not treat 'bakar kayu' as two independent tokens."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        from account.models import UserRole

        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            "kas_search", full_name="Admin Kas", role=UserRole.ADMIN, password="pass"
        )
        self.client.force_authenticate(self.admin)
        self.cat_kayu = OperationalCategory.objects.create(
            name="Kayu", entry_kind=EntryKind.EXPENSE
        )
        self.cat_ops = OperationalCategory.objects.create(
            name="Operasional", entry_kind=EntryKind.EXPENSE
        )
        self.kayu = OperationalCashEntry.objects.create(
            direction=EntryKind.EXPENSE,
            payment_method=PaymentMethod.CASH,
            category=self.cat_ops,
            amount_idr=10000,
            occurred_on=date(2026, 8, 1),
            description="Bakar kayu",
        )
        self.mobil = OperationalCashEntry.objects.create(
            direction=EntryKind.EXPENSE,
            payment_method=PaymentMethod.CASH,
            category=self.cat_kayu,
            amount_idr=20000,
            occurred_on=date(2026, 8, 2),
            description="Bakar mobil",
        )
        self.kayu_long = OperationalCashEntry.objects.create(
            direction=EntryKind.EXPENSE,
            payment_method=PaymentMethod.CASH,
            category=self.cat_ops,
            amount_idr=15000,
            occurred_on=date(2026, 8, 3),
            description="Beli bakar kayu 10 ikat",
        )

    def test_phrase_does_not_match_bakar_mobil_via_other_fields(self):
        response = self.client.get(
            "/api/expenses/entries/",
            {"search": "bakar kayu", "page_size": 50},
        )
        self.assertEqual(response.status_code, 200)
        descriptions = {row["description"] for row in response.json()["results"]}
        self.assertEqual(descriptions, {"BAKAR KAYU", "BELI BAKAR KAYU 10 IKAT"})

    def test_category_phrase_does_not_match_sibling_name(self):
        OperationalCategory.objects.create(name="Bakar Kayu", entry_kind=EntryKind.EXPENSE)
        OperationalCategory.objects.create(name="Bakar Mobil", entry_kind=EntryKind.EXPENSE)
        response = self.client.get(
            "/api/expenses/categories/",
            {"search": "bakar kayu", "page_size": 50},
        )
        self.assertEqual(response.status_code, 200)
        names = {row["name"] for row in response.json()["results"]}
        self.assertIn("Bakar Kayu", names)
        self.assertNotIn("Bakar Mobil", names)
