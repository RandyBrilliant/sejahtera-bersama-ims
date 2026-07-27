from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from account.media_fields import SignedMediaUrlField
from account.models import UserRole
from inventory.models import ProductPackaging

from .models import (
    Customer,
    CustomerProductPrice,
    OrderStatus,
    PurchaseInLine,
    PurchaseInOrder,
    SalesOrder,
    SalesOrderLine,
    Wilayah,
)
from .utils import next_order_code, recompute_order_totals


def _request_user_can_set_custom_line_price(request) -> bool:
    """Sales staff cannot override line prices; admin/owner may set harga khusus."""
    user = getattr(request, "user", None) if request else None
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "role", None) == UserRole.LEADERSHIP:
        return True
    return getattr(user, "role", None) == UserRole.ADMIN


def _user_mini(u):
    if not u:
        return None
    return {"id": u.id, "username": u.username, "full_name": u.full_name}


def _default_invoice_number(order_code: str) -> str:
    return f"INV-{order_code}"


class CustomerSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    wilayah_name = serializers.CharField(source="wilayah.name", read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "address",
            "notes",
            "wilayah",
            "wilayah_name",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)

    def validate_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Nama pelanggan wajib diisi.")
        return cleaned

    def validate_address(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Alamat wajib diisi.")
        return cleaned


class WilayahSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = Wilayah
        fields = [
            "id",
            "name",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)

    def validate_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Nama wilayah wajib diisi.")
        return cleaned.upper()


class CustomerProductPriceSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    packaging_label = serializers.CharField(source="product_packaging.label", read_only=True)
    variant_name = serializers.CharField(source="product_packaging.product.variant_name", read_only=True)

    class Meta:
        model = CustomerProductPrice
        fields = [
            "id",
            "customer",
            "customer_name",
            "product_packaging",
            "packaging_label",
            "variant_name",
            "selling_price_idr",
            "note",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "customer_name",
            "packaging_label",
            "variant_name",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)


class PurchaseInLineSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(
        source="ingredient_inventory.ingredient.name",
        read_only=True,
    )
    line_total_idr = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseInLine
        fields = [
            "id",
            "ingredient_inventory",
            "ingredient_name",
            "quantity",
            "unit_cost_idr",
            "line_total_idr",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "ingredient_name", "line_total_idr", "created_at", "updated_at"]

    def get_line_total_idr(self, obj) -> int:
        return obj.line_total_idr


class PurchaseInOrderSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()
    verified_by = serializers.SerializerMethodField()
    lines = PurchaseInLineSerializer(many=True)
    payment_proof = SignedMediaUrlField(read_only=True)

    class Meta:
        model = PurchaseInOrder
        fields = [
            "id",
            "order_code",
            "status",
            "invoice_number",
            "invoice_date",
            "subtotal_idr",
            "total_idr",
            "payment_proof",
            "payment_proof_uploaded_at",
            "verified_at",
            "verified_by",
            "notes",
            "lines",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "order_code",
            "status",
            "subtotal_idr",
            "total_idr",
            "payment_proof",
            "payment_proof_uploaded_at",
            "verified_at",
            "verified_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_verified_by(self, obj):
        return _user_mini(obj.verified_by)

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)

    def validate(self, attrs):
        if self.instance and self.instance.status == OrderStatus.VERIFIED:
            raise serializers.ValidationError("Order yang sudah diverifikasi tidak dapat diubah.")
        lines = attrs.get("lines")
        if self.instance is None and (not lines or len(lines) == 0):
            raise serializers.ValidationError({"lines": ["Minimal satu baris bahan wajib ada."]})
        return attrs

    def validate_lines(self, lines_data):
        if not lines_data:
            return lines_data
        seen = set()
        for row in lines_data:
            iid = row.get("ingredient_inventory")
            pk = getattr(iid, "pk", iid)
            if pk in seen:
                raise serializers.ValidationError("Bahan tidak boleh duplikat dalam satu order.")
            seen.add(pk)
        return lines_data

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = validated_data.pop("created_by", None)
        if user is None:
            user = request.user if request and request.user.is_authenticated else None
        updated_by = validated_data.pop("updated_by", user)
        lines_data = validated_data.pop("lines")
        validated_data["status"] = OrderStatus.AWAITING_PAYMENT
        if not validated_data.get("invoice_date"):
            validated_data["invoice_date"] = timezone.localdate() + timedelta(days=1)
        validated_data["order_code"] = next_order_code(PurchaseInOrder, "PI")
        if not (validated_data.get("invoice_number") or "").strip():
            validated_data["invoice_number"] = f"INV-{validated_data['order_code']}"
        order = PurchaseInOrder.objects.create(
            **validated_data,
            created_by=user,
            updated_by=updated_by,
        )
        for row in lines_data:
            PurchaseInLine.objects.create(
                order=order,
                ingredient_inventory=row["ingredient_inventory"],
                quantity=row["quantity"],
                unit_cost_idr=row["unit_cost_idr"],
                created_by=user,
                updated_by=updated_by,
            )
        recompute_order_totals(order)
        order.save(update_fields=["subtotal_idr", "total_idr", "updated_at"])
        return order

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = validated_data.pop("updated_by", None)
        if user is None:
            user = request.user if request and request.user.is_authenticated else None
        validated_data.pop("status", None)
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = user
        instance.save()
        if lines_data is not None:
            if instance.status not in (OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.AWAITING_PAYMENT):
                raise serializers.ValidationError({"lines": ["Baris hanya dapat diubah saat status masih draft/submitted/awaiting payment."]})
            instance.lines.all().delete()
            for row in lines_data:
                PurchaseInLine.objects.create(
                    order=instance,
                    ingredient_inventory=row["ingredient_inventory"],
                    quantity=row["quantity"],
                    unit_cost_idr=row["unit_cost_idr"],
                    created_by=user,
                    updated_by=user,
                )
        recompute_order_totals(instance)
        instance.save(update_fields=["subtotal_idr", "total_idr", "updated_at", "updated_by"])
        return instance


def _price_from_per_kg(per_kg, net_mass_kg) -> int:
    total = Decimal(int(per_kg)) * Decimal(str(net_mass_kg))
    return int(total.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _resolve_sales_unit_price(
    customer, packaging: ProductPackaging, explicit_per_kg, *, allow_custom: bool = True
) -> int:
    """
    Resolve the per-package unit price for a sales line.

    Priority: explicit custom price per kg (applies to this order) →
    customer special price → product's fixed price per kg. All per-kg inputs
    are multiplied by the kemasan net mass (kg) to get the package total.
    """
    net_mass_kg = packaging.net_mass_kg
    if explicit_per_kg is not None and explicit_per_kg != "":
        if not allow_custom:
            raise serializers.ValidationError(
                {
                    "unit_price_per_kg_idr": [
                        "Staf penjualan tidak dapat mengatur harga khusus. Gunakan harga katalog atau harga pelanggan."
                    ]
                }
            )
        per_kg = int(explicit_per_kg)
        if per_kg < 1:
            raise serializers.ValidationError(
                {"unit_price_per_kg_idr": ["Harga per kg harus lebih dari 0."]}
            )
        return _price_from_per_kg(per_kg, net_mass_kg)
    cpp = (
        CustomerProductPrice.objects.filter(
            customer=customer,
            product_packaging=packaging,
            is_active=True,
        )
        .order_by("-updated_at")
        .first()
    )
    if cpp:
        return int(cpp.selling_price_idr)
    price_per_kg = packaging.product.price_per_kg_idr or 0
    if price_per_kg < 1:
        raise serializers.ValidationError(
            {"unit_price_per_kg_idr": ["Harga per kg produk belum diatur. Atur harga produk terlebih dulu."]}
        )
    return _price_from_per_kg(price_per_kg, net_mass_kg)


class SalesOrderLineSerializer(serializers.ModelSerializer):
    product_variant_name = serializers.CharField(source="product_packaging.product.variant_name", read_only=True)
    packaging_label = serializers.CharField(source="product_packaging.label", read_only=True)
    net_mass_kg = serializers.DecimalField(
        max_digits=14,
        decimal_places=6,
        source="product_packaging.net_mass_kg",
        read_only=True,
        coerce_to_string=True,
    )
    price_per_kg_idr = serializers.IntegerField(
        source="product_packaging.product.price_per_kg_idr", read_only=True
    )
    line_total_idr = serializers.SerializerMethodField()
    unit_price_per_kg_idr = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, write_only=True
    )

    class Meta:
        model = SalesOrderLine
        fields = [
            "id",
            "product_packaging",
            "product_variant_name",
            "packaging_label",
            "net_mass_kg",
            "price_per_kg_idr",
            "quantity",
            "unit_price_idr",
            "unit_price_per_kg_idr",
            "line_total_idr",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "product_variant_name",
            "packaging_label",
            "net_mass_kg",
            "price_per_kg_idr",
            "unit_price_idr",
            "line_total_idr",
            "created_at",
            "updated_at",
        ]

    def get_line_total_idr(self, obj) -> int:
        return obj.line_total_idr


class SalesOrderSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()
    verified_by = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_wilayah_name = serializers.CharField(
        source="customer.wilayah.name", read_only=True, allow_null=True
    )
    lines = SalesOrderLineSerializer(many=True)
    payment_proof = SignedMediaUrlField(read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id",
            "order_code",
            "customer",
            "customer_name",
            "customer_wilayah_name",
            "status",
            "invoice_number",
            "invoice_date",
            "due_date",
            "subtotal_idr",
            "tax_amount_idr",
            "total_idr",
            "payment_proof",
            "payment_proof_uploaded_at",
            "verified_at",
            "verified_by",
            "notes",
            "lines",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "order_code",
            "customer_name",
            "customer_wilayah_name",
            "status",
            "due_date",
            "subtotal_idr",
            "tax_amount_idr",
            "total_idr",
            "payment_proof",
            "payment_proof_uploaded_at",
            "verified_at",
            "verified_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_verified_by(self, obj):
        return _user_mini(obj.verified_by)

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)

    def validate(self, attrs):
        if self.instance and self.instance.status == OrderStatus.VERIFIED:
            raise serializers.ValidationError("Order yang sudah diverifikasi tidak dapat diubah.")
        lines = attrs.get("lines")
        if self.instance is None and (not lines or len(lines) == 0):
            raise serializers.ValidationError({"lines": ["Minimal satu baris produk wajib ada."]})
        return attrs

    def validate_lines(self, lines_data):
        if not lines_data:
            return lines_data
        seen = set()
        for row in lines_data:
            pid = row.get("product_packaging")
            pk = getattr(pid, "pk", pid)
            if pk in seen:
                raise serializers.ValidationError("Produk kemasan tidak boleh duplikat dalam satu order.")
            seen.add(pk)
        return lines_data

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = validated_data.pop("created_by", None)
        if user is None:
            user = request.user if request and request.user.is_authenticated else None
        updated_by = validated_data.pop("updated_by", user)
        lines_data = validated_data.pop("lines")
        customer = validated_data["customer"]
        validated_data["status"] = OrderStatus.AWAITING_PAYMENT
        validated_data["due_date"] = None
        validated_data["tax_amount_idr"] = 0
        if not validated_data.get("invoice_date"):
            validated_data["invoice_date"] = timezone.localdate() + timedelta(days=1)
        validated_data["order_code"] = next_order_code(SalesOrder, "SO")
        if not (validated_data.get("invoice_number") or "").strip():
            validated_data["invoice_number"] = _default_invoice_number(validated_data["order_code"])
        order = SalesOrder.objects.create(
            **validated_data,
            created_by=user,
            updated_by=updated_by,
        )
        allow_custom = _request_user_can_set_custom_line_price(request)
        for row in lines_data:
            packaging = row["product_packaging"]
            explicit = row.get("unit_price_per_kg_idr")
            unit_price = _resolve_sales_unit_price(
                customer, packaging, explicit, allow_custom=allow_custom
            )
            SalesOrderLine.objects.create(
                order=order,
                product_packaging=packaging,
                quantity=row["quantity"],
                unit_price_idr=unit_price,
                created_by=user,
                updated_by=updated_by,
            )
        recompute_order_totals(order)
        order.save(update_fields=["subtotal_idr", "tax_amount_idr", "total_idr", "updated_at"])
        return order

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = validated_data.pop("updated_by", None)
        if user is None:
            user = request.user if request and request.user.is_authenticated else None
        lines_data = validated_data.pop("lines", None)

        # Sales staff may only change line items — not nota / customer header fields.
        is_sales = (
            user
            and getattr(user, "role", None) == UserRole.SALES_STAFF
            and not getattr(user, "is_superuser", False)
        )
        if is_sales:
            blocked = [
                field
                for field in ("customer", "invoice_number", "invoice_date", "notes", "due_date")
                if field in validated_data
            ]
            if blocked:
                raise serializers.ValidationError(
                    {
                        field: ["Staf penjualan tidak dapat mengubah detail nota. Hanya item pesanan yang boleh diubah."]
                        for field in blocked
                    }
                )
            validated_data = {}

        customer = validated_data.get("customer", instance.customer)
        validated_data.pop("status", None)
        validated_data.pop("due_date", None)
        validated_data.pop("tax_amount_idr", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.due_date = None
        instance.tax_amount_idr = 0
        instance.updated_by = user
        instance.save()
        if lines_data is not None:
            if instance.status not in (OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.AWAITING_PAYMENT):
                raise serializers.ValidationError({"lines": ["Baris hanya dapat diubah saat status masih draft/submitted/awaiting payment."]})
            allow_custom = _request_user_can_set_custom_line_price(request)
            instance.lines.all().delete()
            for row in lines_data:
                packaging = row["product_packaging"]
                explicit = row.get("unit_price_per_kg_idr")
                unit_price = _resolve_sales_unit_price(
                    customer, packaging, explicit, allow_custom=allow_custom
                )
                SalesOrderLine.objects.create(
                    order=instance,
                    product_packaging=packaging,
                    quantity=row["quantity"],
                    unit_price_idr=unit_price,
                    created_by=user,
                    updated_by=user,
                )
        recompute_order_totals(instance)
        instance.save(update_fields=["subtotal_idr", "tax_amount_idr", "total_idr", "updated_at", "updated_by"])
        return instance
