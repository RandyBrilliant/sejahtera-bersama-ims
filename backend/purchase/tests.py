from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from account.models import UserRole
from expenses.models import EntryKind, OperationalCashEntry, OperationalCategory
from inventory.models import Product, ProductPackaging
from purchase.models import Customer, OrderStatus, SalesOrder, SalesOrderLine

User = get_user_model()

HPP_URL = "/api/purchase/reports/hpp/"


class HppProfitReportViewTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", full_name="Owner", role=UserRole.LEADERSHIP)
        self.staff = User.objects.create_user("staff", full_name="Staff", role=UserRole.SALES_STAFF)
        self.client = APIClient()

        self.product = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Original",
            price_per_kg_idr=100000,
            avg_cost_per_kg_idr=Decimal("60000"),
        )
        self.pkg = ProductPackaging.objects.create(
            product=self.product, label="250g", net_mass_kg=Decimal("0.25")
        )
        self.customer = Customer.objects.create(name="Toko A", address="Jl. Test")

        verified_at = timezone.make_aware(datetime.combine(date(2026, 7, 10), time(12, 0)))
        order = SalesOrder.objects.create(
            order_code="SO-1",
            customer=self.customer,
            status=OrderStatus.VERIFIED,
            subtotal_idr=200000,
            total_idr=200000,
            verified_at=verified_at,
        )
        # 8 x 25000 = 200000 revenue; 8 x 0.25 = 2 kg; material COGS snapshot 120000.
        SalesOrderLine.objects.create(
            order=order,
            product_packaging=self.pkg,
            quantity=Decimal("8"),
            unit_price_idr=25000,
            cogs_material_idr=120000,
        )

        cat = OperationalCategory.objects.create(name="Listrik", entry_kind=EntryKind.EXPENSE)
        OperationalCashEntry.objects.create(
            direction=EntryKind.EXPENSE,
            category=cat,
            amount_idr=50000,
            occurred_on=date(2026, 7, 10),
            description="listrik",
        )

    def _get(self):
        return self.client.get(
            HPP_URL, {"start_date": "2026-07-01", "end_date": "2026-07-31"}
        )

    def test_owner_pl_totals(self):
        self.client.force_authenticate(self.owner)
        resp = self._get()
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["revenue_idr"], 200000)
        self.assertEqual(data["cogs"]["material_idr"], 120000)
        self.assertEqual(data["cogs"]["total_idr"], 120000)
        self.assertEqual(data["gross_profit_idr"], 80000)
        self.assertEqual(data["opex"]["expenses_idr"], 50000)
        self.assertEqual(data["opex"]["total_idr"], 50000)
        self.assertEqual(data["net_profit_idr"], 30000)
        self.assertEqual(data["hpp_per_kg_idr"], 60000)
        self.assertEqual(len(data["by_variant"]), 1)
        self.assertEqual(data["by_variant"][0]["cogs_material_idr"], 120000)

    def test_non_owner_forbidden(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self._get().status_code, 403)

    def test_requires_date_params(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(HPP_URL)
        self.assertEqual(resp.status_code, 400)

    def test_excludes_orders_outside_range(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(
            HPP_URL, {"start_date": "2026-08-01", "end_date": "2026-08-31"}
        )
        data = resp.json()["data"]
        self.assertEqual(data["revenue_idr"], 0)
        self.assertEqual(data["cogs"]["material_idr"], 0)
