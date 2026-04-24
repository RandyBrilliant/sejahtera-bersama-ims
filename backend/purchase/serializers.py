from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from inventory.models import ProductPackaging

from .models import (
    Customer,
    CustomerProductPrice,
    OrderStatus,
    PurchaseInLine,
    PurchaseInOrder,
    SalesOrder,
    SalesOrderLine,
)
from .utils import next_order_code, recompute_order_totals


def _user_mini(u):
    if not u:
        return None
    return {"id": u.id, "username": u.username, "full_name": u.full_name}


class CustomerSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "company_name",
            "phone",
            "email",
            "address",
            "tax_id",
            "notes",
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

    class Meta:
        model = PurchaseInOrder
        fields = [
            "id",
            "order_code",
            "supplier_name",
            "supplier_phone",
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
        status_val = attrs.get("status", getattr(self.instance, "status", OrderStatus.DRAFT))
        if self.instance and self.instance.status == OrderStatus.VERIFIED:
            raise serializers.ValidationError("Order yang sudah diverifikasi tidak dapat diubah.")
        lines = attrs.get("lines")
        if self.instance is None and (not lines or len(lines) == 0):
            raise serializers.ValidationError({"lines": ["Minimal satu baris bahan wajib ada."]})
        if status_val == OrderStatus.VERIFIED:
            raise serializers.ValidationError({"status": ["Status diverifikasi hanya melalui aksi owner."]})
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
        user = request.user if request and request.user.is_authenticated else None
        lines_data = validated_data.pop("lines")
        validated_data["order_code"] = next_order_code(PurchaseInOrder, "PI")
        order = PurchaseInOrder.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )
        for row in lines_data:
            PurchaseInLine.objects.create(
                order=order,
                ingredient_inventory=row["ingredient_inventory"],
                quantity=row["quantity"],
                unit_cost_idr=row["unit_cost_idr"],
                created_by=user,
                updated_by=user,
            )
        recompute_order_totals(order)
        order.save(update_fields=["subtotal_idr", "tax_amount_idr", "total_idr", "updated_at"])
        return order

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
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
        instance.save(update_fields=["subtotal_idr", "tax_amount_idr", "total_idr", "updated_at", "updated_by"])
        return instance


def _resolve_sales_unit_price(customer, packaging: ProductPackaging, explicit) -> int:
    if explicit is not None and explicit != "":
        price = int(explicit)
        if price < 1:
            raise serializers.ValidationError({"unit_price_idr": ["Harga satuan harus lebih dari 0."]})
        return price
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
    if packaging.list_price_idr:
        return int(packaging.list_price_idr)
    return int(packaging.base_price_idr)


class SalesOrderLineSerializer(serializers.ModelSerializer):
    product_variant_name = serializers.CharField(source="product_packaging.product.variant_name", read_only=True)
    packaging_label = serializers.CharField(source="product_packaging.label", read_only=True)
    line_total_idr = serializers.SerializerMethodField()
    unit_price_idr = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    class Meta:
        model = SalesOrderLine
        fields = [
            "id",
            "product_packaging",
            "product_variant_name",
            "packaging_label",
            "quantity",
            "unit_price_idr",
            "line_total_idr",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "product_variant_name",
            "packaging_label",
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
    lines = SalesOrderLineSerializer(many=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id",
            "order_code",
            "customer",
            "customer_name",
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
        status_val = attrs.get("status", getattr(self.instance, "status", OrderStatus.DRAFT))
        if self.instance and self.instance.status == OrderStatus.VERIFIED:
            raise serializers.ValidationError("Order yang sudah diverifikasi tidak dapat diubah.")
        lines = attrs.get("lines")
        if self.instance is None and (not lines or len(lines) == 0):
            raise serializers.ValidationError({"lines": ["Minimal satu baris produk wajib ada."]})
        if status_val == OrderStatus.VERIFIED:
            raise serializers.ValidationError({"status": ["Status diverifikasi hanya melalui aksi owner."]})
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
        user = request.user if request and request.user.is_authenticated else None
        lines_data = validated_data.pop("lines")
        customer = validated_data["customer"]
        validated_data["order_code"] = next_order_code(SalesOrder, "SO")
        order = SalesOrder.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )
        for row in lines_data:
            packaging = row["product_packaging"]
            explicit = row.get("unit_price_idr")
            unit_price = _resolve_sales_unit_price(customer, packaging, explicit)
            SalesOrderLine.objects.create(
                order=order,
                product_packaging=packaging,
                quantity=row["quantity"],
                unit_price_idr=unit_price,
                created_by=user,
                updated_by=user,
            )
        recompute_order_totals(order)
        order.save(update_fields=["subtotal_idr", "tax_amount_idr", "total_idr", "updated_at"])
        return order

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        lines_data = validated_data.pop("lines", None)
        customer = validated_data.get("customer", instance.customer)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = user
        instance.save()
        if lines_data is not None:
            if instance.status not in (OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.AWAITING_PAYMENT):
                raise serializers.ValidationError({"lines": ["Baris hanya dapat diubah saat status masih draft/submitted/awaiting payment."]})
            instance.lines.all().delete()
            for row in lines_data:
                packaging = row["product_packaging"]
                explicit = row.get("unit_price_idr")
                unit_price = _resolve_sales_unit_price(customer, packaging, explicit)
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
