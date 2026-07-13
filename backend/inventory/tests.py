from decimal import Decimal

from django.test import SimpleTestCase

from inventory.product_stock import weighted_moving_average


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
