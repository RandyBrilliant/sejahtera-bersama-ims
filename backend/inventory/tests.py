from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from account.models import UserRole
from inventory.models import Ingredient, IngredientInventory, StockUnit
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
        self.inv = IngredientInventory.objects.create(
            ingredient=ingredient,
            remaining_stock=Decimal("10"),
            minimum_stock=Decimal("1"),
            avg_cost_idr=Decimal("20000"),
        )

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
