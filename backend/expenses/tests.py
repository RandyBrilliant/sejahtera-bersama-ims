from datetime import date

from django.test import TestCase

from expenses.models import EntryKind, OperationalCashEntry, OperationalCategory
from expenses.reporting import opex_total_for_range


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
