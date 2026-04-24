from django.core.management.base import BaseCommand
from django.utils.text import slugify

from expenses.models import EntryKind, OperationalCategory


DEFAULT_INCOME = [
    ("Penjualan produk", "Pemasukan dari penjualan barang jadi."),
    ("Penjualan lain-lain", "Pemasukan operasional lain."),
    ("Pendapatan jasa / komisi", "Jasa, komisi, atau pendapatan non-produk."),
    ("Koreksi / penyesuaian masuk", "Koreksi kas masuk."),
]

DEFAULT_EXPENSE = [
    ("Bahan baku & produksi", "Pembelian bahan untuk produksi."),
    ("Gaji & upah", "Gaji karyawan dan upah harian."),
    ("Sewa", "Sewa gedang, gudang, atau kendaraan."),
    ("Listrik & air", "Utilitas."),
    ("Transportasi & logistik", "Bahan bakar, kirim barang, dll."),
    ("Pemeliharaan & peralatan", "Perbaikan dan suku cadang."),
    ("Administrasi & konsultan", "Legal, konsultan, software."),
    ("Promosi & pemasaran", "Iklan, branding, sampel."),
    ("Lain-lain (pengeluaran)", "Pengeluaran operasional lain."),
]


class Command(BaseCommand):
    help = "Seed default operational cash categories (idempotent by slug)."

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        sort = 0
        for name, desc in DEFAULT_INCOME:
            sort += 10
            slug = slugify(name)[:130] or "income-category"
            if OperationalCategory.objects.filter(slug=slug).exists():
                skipped += 1
                continue
            OperationalCategory.objects.create(
                name=name,
                slug=slug,
                entry_kind=EntryKind.INCOME,
                description=desc,
                sort_order=sort,
                is_active=True,
            )
            created += 1
            self.stdout.write(self.style.SUCCESS(f"+ INCOME  {slug}"))
        sort = 0
        for name, desc in DEFAULT_EXPENSE:
            sort += 10
            slug = slugify(name)[:130] or "expense-category"
            if OperationalCategory.objects.filter(slug=slug).exists():
                skipped += 1
                continue
            OperationalCategory.objects.create(
                name=name,
                slug=slug,
                entry_kind=EntryKind.EXPENSE,
                description=desc,
                sort_order=sort,
                is_active=True,
            )
            created += 1
            self.stdout.write(self.style.SUCCESS(f"+ EXPENSE {slug}"))
        self.stdout.write(self.style.NOTICE(f"Done. Created={created}, skipped(existing)={skipped}"))
