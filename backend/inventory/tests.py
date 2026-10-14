from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from account.models import UserRole
from inventory.models import Ingredient, Product, ProductPackaging, ProductStockMovement, StockUnit
from inventory.product_stock import weighted_moving_average

User = get_user_model()


class WeightedMovingAverageTests(SimpleTestCase):
    def test_first_receipt_sets_unit_cost(self):
        # 10 units bought at 1000 each -> avg 1000.
        avg = weighted_moving_average(0, 0, 10, Decimal("10000"))
        self.assertEqual(avg, Decimal("1000"))

    def test_blends_old_and_new_cost(self):
        # 10 @1000 then 10 @2000 -> (10000 + 20000) / 20 = 1500.
        avg = weighted_moving_average(10, Decimal("1000"), 10, Decimal("20000"))
        self.assertEqual(avg, Decimal("1500"))

    def test_zero_resulting_quantity_keeps_old_average(self):
        avg = weighted_moving_average(0, Decimal("500"), 0, Decimal("0"))
        self.assertEqual(avg, Decimal("500"))

    def test_product_per_gram_allocation(self):
        # 1000 g at 2/g, add 1000 g whose total cost is 4000 -> (2000 + 4000) / 2000 = 3.
        avg = weighted_moving_average(1000, Decimal("2"), 1000, Decimal("4000"))
        self.assertEqual(avg, Decimal("3"))


class IngredientMutasiCostingTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            "admin3", full_name="Admin", role=UserRole.ADMIN, password="pass"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

        ingredient = Ingredient.objects.create(name="Minyak", default_unit=StockUnit.LITER)
        self.inv = ingredient.inventory
        self.inv.remaining_stock = Decimal("10")
        self.inv.minimum_stock = Decimal("1")
        self.inv.avg_cost_idr = Decimal("20000")
        self.inv.save()

    def test_in_requires_unit_cost(self):
        resp = self.client.post(
            "/api/inventory/ingredient-stock-movements/",
            {
                "ingredient_inventory": self.inv.pk,
                "movement_type": "IN",
                "quantity": "5",
                "movement_at": "2026-07-26T10:00:00+07:00",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_in_updates_moving_average(self):
        resp = self.client.post(
            "/api/inventory/ingredient-stock-movements/",
            {
                "ingredient_inventory": self.inv.pk,
                "movement_type": "IN",
                "quantity": "10",
                "unit_cost_idr": "30000",
                "movement_at": "2026-07-26T10:00:00+07:00",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.remaining_stock, Decimal("20"))
        # (10*20000 + 10*30000) / 20 = 25000
        self.assertEqual(self.inv.avg_cost_idr, Decimal("25000"))

    def test_out_snapshots_avg_without_changing_it(self):
        resp = self.client.post(
            "/api/inventory/ingredient-stock-movements/",
            {
                "ingredient_inventory": self.inv.pk,
                "movement_type": "OUT",
                "quantity": "2",
                "movement_at": "2026-07-26T10:00:00+07:00",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.remaining_stock, Decimal("8"))
        self.assertEqual(self.inv.avg_cost_idr, Decimal("20000"))
        self.assertEqual(Decimal(resp.json()["unit_cost_idr"]), Decimal("20000"))

    def test_warehouse_staff_can_create_out_movement(self):
        warehouse = User.objects.create_user(
            "wh_mutasi", full_name="WH", role=UserRole.WAREHOUSE_STAFF, password="pass"
        )
        self.client.force_authenticate(warehouse)
        resp = self.client.post(
            "/api/inventory/ingredient-stock-movements/",
            {
                "ingredient_inventory": self.inv.pk,
                "movement_type": "OUT",
                "quantity": "1",
                "movement_at": "2026-07-26T10:00:00+07:00",
                "note": "PENGELUARAN BAHAN",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.remaining_stock, Decimal("9"))

    def test_warehouse_staff_can_bulk_create_in_movements(self):
        warehouse = User.objects.create_user(
            "wh_mutasi_bulk", full_name="WH", role=UserRole.WAREHOUSE_STAFF, password="pass"
        )
        self.client.force_authenticate(warehouse)
        resp = self.client.post(
            "/api/inventory/ingredient-stock-movements/bulk/",
            {
                "lines": [
                    {
                        "ingredient_inventory": self.inv.pk,
                        "movement_type": "IN",
                        "quantity": "2",
                        "unit_cost_idr": "21000",
                        "movement_at": "2026-07-26T10:00:00+07:00",
                        "note": "PENERIMAAN BAHAN",
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.remaining_stock, Decimal("12"))


class ProductMutasiPackagingBookkeepingTests(TestCase):
    def setUp(self):
        from django.utils import timezone

        self.timezone = timezone
        self.admin = User.objects.create_user(
            "admin_mutasi", full_name="Admin", role=UserRole.ADMIN, password="pass"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.product = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Original",
            price_per_kg_idr=100000,
            remaining_mass_grams=Decimal("0"),
        )
        self.pkg = ProductPackaging.objects.create(
            product=self.product,
            label="250g",
            net_mass_kg=Decimal("0.25"),
        )

    def test_in_with_kemasan_updates_stok_utama_and_keeps_sku_on_ledger(self):
        resp = self.client.post(
            "/api/inventory/product-stock-movements/",
            {
                "product": self.product.id,
                "product_packaging": self.pkg.id,
                "movement_type": "IN",
                "mass_grams": "10000",
                "bonus_mass_grams": "0",
                "unit_cost_per_kg_idr": "60000",
                "movement_at": self.timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.product.refresh_from_db()
        self.assertEqual(self.product.remaining_mass_grams, Decimal("10000"))
        row = ProductStockMovement.objects.get(pk=resp.json()["id"])
        self.assertEqual(row.product_packaging_id, self.pkg.id)

    def test_note_is_stored_uppercase(self):
        resp = self.client.post(
            "/api/inventory/product-stock-movements/",
            {
                "product": self.product.id,
                "movement_type": "IN",
                "mass_grams": "1000",
                "unit_cost_per_kg_idr": "60000",
                "note": "Koreksi stok gudang",
                "movement_at": self.timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()["note"], "KOREKSI STOK GUDANG")
        row = ProductStockMovement.objects.get(pk=resp.json()["id"])
        self.assertEqual(row.note, "KOREKSI STOK GUDANG")

    def test_rejects_kemasan_from_other_variant(self):
        other = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Pedas",
            price_per_kg_idr=100000,
        )
        resp = self.client.post(
            "/api/inventory/product-stock-movements/",
            {
                "product": other.id,
                "product_packaging": self.pkg.id,
                "movement_type": "IN",
                "mass_grams": "10000",
                "unit_cost_per_kg_idr": "60000",
                "movement_at": self.timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


class ProductTepungSplitTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            "admin_tepung", full_name="Admin", role=UserRole.ADMIN, password="pass"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.product = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Nyonya Merah",
            price_per_kg_idr=43000,
            tracks_tepung=True,
            remaining_mass_grams=Decimal("8000"),
            tepung_mass_grams=Decimal("2000"),
        )

    def _post(self, **payload):
        body = {
            "product": self.product.id,
            "movement_at": timezone.now().isoformat(),
            **payload,
        }
        return self.client.post("/api/inventory/product-stock-movements/", body, format="json")

    def test_tepung_in_adds_to_stok_utama_and_tepung_line(self):
        resp = self._post(
            movement_type="IN",
            stock_component="TEPUNG",
            mass_grams="1000",
            unit_cost_per_kg_idr="10000",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.product.refresh_from_db()
        self.assertEqual(self.product.remaining_mass_grams, Decimal("9000"))
        self.assertEqual(self.product.tepung_mass_grams, Decimal("3000"))
        self.assertEqual(Decimal(resp.json()["tepung_mass_grams"]), Decimal("1000"))

    def test_in_without_component_counts_as_bawang_goreng(self):
        resp = self._post(movement_type="IN", mass_grams="1000", unit_cost_per_kg_idr="10000")
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()["stock_component"], "GORENG")
        self.product.refresh_from_db()
        self.assertEqual(self.product.remaining_mass_grams, Decimal("9000"))
        self.assertEqual(self.product.tepung_mass_grams, Decimal("2000"))

    def test_tepung_out_cannot_exceed_tepung_line(self):
        resp = self._post(movement_type="OUT", stock_component="TEPUNG", mass_grams="2500")
        self.assertEqual(resp.status_code, 400, resp.content)
        self.product.refresh_from_db()
        self.assertEqual(self.product.remaining_mass_grams, Decimal("8000"))
        self.assertEqual(self.product.tepung_mass_grams, Decimal("2000"))

    def test_out_without_component_splits_proportionally(self):
        resp = self._post(movement_type="OUT", mass_grams="4000")
        self.assertEqual(resp.status_code, 201, resp.content)
        self.product.refresh_from_db()
        self.assertEqual(self.product.remaining_mass_grams, Decimal("4000"))
        self.assertEqual(self.product.tepung_mass_grams, Decimal("1000"))

    def test_tepung_rejected_for_product_without_split(self):
        other = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Asli",
            price_per_kg_idr=160000,
            remaining_mass_grams=Decimal("1000"),
        )
        resp = self.client.post(
            "/api/inventory/product-stock-movements/",
            {
                "product": other.id,
                "movement_type": "IN",
                "stock_component": "TEPUNG",
                "mass_grams": "1000",
                "unit_cost_per_kg_idr": "10000",
                "movement_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400, resp.content)

    def test_cannot_disable_split_while_tepung_remains(self):
        resp = self.client.patch(
            f"/api/inventory/products/{self.product.id}/",
            {"tracks_tepung": False},
            format="json",
        )
        self.assertEqual(resp.status_code, 400, resp.content)


class ProductDeleteInUseTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            "prod_del_admin", full_name="Admin", role=UserRole.ADMIN, password="pass"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.product = Product.objects.create(
            name="Bawang Goreng",
            variant_name="Nyonya Merah",
            price_per_kg_idr=100000,
        )
        self.pkg = ProductPackaging.objects.create(
            product=self.product, label="1 KG", net_mass_kg=Decimal("1")
        )

    def test_unused_product_can_be_deleted(self):
        resp = self.client.delete(f"/api/inventory/products/{self.product.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=self.product.id).exists())

    def test_product_with_sales_and_stock_shows_reasons(self):
        from purchase.models import Customer, OrderStatus, SalesOrder, SalesOrderLine

        ProductStockMovement.objects.create(
            product=self.product,
            product_packaging=self.pkg,
            movement_type="IN",
            mass_grams=Decimal("1000"),
            movement_at=timezone.now(),
        )
        customer = Customer.objects.create(name="Toko Nyonya", address="Jl. Test")
        order = SalesOrder.objects.create(
            order_code="SO-NYONYA-1",
            customer=customer,
            status=OrderStatus.AWAITING_PAYMENT,
            subtotal_idr=100000,
            total_idr=100000,
        )
        SalesOrderLine.objects.create(
            order=order,
            product_packaging=self.pkg,
            quantity=Decimal("1"),
            unit_price_idr=100000,
        )

        resp = self.client.delete(f"/api/inventory/products/{self.product.id}/")
        self.assertEqual(resp.status_code, 409, resp.content)
        body = resp.json()
        self.assertEqual(body["code"], "in_use")
        self.assertIn("Nyonya Merah", body["detail"])
        self.assertIn("pesanan penjualan (1)", body["detail"])
        self.assertIn("mutasi stok (1)", body["detail"])
        self.assertTrue(Product.objects.filter(pk=self.product.id).exists())

    def test_packaging_in_use_shows_label(self):
        ProductStockMovement.objects.create(
            product=self.product,
            product_packaging=self.pkg,
            movement_type="IN",
            mass_grams=Decimal("1000"),
            movement_at=timezone.now(),
        )
        resp = self.client.delete(f"/api/inventory/product-packaging/{self.pkg.id}/")
        self.assertEqual(resp.status_code, 409, resp.content)
        body = resp.json()
        self.assertEqual(body["code"], "in_use")
        self.assertIn("1 KG", body["detail"])
        self.assertIn("mutasi stok (1)", body["detail"])


class ProductPackagingLabelMassTests(TestCase):
    """Same label may repeat on a product as long as the berat differs."""

    def setUp(self):
        self.admin = User.objects.create_user(
            "pkg_label_admin", full_name="Admin", role=UserRole.ADMIN, password="pass"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.product = Product.objects.create(
            name="Bawang Goreng", variant_name="Nyonya Merah", price_per_kg_idr=100000
        )
        ProductPackaging.objects.create(product=self.product, label="1 ONS", net_mass_kg=Decimal("0.1"))

    def _create(self, label, net_mass_kg):
        return self.client.post(
            "/api/inventory/product-packaging/",
            {"product": self.product.id, "label": label, "net_mass_kg": net_mass_kg},
            format="json",
        )

    def test_same_label_with_different_mass_is_allowed(self):
        resp = self._create("1 ONS", "20")
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(ProductPackaging.objects.filter(product=self.product, label="1 ONS").count(), 2)

    def test_same_label_and_mass_is_rejected(self):
        resp = self._create("1 ons", "0.1")
        self.assertEqual(resp.status_code, 400, resp.content)
        self.assertIn("berat yang sama", str(resp.content.decode()))
