"""Integration tests for purchase/sales cancel locking and verify flows."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from account.models import UserRole
from inventory.models import (
    Ingredient,
    Product,
    ProductPackaging,
    StockUnit,
)
from purchase.models import (
    Customer,
    OrderStatus,
    PurchaseInLine,
    PurchaseInOrder,
    SalesOrder,
    SalesOrderLine,
)

User = get_user_model()


class PurchaseCancelVerifyLockTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            "owner", full_name="Owner", role=UserRole.LEADERSHIP, password="pass"
        )
        self.warehouse = User.objects.create_user(
            "wh", full_name="WH", role=UserRole.WAREHOUSE_STAFF, password="pass"
        )
        self.client = APIClient()

        ingredient = Ingredient.objects.create(name="Bawang", default_unit=StockUnit.KILOGRAM)
        self.inv = ingredient.inventory
        self.inv.remaining_stock = Decimal("10")
        self.inv.minimum_stock = Decimal("1")
        self.inv.avg_cost_idr = Decimal("10000")
        self.inv.save()
        self.order = PurchaseInOrder.objects.create(
            order_code="PO-TEST-1",
            status=OrderStatus.PAYMENT_PROOF_UPLOADED,
            subtotal_idr=50000,
            total_idr=50000,
            payment_proof=SimpleUploadedFile("proof.jpg", b"fake", content_type="image/jpeg"),
        )
        PurchaseInLine.objects.create(
            order=self.order,
            ingredient_inventory=self.inv,
            quantity=Decimal("5"),
            unit_cost_idr=12000,
        )

    def test_owner_verify_increases_stock_and_avg_cost(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(f"/api/purchase/purchase-in-orders/{self.order.pk}/verify/")
        self.assertEqual(resp.status_code, 200)
        self.inv.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.VERIFIED)
        self.assertEqual(self.inv.remaining_stock, Decimal("15"))
        # (10*10000 + 5*12000) / 15 = 10666.666… → stored with 2 dp
        self.assertEqual(self.inv.avg_cost_idr, Decimal("10666.67"))

    def test_warehouse_cannot_verify(self):
        self.client.force_authenticate(self.warehouse)
        resp = self.client.post(f"/api/purchase/purchase-in-orders/{self.order.pk}/verify/")
        self.assertEqual(resp.status_code, 403)

    def test_cancel_blocked_when_verified(self):
        self.client.force_authenticate(self.owner)
        self.client.post(f"/api/purchase/purchase-in-orders/{self.order.pk}/verify/")
        resp = self.client.post(f"/api/purchase/purchase-in-orders/{self.order.pk}/cancel/")
        self.assertEqual(resp.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.VERIFIED)

    def test_cancel_then_verify_rejected(self):
        self.client.force_authenticate(self.warehouse)
        cancel = self.client.post(f"/api/purchase/purchase-in-orders/{self.order.pk}/cancel/")
        self.assertEqual(cancel.status_code, 200)
        self.client.force_authenticate(self.owner)
        verify = self.client.post(f"/api/purchase/purchase-in-orders/{self.order.pk}/verify/")
        self.assertEqual(verify.status_code, 400)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.remaining_stock, Decimal("10"))


class SalesCancelVerifyTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            "owner2", full_name="Owner", role=UserRole.LEADERSHIP, password="pass"
        )
        self.admin = User.objects.create_user(
            "admin2", full_name="Admin", role=UserRole.ADMIN, password="pass"
        )
        self.sales = User.objects.create_user(
            "sales2", full_name="Sales", role=UserRole.SALES_STAFF, password="pass"
        )
        self.client = APIClient()

        self.product = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Original",
            price_per_kg_idr=100000,
            remaining_mass_grams=Decimal("5000"),
            avg_cost_per_kg_idr=Decimal("60000"),
        )
        self.pkg = ProductPackaging.objects.create(
            product=self.product, label="250g", net_mass_kg=Decimal("0.25")
        )
        self.customer = Customer.objects.create(name="Toko B", address="Jl. B")
        self.order = SalesOrder.objects.create(
            order_code="SO-TEST-1",
            customer=self.customer,
            status=OrderStatus.PAYMENT_PROOF_UPLOADED,
            subtotal_idr=50000,
            total_idr=50000,
            payment_proof=SimpleUploadedFile("proof.jpg", b"fake", content_type="image/jpeg"),
        )
        SalesOrderLine.objects.create(
            order=self.order,
            product_packaging=self.pkg,
            quantity=Decimal("4"),
            unit_price_idr=12500,
        )

    def test_verify_deducts_mass_and_sets_cogs(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(f"/api/purchase/sales-orders/{self.order.pk}/verify/")
        self.assertEqual(resp.status_code, 200)
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        # 4 * 0.25 kg * 1000 = 1000 g
        self.assertEqual(self.product.remaining_mass_grams, Decimal("4000"))
        line = self.order.lines.get()
        self.assertEqual(line.cogs_material_idr, 60000)

    def test_sales_staff_cannot_cancel(self):
        self.client.force_authenticate(self.sales)
        resp = self.client.post(f"/api/purchase/sales-orders/{self.order.pk}/cancel/")
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_cancel_unverified(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f"/api/purchase/sales-orders/{self.order.pk}/cancel/")
        self.assertEqual(resp.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.CANCELLED)
