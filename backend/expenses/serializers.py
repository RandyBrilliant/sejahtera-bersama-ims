from rest_framework import serializers

from account.media_fields import SignedMediaUrlField

from .models import EntryKind, OperationalCashEntry, OperationalCategory, PaymentMethod


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
    attachment = SignedMediaUrlField(read_only=True)

    class Meta:
        model = OperationalCashEntry
        fields = [
            "id",
            "direction",
            "payment_method",
            "category",
            "category_name",
            "amount_idr",
            "occurred_on",
            "description",
            "reference",
            "sales_order",
            "sales_order_code",
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

    def validate_category(self, value: OperationalCategory):
        if not value.is_active:
            raise serializers.ValidationError("Kategori tidak aktif.")
        return value

    def validate(self, attrs):
        if self.instance:
            direction = attrs.get("direction", self.instance.direction)
            category = attrs.get("category", self.instance.category)
            sales_order = attrs["sales_order"] if "sales_order" in attrs else self.instance.sales_order
        else:
            direction = attrs.get("direction")
            category = attrs.get("category")
            sales_order = attrs.get("sales_order")

        if category and direction and category.entry_kind != direction:
            raise serializers.ValidationError(
                {"category": ["Kategori tidak sesuai dengan jenis pemasukan/pengeluaran."]}
            )

        if sales_order and direction != EntryKind.INCOME:
            raise serializers.ValidationError(
                {"sales_order": ["Tautan sales order hanya untuk pemasukan (INCOME)."]}
            )

        return attrs

    def validate_payment_method(self, value: str):
        if value not in PaymentMethod.values:
            raise serializers.ValidationError("Metode pembayaran tidak valid.")
        return value

    def validate_description(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Deskripsi wajib diisi.")
        return cleaned
