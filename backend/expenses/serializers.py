from rest_framework import serializers

from .models import EntryKind, OperationalCashEntry, OperationalCategory


def _user_mini(u):
    if not u:
        return None
    return {"id": u.id, "username": u.username, "full_name": u.full_name}


class OperationalCategorySerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = OperationalCategory
        fields = [
            "id",
            "name",
            "slug",
            "entry_kind",
            "description",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at", "created_by", "updated_by"]

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)

    def validate_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Nama kategori wajib diisi.")
        return cleaned


class OperationalCashEntrySerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    sales_order_code = serializers.SerializerMethodField()
    purchase_in_order_code = serializers.SerializerMethodField()

    class Meta:
        model = OperationalCashEntry
        fields = [
            "id",
            "direction",
            "category",
            "category_name",
            "amount_idr",
            "occurred_on",
            "description",
            "reference",
            "sales_order",
            "sales_order_code",
            "purchase_in_order",
            "purchase_in_order_code",
            "attachment",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "category_name",
            "sales_order_code",
            "purchase_in_order_code",
            "attachment",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_created_by(self, obj):
        return _user_mini(obj.created_by)

    def get_updated_by(self, obj):
        return _user_mini(obj.updated_by)

    def get_sales_order_code(self, obj):
        return obj.sales_order.order_code if obj.sales_order_id else None

    def get_purchase_in_order_code(self, obj):
        return obj.purchase_in_order.order_code if obj.purchase_in_order_id else None

    def validate_category(self, value: OperationalCategory):
        if not value.is_active:
            raise serializers.ValidationError("Kategori tidak aktif.")
        return value

    def validate(self, attrs):
        if self.instance:
            direction = attrs.get("direction", self.instance.direction)
            category = attrs.get("category", self.instance.category)
            sales_order = attrs["sales_order"] if "sales_order" in attrs else self.instance.sales_order
            purchase_in_order = (
                attrs["purchase_in_order"] if "purchase_in_order" in attrs else self.instance.purchase_in_order
            )
        else:
            direction = attrs.get("direction")
            category = attrs.get("category")
            sales_order = attrs.get("sales_order")
            purchase_in_order = attrs.get("purchase_in_order")

        if category and direction and category.entry_kind != direction:
            raise serializers.ValidationError(
                {"category": ["Kategori tidak sesuai dengan jenis pemasukan/pengeluaran."]}
            )

        if sales_order and purchase_in_order:
            raise serializers.ValidationError(
                {"non_field_errors": ["Hanya satu tautan order (penjualan atau pembelian bahan) yang diperbolehkan."]}
            )
        if sales_order and direction != EntryKind.INCOME:
            raise serializers.ValidationError(
                {"sales_order": ["Tautan sales order hanya untuk pemasukan (INCOME)."]}
            )
        if purchase_in_order and direction != EntryKind.EXPENSE:
            raise serializers.ValidationError(
                {"purchase_in_order": ["Tautan purchase in hanya untuk pengeluaran (EXPENSE)."]}
            )

        return attrs

    def validate_description(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Deskripsi wajib diisi.")
        return cleaned
