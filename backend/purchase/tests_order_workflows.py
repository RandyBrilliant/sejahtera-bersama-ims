"""Integration tests for purchase/sales cancel locking and verify flows."""

from datetime import date
from decimal import Decimal
from io import BytesIO

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
        self.warehouse = User.objects.create_user(
            "wh2", full_name="WH", role=UserRole.WAREHOUSE_STAFF, password="pass"
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
            product=self.product,
            label="250g",
            net_mass_kg=Decimal("0.25"),
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
            packaging_type="KTK",
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

    def test_verify_takes_tepung_share_from_split_product(self):
        self.product.tracks_tepung = True
        self.product.tepung_mass_grams = Decimal("1000")
        self.product.save(update_fields=["tracks_tepung", "tepung_mass_grams"])
        self.client.force_authenticate(self.owner)
        resp = self.client.post(f"/api/purchase/sales-orders/{self.order.pk}/verify/")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.product.refresh_from_db()
        # 1000 g sold from 5000 g stock that is 20% tepung -> 200 g tepung out.
        self.assertEqual(self.product.remaining_mass_grams, Decimal("4000"))
        self.assertEqual(self.product.tepung_mass_grams, Decimal("800"))
        movement = self.product.stock_movements.get()
        self.assertEqual(movement.tepung_mass_grams, Decimal("200"))

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

    def test_warehouse_can_read_packing_fields_but_not_write(self):
        self.client.force_authenticate(self.warehouse)
        detail = self.client.get(f"/api/purchase/sales-orders/{self.order.pk}/")
        self.assertEqual(detail.status_code, 200)
        line = detail.data["lines"][0]
        self.assertEqual(line["product_name"], "Bawang Goreng")
        self.assertEqual(line["product_variant_name"], "Original")
        self.assertEqual(line["packaging_label"], "250g")
        self.assertEqual(line["packaging_type"], "KTK")
        self.assertEqual(Decimal(str(line["net_mass_kg"])), Decimal("0.25"))
        self.assertEqual(Decimal(str(line["quantity"])), Decimal("4"))

        listing = self.client.get("/api/purchase/sales-orders/")
        self.assertEqual(listing.status_code, 200)

        create = self.client.post(
            "/api/purchase/sales-orders/",
            {
                "customer": self.customer.pk,
                "lines": [{"product_packaging": self.pkg.pk, "quantity": "1"}],
            },
            format="json",
        )
        self.assertEqual(create.status_code, 403)


class SalesLinePackagingTypeTests(TestCase):
    """Jenis kemasan (Bal / Kotak) is chosen per sales line, not on the kemasan master."""

    def setUp(self):
        self.owner = User.objects.create_user(
            "owner3", full_name="Owner", role=UserRole.LEADERSHIP, password="pass"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.product = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Original",
            price_per_kg_idr=100000,
            remaining_mass_grams=Decimal("5000"),
        )
        self.pkg = ProductPackaging.objects.create(
            product=self.product, label="1/2 KG", net_mass_kg=Decimal("0.5")
        )
        self.customer = Customer.objects.create(name="Toko C", address="Jl. C")

    def _create(self, lines):
        return self.client.post(
            "/api/purchase/sales-orders/",
            {"customer": self.customer.pk, "lines": lines},
            format="json",
        )

    def test_defaults_to_bal(self):
        resp = self._create([{"product_packaging": self.pkg.pk, "quantity": "2"}])
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.data["lines"][0]["packaging_type"], "BAL")

    def test_same_kemasan_with_both_types_is_allowed(self):
        resp = self._create(
            [
                {"product_packaging": self.pkg.pk, "packaging_type": "BAL", "quantity": "2"},
                {"product_packaging": self.pkg.pk, "packaging_type": "KTK", "quantity": "3"},
            ]
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        types = sorted(line["packaging_type"] for line in resp.data["lines"])
        self.assertEqual(types, ["BAL", "KTK"])

    def test_same_kemasan_and_type_is_rejected(self):
        resp = self._create(
            [
                {"product_packaging": self.pkg.pk, "packaging_type": "KTK", "quantity": "2"},
                {"product_packaging": self.pkg.pk, "packaging_type": "KTK", "quantity": "3"},
            ]
        )
        self.assertEqual(resp.status_code, 400)

    def test_invalid_type_is_rejected(self):
        resp = self._create(
            [{"product_packaging": self.pkg.pk, "packaging_type": "XYZ", "quantity": "2"}]
        )
        self.assertEqual(resp.status_code, 400)

    def test_update_changes_line_type(self):
        created = self._create([{"product_packaging": self.pkg.pk, "quantity": "2"}])
        resp = self.client.patch(
            f"/api/purchase/sales-orders/{created.data['id']}/",
            {"lines": [{"product_packaging": self.pkg.pk, "packaging_type": "KTK", "quantity": "2"}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["lines"][0]["packaging_type"], "KTK")

    def test_receipt_uses_line_type(self):
        from purchase.receipt_pdf import _line_qty_display

        order = SalesOrder.objects.create(order_code="SO-TEST-PT", customer=self.customer)
        line = SalesOrderLine.objects.create(
            order=order,
            product_packaging=self.pkg,
            packaging_type="KTK",
            quantity=Decimal("4"),
            unit_price_idr=50000,
        )
        self.assertEqual(_line_qty_display(line), "4 KTK X 0.5 KG")


class PreprintedReceiptLayoutTests(TestCase):
    """Nota lama overlay must keep each value inside its pre-printed field."""

    def setUp(self):
        product = Product.objects.create(name="Bawang Goreng", variant_name="NYONYA MERAH")
        pkg = ProductPackaging.objects.create(
            product=product, label="5 KG @ 2 ONS", net_mass_kg=Decimal("0.2")
        )
        customer = Customer.objects.create(
            name="ASRI", address="JL. MASJID KOMPLEK PASAR INDUK, LAMBARO, B ACEH"
        )
        self.order = SalesOrder.objects.create(
            order_code="SO-TEST-RCPT",
            customer=customer,
            invoice_date=date(2026, 10, 13),
            total_idr=8600000,
        )
        SalesOrderLine.objects.create(
            order=self.order, product_packaging=pkg, quantity=Decimal("1000"), unit_price_idr=8600
        )

    def _draw(self):
        """Render the overlay and return {text: (left_mm, right_mm, font_size)}."""
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas

        from purchase.receipt_pdf import DEFAULT_LAYOUT, PAGE_SIZE, _draw_values

        drawn = {}

        class Recorder(canvas.Canvas):
            def drawString(self, x, y, text, *args, **kwargs):
                width = self.stringWidth(text, self._fontname, self._fontsize)
                drawn[text] = (x / mm, (x + width) / mm, self._fontsize)
                return super().drawString(x, y, text, *args, **kwargs)

            def drawRightString(self, x, y, text, *args, **kwargs):
                width = self.stringWidth(text, self._fontname, self._fontsize)
                drawn[text] = ((x - width) / mm, x / mm, self._fontsize)
                return super().drawRightString(x, y, text, *args, **kwargs)

        pdf = Recorder(BytesIO(), pagesize=PAGE_SIZE)
        _draw_values(
            pdf, DEFAULT_LAYOUT, self.order, list(self.order.lines.all()), include_faktur_number=False
        )
        return drawn

    def test_day_and_date_are_split_around_tgl_label(self):
        drawn = self._draw()
        # Pad prints "tgl." at ~102.6–106.7 mm between the two blanks.
        self.assertLess(drawn["SELASA"][1], 102.6)
        self.assertGreater(drawn["13-10-2026"][0], 106.7)

    def test_address_uses_pad_lines_at_readable_size(self):
        drawn = self._draw()
        address_lines = [k for k in drawn if k.startswith("JL.") or "ACEH" in k]
        self.assertTrue(address_lines)
        for text in address_lines:
            self.assertGreaterEqual(drawn[text][2], 8.0, text)

    def test_long_qty_is_condensed_inside_banyaknya_rule(self):
        from reportlab.pdfgen import canvas

        from purchase.receipt_pdf import DEFAULT_LAYOUT, PAGE_SIZE, _draw_fitted

        layout = DEFAULT_LAYOUT
        width = layout.preprinted_qty_right - layout.preprinted_qty_left
        pdf = canvas.Canvas(BytesIO(), pagesize=PAGE_SIZE)
        printed = _draw_fitted(
            pdf, 0, 0, "1000 BAL X 0.2 KG", "Helvetica", layout.font_qty, width,
            layout.font_min, layout.min_horiz_scale,
        )
        self.assertLessEqual(printed, width)
        # The pad's Banyaknya | Nama Barang rule sits at ~25 mm.
        self.assertLess(layout.preprinted_qty_right, 25.0)
