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


    def test_warehouse_can_tick_and_untick_prepared(self):
        self.client.force_authenticate(self.warehouse)
        url = f"/api/purchase/sales-orders/{self.order.pk}/set-prepared/"
        res = self.client.post(url, {"prepared": True}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNotNone(res.data["prepared_at"])
        self.assertEqual(res.data["prepared_by"]["id"], self.warehouse.pk)

        res = self.client.post(url, {"prepared": False}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNone(res.data["prepared_at"])
        self.assertIsNone(res.data["prepared_by"])

    def test_prepared_requires_boolean_and_open_order(self):
        self.client.force_authenticate(self.admin)
        url = f"/api/purchase/sales-orders/{self.order.pk}/set-prepared/"
        self.assertEqual(self.client.post(url, {}, format="json").status_code, 400)

        self.order.status = OrderStatus.CANCELLED
        self.order.save(update_fields=["status"])
        res = self.client.post(url, {"prepared": True}, format="json")
        self.assertEqual(res.status_code, 400)


    def test_envelope_pdf_renders(self):
        self.client.force_authenticate(self.warehouse)
        res = self.client.get(f"/api/purchase/sales-orders/{self.order.pk}/receipt-pdf/?mode=envelope")
        self.assertEqual(res.status_code, 200)
        self.assertIn("amplop", res["Content-Disposition"])
        self.assertTrue(b"".join(res.streaming_content).startswith(b"%PDF"))

    def test_envelope_text(self):
        from purchase.envelope_pdf import _product_name_text, _summary_text, _variant_texts

        line = self.order.lines.get()
        self.assertEqual(_summary_text(line), "4 KTK X 0.25 KG = 1 KG")
        self.assertEqual(_product_name_text([line]), "BAWANG GORENG")
        # Variant name only (no qty / kemasan), listed once even across lines.
        self.assertEqual(_variant_texts([line, line]), ["ORIGINAL"])

    def test_envelope_long_order_stays_clear_of_kepada(self):
        from unittest import mock

        from purchase import envelope_pdf
        from purchase.envelope_pdf import DEFAULT_ENVELOPE_LAYOUT as L

        line = self.order.lines.get()
        product = line.product_packaging.product
        for i in range(5):
            line.pk = None
            line.product_packaging = ProductPackaging.objects.create(
                product=product, label=f"KEMASAN {i}", net_mass_kg=Decimal(i + 2)
            )
            line.save()
        tops: list[tuple[float, str]] = []
        real = envelope_pdf._draw_left

        def spy(pdf, layout, x_mm, top_mm, text, font, size):
            tops.append((top_mm, text))
            return real(pdf, layout, x_mm, top_mm, text, font, size)

        with mock.patch.object(envelope_pdf, "_draw_left", side_effect=spy):
            envelope_pdf.build_sales_order_envelope_pdf(self.order)
        above = [top for top, text in tops if top < L.kepada_top]
        self.assertEqual(len(above), 6 + 1 + 1)  # summary rows + name + one shared variant
        self.assertLessEqual(max(above), L.kepada_top - L.kepada_clearance + 1e-6)

    def test_envelope_omits_phone_number(self):
        from unittest import mock

        from purchase import envelope_pdf

        self.order.customer.phone = "0812 3456 7890"
        self.order.customer.save()
        drawn: list[str] = []
        real = envelope_pdf._draw_left

        def spy(pdf, layout, x_mm, top_mm, text, font, size):
            drawn.append(text)
            return real(pdf, layout, x_mm, top_mm, text, font, size)

        with mock.patch.object(envelope_pdf, "_draw_left", side_effect=spy):
            envelope_pdf.build_sales_order_envelope_pdf(self.order)
        self.assertTrue(drawn)
        self.assertFalse(any("0812" in t for t in drawn), drawn)


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

            def drawText(self, text_obj):
                # Every string ends up here (incl. _draw_fitted cells); keep raw operators.
                self.codes.append(text_obj.getCode())
                return super().drawText(text_obj)

        pdf = Recorder(BytesIO(), pagesize=PAGE_SIZE)
        pdf.codes = self.codes = []
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

    def test_all_address_lines_share_the_first_line_left_edge(self):
        from purchase.receipt_pdf import DEFAULT_LAYOUT

        drawn = self._draw()
        first = [k for k in drawn if k.startswith("JL.")]
        self.assertEqual(len(first), 1)
        self.assertAlmostEqual(drawn[first[0]][0], DEFAULT_LAYOUT.preprinted_address_first_left, places=3)
        rest = [k for k in drawn if "ACEH" in k and not k.startswith("JL.")]
        self.assertTrue(rest, "expected the alamat to wrap onto a second line")
        for text in rest:
            self.assertAlmostEqual(drawn[text][0], DEFAULT_LAYOUT.preprinted_address_first_left, places=3)

    def test_single_letter_stays_with_next_word(self):
        from reportlab.pdfgen import canvas

        from purchase.receipt_pdf import FONT, PAGE_SIZE, _wrap_into_slots

        pdf = canvas.Canvas(BytesIO(), pagesize=PAGE_SIZE)
        lines, _ = _wrap_into_slots(pdf, "JL PA JALIL, KP BARU, B ACEH", FONT, 11, 8, [55, 55])
        self.assertFalse(any(line.endswith(" B") for line in lines), lines)
        self.assertTrue(any("B ACEH" in line for line in lines), lines)

    def test_total_kg_is_printed_under_items(self):
        self._draw()
        # 1000 kemasan x 0.2 kg.
        self.assertTrue(any("TOTAL: 200 KG" in code for code in self.codes), self.codes)

    def test_banyaknya_is_left_blank(self):
        self._draw()
        self.assertTrue(any("NYONYA MERAH" in code for code in self.codes))
        self.assertFalse(any("BAL X" in code for code in self.codes), self.codes)
