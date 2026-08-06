"""Seed demo sales data for testing the Bon/Faktur receipt printing.

Creates (idempotently) a demo sales user, regions, customers, a product with
packaging SKUs, and a handful of sales orders with line items. Seeded orders
are tagged in ``notes`` with :data:`SEED_MARKER` so they can be detected and
recreated with ``--reset`` without touching real data.

Usage::

    python manage.py seed_sales_demo
    python manage.py seed_sales_demo --orders 10 --reset
"""

from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from inventory.models import Product, ProductPackaging
from purchase.models import (
    Customer,
    CustomerProductPrice,
    OrderStatus,
    SalesOrder,
    SalesOrderLine,
    Wilayah,
)
from purchase.utils import next_order_code, recompute_order_totals

User = get_user_model()

SEED_MARKER = "[SEED:sales-demo]"

DEMO_USER = {
    "username": "demo_sales",
    "full_name": "Demo Sales",
    "role": "SALES_STAFF",
}

REGIONS = ["SURABAYA", "SIDOARJO", "GRESIK"]

# (name, phone, address, region)
CUSTOMERS = [
    ("Toko Berkah Jaya", "0812 1111 2222", "Jl. Kedungdoro No. 12\nSurabaya", "SURABAYA"),
    ("Warung Bu Sri", "0813 3333 4444", "Jl. Raya Waru No. 5\nSidoarjo", "SIDOARJO"),
    ("Depot Cak Man", "0857 5555 6666", "Jl. Veteran No. 88\nGresik", "GRESIK"),
    ("Katering Sedap Rasa", "0821 7777 8888", "Jl. Diponegoro No. 21\nSurabaya", "SURABAYA"),
]

PRODUCT = {"name": "Bawang Goreng", "variant_name": "Original", "price_per_kg_idr": 80000}

# (label, net_mass_kg, sku)
PACKAGINGS = [
    ("Renceng 100 gr", Decimal("0.100"), "BG-ORI-100"),
    ("Bungkus 250 gr", Decimal("0.250"), "BG-ORI-250"),
    ("Bungkus 500 gr", Decimal("0.500"), "BG-ORI-500"),
    ("Kiloan 1 kg", Decimal("1.000"), "BG-ORI-1000"),
]

ORDER_STATUSES = [
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAYMENT_PROOF_UPLOADED,
    OrderStatus.VERIFIED,
]


class Command(BaseCommand):
    help = "Seed demo customers, products, and sales orders for receipt testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--orders",
            type=int,
            default=6,
            help="Total number of seeded sales orders to end up with (default: 6).",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete previously seeded sales orders before creating new ones.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=42,
            help="Random seed for reproducible demo data (default: 42).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(options["seed"])
        target_orders = max(0, options["orders"])

        user = self._ensure_user()
        self._ensure_regions(user)
        customers = self._ensure_customers(user)
        packagings = self._ensure_products(user)
        self._ensure_special_prices(user, customers, packagings)

        if options["reset"]:
            deleted, _ = SalesOrder.objects.filter(notes__startswith=SEED_MARKER).delete()
            self.stdout.write(self.style.WARNING(f"Reset: removed {deleted} seeded objects."))

        existing = SalesOrder.objects.filter(notes__startswith=SEED_MARKER).count()
        to_create = max(0, target_orders - existing)
        for _ in range(to_create):
            self._create_order(user, customers, packagings, rng)

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Orders created={to_create}, existing seeded={existing}, "
                f"total target={target_orders}."
            )
        )

    def _ensure_user(self):
        user = User.objects.filter(username=DEMO_USER["username"]).first()
        if user:
            return user
        user = User.objects.create_user(
            username=DEMO_USER["username"],
            password="demo-sales-123",
            full_name=DEMO_USER["full_name"],
            role=DEMO_USER["role"],
        )
        self.stdout.write(self.style.SUCCESS(f"+ user {user.username} (password: demo-sales-123)"))
        return user

    def _ensure_regions(self, user) -> None:
        for name in REGIONS:
            _, created = Wilayah.objects.get_or_create(
                name=name,
                defaults={"is_active": True, "created_by": user, "updated_by": user},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"+ wilayah {name}"))

    def _ensure_customers(self, user) -> list[Customer]:
        regions = {w.name: w for w in Wilayah.objects.filter(name__in=REGIONS)}
        customers: list[Customer] = []
        for name, phone, address, region in CUSTOMERS:
            customer, created = Customer.objects.get_or_create(
                name=name,
                defaults={
                    "phone": phone,
                    "address": address,
                    "wilayah": regions.get(region),
                    "is_active": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            customers.append(customer)
            if created:
                self.stdout.write(self.style.SUCCESS(f"+ customer {name}"))
        return customers

    def _ensure_products(self, user) -> list[ProductPackaging]:
        product, created = Product.objects.get_or_create(
            name=PRODUCT["name"],
            variant_name=PRODUCT["variant_name"],
            defaults={
                "price_per_kg_idr": PRODUCT["price_per_kg_idr"],
                "remaining_mass_grams": Decimal("100000"),
                "is_active": True,
                "created_by": user,
                "updated_by": user,
            },
        )
        if not created and not product.price_per_kg_idr:
            product.price_per_kg_idr = PRODUCT["price_per_kg_idr"]
            product.save(update_fields=["price_per_kg_idr", "updated_at"])
        if created:
            self.stdout.write(self.style.SUCCESS(f"+ product {product}"))

        packagings: list[ProductPackaging] = []
        for label, net_mass_kg, sku in PACKAGINGS:
            packaging, created = ProductPackaging.objects.get_or_create(
                product=product,
                label=label,
                defaults={
                    "net_mass_kg": net_mass_kg,
                    "sku": sku,
                    "is_active": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            packagings.append(packaging)
            if created:
                self.stdout.write(self.style.SUCCESS(f"+ packaging {packaging}"))
        return packagings

    def _ensure_special_prices(self, user, customers, packagings) -> None:
        # One customer gets a discounted price to exercise price resolution.
        customer = customers[0]
        packaging = packagings[1]
        _, created = CustomerProductPrice.objects.get_or_create(
            customer=customer,
            product_packaging=packaging,
            defaults={
                "selling_price_idr": 20000,
                "note": SEED_MARKER,
                "is_active": True,
                "created_by": user,
                "updated_by": user,
            },
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(f"+ special price {customer.name} / {packaging.label}")
            )

    def _create_order(self, user, customers, packagings, rng: random.Random) -> None:
        customer = rng.choice(customers)
        status = rng.choice(ORDER_STATUSES)
        now = timezone.now()
        order_code = next_order_code(SalesOrder, "SO")

        order = SalesOrder.objects.create(
            order_code=order_code,
            customer=customer,
            status=status,
            invoice_number=order_code,
            invoice_date=timezone.localdate() + timedelta(days=1),
            notes=f"{SEED_MARKER} pesanan contoh untuk uji cetak nota.",
            created_by=user,
            updated_by=user,
        )

        chosen = rng.sample(packagings, k=rng.randint(1, min(3, len(packagings))))
        for packaging in chosen:
            unit_price = int(
                (Decimal(packaging.product.price_per_kg_idr) * Decimal(str(packaging.net_mass_kg)))
                .quantize(Decimal("1"))
            )
            SalesOrderLine.objects.create(
                order=order,
                product_packaging=packaging,
                quantity=Decimal(rng.randint(1, 20)),
                unit_price_idr=unit_price,
                created_by=user,
                updated_by=user,
            )

        recompute_order_totals(order)
        if status == OrderStatus.VERIFIED:
            order.verified_at = now
            order.verified_by = user
        order.save(
            update_fields=[
                "subtotal_idr",
                "tax_amount_idr",
                "total_idr",
                "verified_at",
                "verified_by",
                "updated_at",
            ]
        )
        self.stdout.write(self.style.SUCCESS(f"+ sales order {order.order_code} ({status})"))
