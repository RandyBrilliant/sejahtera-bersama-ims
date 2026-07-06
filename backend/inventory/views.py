from datetime import date
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Case, Count, DecimalField, ExpressionWrapper, F, IntegerField, Sum, Value, When
from django.db.models.functions import Cast, Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from account.api_responses import success_response
from account.pagination import StandardResultsSetPagination
from account.permissions import InventoryAccess

from .filters import (
    IngredientFilter,
    IngredientInventoryFilter,
    IngredientStockMovementFilter,
    ProductFilter,
    ProductionBatchFilter,
    ProductPackagingFilter,
    ProductStockMovementFilter,
)
from .models import (
    Ingredient,
    IngredientInventory,
    IngredientStockMovement,
    Product,
    ProductionBatch,
    ProductionIngredientUsage,
    ProductionPackagingOutput,
    ProductPackaging,
    ProductStockMovement,
    StockMovementType,
)
from .product_stock import (
    annotate_packaging_derived_remaining,
    grams_delta_from_mass_fields,
    product_financial_value_idr,
)
from .serializers import (
    IngredientInventorySerializer,
    IngredientSerializer,
    IngredientStockMovementSerializer,
    ProductionBatchSerializer,
    ProductPackagingSerializer,
    ProductSerializer,
    ProductStockMovementSerializer,
)


def _decimal_zero(max_digits: int = 12, decimal_places: int = 3) -> Value:
    """Coalesce default compatible with DecimalField aggregates (avoid int/decimal mix)."""
    return Value(Decimal("0"), output_field=DecimalField(max_digits=max_digits, decimal_places=decimal_places))


def _estimated_packaging_line_value():
    """(produced + bonus) × harga pokok — Cast harga ke Decimal agar tidak mixed Integer × Decimal."""
    qty_plus_bonus = F("quantity_produced") + F("bonus_quantity")
    price_dec = Cast(F("product_packaging__base_price_idr"), DecimalField(max_digits=14, decimal_places=0))
    return ExpressionWrapper(
        qty_plus_bonus * price_dec,
        output_field=DecimalField(max_digits=24, decimal_places=3),
    )


_DECIMAL_QTY12 = DecimalField(max_digits=12, decimal_places=3)
# Default untuk Coalesce pada Sum field Decimal — Value(0) memicu FieldError mixed Decimal/Integer (Django 6).
ZERO_QTY12 = _decimal_zero(12, 3)
PACKAGING_OUTPUT_SUM = ExpressionWrapper(
    F("quantity_produced") + F("bonus_quantity"),
    output_field=_DECIMAL_QTY12,
)


class AuditTrailMixin:
    """Populate created_by/updated_by fields from request user."""

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ProductViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "variant_name"]
    ordering_fields = ["name", "variant_name", "remaining_mass_grams"]
    ordering = ["variant_name"]

    def get_queryset(self):
        return Product.objects.select_related("created_by", "updated_by")

    @action(detail=True, methods=["get"], url_path="packaging-summary")
    def packaging_summary(self, request, pk=None):
        product = self.get_object()
        variants_qs = product.packaging_variants.all()
        data = {
            "total_packaging": variants_qs.count(),
            "active_packaging": variants_qs.filter(is_active=True).count(),
            "remaining_mass_grams": product.remaining_mass_grams,
            "stock_value_idr": product_financial_value_idr(product),
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=data))


class ProductPackagingViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = ProductPackagingSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductPackagingFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["label", "sku", "product__name", "product__variant_name"]
    ordering_fields = ["label"]
    ordering = ["product__variant_name", "net_mass_kg"]

    def get_queryset(self):
        qs = ProductPackaging.objects.select_related("product", "created_by", "updated_by")
        return annotate_packaging_derived_remaining(qs)


class IngredientViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = IngredientSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = IngredientFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        return Ingredient.objects.select_related("created_by", "updated_by")


class IngredientInventoryViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = IngredientInventorySerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = IngredientInventoryFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["ingredient__name"]
    ordering_fields = ["ingredient__name"]
    ordering = ["ingredient__name"]

    def get_queryset(self):
        return IngredientInventory.objects.select_related(
            "ingredient",
            "created_by",
            "updated_by",
        ).annotate(
            is_below_minimum=Case(
                When(remaining_stock__lt=F("minimum_stock"), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )


class InventorySummaryView(APIView):
    permission_classes = [InventoryAccess]

    def get(self, request):
        product_aggregates = ProductPackaging.objects.aggregate(
            total_packaging=Count("id"),
            active_packaging=Count("id", filter=models.Q(is_active=True)),
        )
        mass_total = Product.objects.aggregate(
            total_product_mass_grams=Coalesce(Sum("remaining_mass_grams"), _decimal_zero()),
        )

        inventory_value_total = sum(
            product_financial_value_idr(p)
            for p in Product.objects.prefetch_related("packaging_variants").only(
                "id",
                "remaining_mass_grams",
            )
        )

        ingredient_aggregates = IngredientInventory.objects.aggregate(
            total_ingredient_items=Count("id"),
            low_stock_items=Count("id", filter=models.Q(remaining_stock__lt=F("minimum_stock"))),
            total_ingredient_stock=Coalesce(Sum("remaining_stock"), _decimal_zero()),
        )

        payload = {
            "products": {
                **product_aggregates,
                **mass_total,
                "total_product_stock_value_idr": str(inventory_value_total),
            },
            "ingredients": ingredient_aggregates,
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=payload))


class DailyInventoryRecapView(APIView):
    permission_classes = [InventoryAccess]

    def get(self, request):
        raw_date = (request.query_params.get("date") or "").strip()
        if not raw_date:
            return Response(
                {"detail": "Query param 'date' wajib diisi (format: YYYY-MM-DD).", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            recap_date = date.fromisoformat(raw_date)
        except ValueError:
            return Response(
                {"detail": "Format date tidak valid. Gunakan YYYY-MM-DD.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ingredient_rows = list(
            ProductionIngredientUsage.objects.filter(batch__production_date=recap_date)
            .values(
                "ingredient_inventory",
                "ingredient_inventory__ingredient__name",
                "ingredient_inventory__ingredient__default_unit",
            )
            .annotate(total_used=Coalesce(Sum("quantity_used"), ZERO_QTY12))
            .order_by("ingredient_inventory__ingredient__name")
        )

        packaging_rows = list(
            ProductionPackagingOutput.objects.filter(batch__production_date=recap_date)
            .values(
                "product_packaging",
                "product_packaging__product__variant_name",
                "product_packaging__label",
                "product_packaging__base_price_idr",
            )
            .annotate(
                total_produced=Coalesce(Sum("quantity_produced"), ZERO_QTY12),
                total_bonus=Coalesce(Sum("bonus_quantity"), ZERO_QTY12),
                total_output=Coalesce(Sum(PACKAGING_OUTPUT_SUM), ZERO_QTY12),
                estimated_value_idr=Coalesce(
                    Sum(_estimated_packaging_line_value()),
                    _decimal_zero(24, 3),
                ),
            )
            .order_by("product_packaging__product__variant_name", "product_packaging__label")
        )

        ingredient_summary = ProductionIngredientUsage.objects.filter(batch__production_date=recap_date).aggregate(
            total_ingredients_used=Coalesce(Sum("quantity_used"), ZERO_QTY12),
        )
        packaging_summary = ProductionPackagingOutput.objects.filter(batch__production_date=recap_date).aggregate(
            total_packages_produced=Coalesce(Sum("quantity_produced"), ZERO_QTY12),
            total_bonus_packages=Coalesce(Sum("bonus_quantity"), ZERO_QTY12),
            total_packages_output=Coalesce(Sum(PACKAGING_OUTPUT_SUM), ZERO_QTY12),
            estimated_production_value_idr=Coalesce(
                Sum(_estimated_packaging_line_value()),
                _decimal_zero(24, 3),
            ),
        )

        payload = {
            "date": recap_date.isoformat(),
            "summary": {
                **ingredient_summary,
                **packaging_summary,
            },
            "ingredient_usage": [
                {
                    "ingredient_inventory": row["ingredient_inventory"],
                    "ingredient_name": row["ingredient_inventory__ingredient__name"],
                    "unit": row["ingredient_inventory__ingredient__default_unit"],
                    "total_used": row["total_used"],
                }
                for row in ingredient_rows
            ],
            "packaging_output": [
                {
                    "product_packaging": row["product_packaging"],
                    "variant_name": row["product_packaging__product__variant_name"],
                    "packaging_label": row["product_packaging__label"],
                    "base_price_idr": row["product_packaging__base_price_idr"],
                    "total_produced": row["total_produced"],
                    "total_bonus": row["total_bonus"],
                    "total_output": row["total_output"],
                    "estimated_value_idr": row["estimated_value_idr"],
                }
                for row in packaging_rows
            ],
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=payload))


class RangeInventoryRecapView(APIView):
    permission_classes = [InventoryAccess]

    def get(self, request):
        raw_start = (request.query_params.get("start_date") or "").strip()
        raw_end = (request.query_params.get("end_date") or "").strip()

        if not raw_start or not raw_end:
            return Response(
                {
                    "detail": "Query param 'start_date' dan 'end_date' wajib diisi (format: YYYY-MM-DD).",
                    "code": "validation_error",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = date.fromisoformat(raw_start)
            end_date = date.fromisoformat(raw_end)
        except ValueError:
            return Response(
                {"detail": "Format tanggal tidak valid. Gunakan YYYY-MM-DD.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date:
            return Response(
                {"detail": "start_date tidak boleh lebih besar dari end_date.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ingredient_base_qs = ProductionIngredientUsage.objects.filter(
            batch__production_date__gte=start_date,
            batch__production_date__lte=end_date,
        )
        packaging_base_qs = ProductionPackagingOutput.objects.filter(
            batch__production_date__gte=start_date,
            batch__production_date__lte=end_date,
        )

        ingredient_rows = list(
            ingredient_base_qs.values(
                "ingredient_inventory",
                "ingredient_inventory__ingredient__name",
                "ingredient_inventory__ingredient__default_unit",
            )
            .annotate(total_used=Coalesce(Sum("quantity_used"), ZERO_QTY12))
            .order_by("ingredient_inventory__ingredient__name")
        )

        packaging_rows = list(
            packaging_base_qs.values(
                "product_packaging",
                "product_packaging__product__variant_name",
                "product_packaging__label",
                "product_packaging__base_price_idr",
            )
            .annotate(
                total_produced=Coalesce(Sum("quantity_produced"), ZERO_QTY12),
                total_bonus=Coalesce(Sum("bonus_quantity"), ZERO_QTY12),
                total_output=Coalesce(Sum(PACKAGING_OUTPUT_SUM), ZERO_QTY12),
                estimated_value_idr=Coalesce(
                    Sum(_estimated_packaging_line_value()),
                    _decimal_zero(24, 3),
                ),
            )
            .order_by("product_packaging__product__variant_name", "product_packaging__label")
        )

        ingredient_summary = ingredient_base_qs.aggregate(
            total_ingredients_used=Coalesce(Sum("quantity_used"), ZERO_QTY12),
        )
        packaging_summary = packaging_base_qs.aggregate(
            total_packages_produced=Coalesce(Sum("quantity_produced"), ZERO_QTY12),
            total_bonus_packages=Coalesce(Sum("bonus_quantity"), ZERO_QTY12),
            total_packages_output=Coalesce(Sum(PACKAGING_OUTPUT_SUM), ZERO_QTY12),
            estimated_production_value_idr=Coalesce(
                Sum(_estimated_packaging_line_value()),
                _decimal_zero(24, 3),
            ),
        )
        total_batches = ProductionBatch.objects.filter(
            production_date__gte=start_date,
            production_date__lte=end_date,
        ).count()

        payload = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "summary": {
                "total_batches": total_batches,
                **ingredient_summary,
                **packaging_summary,
            },
            "ingredient_usage": [
                {
                    "ingredient_inventory": row["ingredient_inventory"],
                    "ingredient_name": row["ingredient_inventory__ingredient__name"],
                    "unit": row["ingredient_inventory__ingredient__default_unit"],
                    "total_used": row["total_used"],
                }
                for row in ingredient_rows
            ],
            "packaging_output": [
                {
                    "product_packaging": row["product_packaging"],
                    "variant_name": row["product_packaging__product__variant_name"],
                    "packaging_label": row["product_packaging__label"],
                    "base_price_idr": row["product_packaging__base_price_idr"],
                    "total_produced": row["total_produced"],
                    "total_bonus": row["total_bonus"],
                    "total_output": row["total_output"],
                    "estimated_value_idr": row["estimated_value_idr"],
                }
                for row in packaging_rows
            ],
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=payload))


class IngredientStockMovementViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = IngredientStockMovementSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = IngredientStockMovementFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["ingredient_inventory__ingredient__name", "note"]
    ordering_fields = [
        "ingredient_inventory__ingredient__name",
        "movement_at",
        "id",
    ]
    ordering = ["-movement_at"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return IngredientStockMovement.objects.select_related(
            "ingredient_inventory__ingredient",
            "created_by",
            "updated_by",
        )

    @transaction.atomic
    def perform_create(self, serializer):
        movement = serializer.validated_data["movement_type"]
        qty = serializer.validated_data["quantity"]
        inventory = (
            IngredientInventory.objects.select_for_update()
            .select_related("ingredient")
            .get(pk=serializer.validated_data["ingredient_inventory"].pk)
        )

        if movement == StockMovementType.OUT and inventory.remaining_stock < qty:
            raise ValueError("Stok bahan tidak mencukupi untuk stock out.")

        delta = qty if movement == StockMovementType.IN else -qty
        inventory.remaining_stock = inventory.remaining_stock + delta
        inventory.updated_by = self.request.user
        inventory.save(update_fields=["remaining_stock", "updated_by", "updated_at"])

        serializer.save(
            ingredient_inventory=inventory,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as exc:
            return Response(
                {"detail": str(exc), "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProductStockMovementViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = ProductStockMovementSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductStockMovementFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = [
        "product__variant_name",
        "product_packaging__label",
        "product_packaging__product__variant_name",
        "note",
    ]
    ordering_fields = [
        "product__variant_name",
        "movement_at",
        "id",
    ]
    ordering = ["-movement_at"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return ProductStockMovement.objects.select_related(
            "product",
            "product_packaging",
            "product_packaging__product",
            "created_by",
            "updated_by",
        ).annotate(
            total_mass_grams=ExpressionWrapper(
                F("mass_grams") + F("bonus_mass_grams"),
                output_field=DecimalField(max_digits=14, decimal_places=3),
            )
        )

    @transaction.atomic
    def perform_create(self, serializer):
        movement = serializer.validated_data["movement_type"]
        mass = serializer.validated_data["mass_grams"]
        bonus_mass = serializer.validated_data.get("bonus_mass_grams") or Decimal("0")
        prod = serializer.validated_data["product"]

        product = Product.objects.select_for_update().get(pk=prod.pk)

        if movement == StockMovementType.OUT and bonus_mass > 0:
            raise ValueError("Bonus massa hanya untuk stock in.")

        delta_mass = grams_delta_from_mass_fields(
            movement_type=movement,
            mass_grams=mass,
            bonus_mass_grams=bonus_mass,
        )

        next_mass = (product.remaining_mass_grams or Decimal("0")) + delta_mass
        if next_mass < 0:
            raise ValueError(
                "Stok produk (massa utama) tidak mencukupi untuk pengeluaran ini."
            )

        product.remaining_mass_grams = next_mass
        product.updated_by = self.request.user
        product.save(update_fields=["remaining_mass_grams", "updated_by", "updated_at"])

        serializer.save(
            product_packaging=None,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as exc:
            return Response(
                {"detail": str(exc), "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProductionBatchViewSet(viewsets.ModelViewSet):
    serializer_class = ProductionBatchSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductionBatchFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["shift_label", "note"]
    ordering_fields = ["production_date", "created_at", "updated_at"]
    ordering = ["-production_date", "-id"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return ProductionBatch.objects.select_related("created_by", "updated_by").prefetch_related(
            "ingredient_usages__ingredient_inventory__ingredient",
            "packaging_outputs__product_packaging__product",
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            ingredient_usages = data.pop("ingredient_usages_input")
            packaging_outputs = data.pop("packaging_outputs_input")

            batch = ProductionBatch.objects.create(
                **data,
                created_by=request.user,
                updated_by=request.user,
            )

            for row in ingredient_usages:
                inventory = IngredientInventory.objects.select_for_update().get(pk=row["ingredient_inventory"].pk)
                quantity_used = row["quantity_used"]
                if inventory.remaining_stock < quantity_used:
                    raise ValueError(f"Stok bahan tidak cukup: {inventory.ingredient.name}")

                inventory.remaining_stock = inventory.remaining_stock - quantity_used
                inventory.updated_by = request.user
                inventory.save(update_fields=["remaining_stock", "updated_by", "updated_at"])

                ProductionIngredientUsage.objects.create(
                    batch=batch,
                    ingredient_inventory=inventory,
                    quantity_used=quantity_used,
                )
                IngredientStockMovement.objects.create(
                    ingredient_inventory=inventory,
                    movement_type=StockMovementType.OUT,
                    quantity=quantity_used,
                    note=f"Pemakaian produksi batch #{batch.id}",
                    movement_at=batch.created_at,
                    created_by=request.user,
                    updated_by=request.user,
                )

            mass_in_by_pid: dict[int, Decimal] = {}
            for row in packaging_outputs:
                pkg = row["product_packaging"]
                quantity_produced = row["quantity_produced"]
                bonus_quantity = row.get("bonus_quantity") or Decimal("0")
                gm = Decimal(str(pkg.net_mass_kg)) * Decimal("1000") * (quantity_produced + bonus_quantity)
                pid = pkg.product_id
                mass_in_by_pid[pid] = mass_in_by_pid.get(pid, Decimal("0")) + gm

            for pid in sorted(mass_in_by_pid.keys()):
                prod = Product.objects.select_for_update().get(pk=pid)
                base = prod.remaining_mass_grams or Decimal("0")
                prod.remaining_mass_grams = base + mass_in_by_pid[pid]
                prod.updated_by = request.user
                prod.save(update_fields=["remaining_mass_grams", "updated_by", "updated_at"])

            for row in packaging_outputs:
                packaging = ProductPackaging.objects.select_for_update().get(pk=row["product_packaging"].pk)
                quantity_produced = row["quantity_produced"]
                bonus_quantity = row.get("bonus_quantity") or Decimal("0")
                grams_per_pkg = Decimal(str(packaging.net_mass_kg)) * Decimal("1000")
                mass_main = grams_per_pkg * quantity_produced
                mass_bonus = grams_per_pkg * bonus_quantity

                ProductionPackagingOutput.objects.create(
                    batch=batch,
                    product_packaging=packaging,
                    quantity_produced=quantity_produced,
                    bonus_quantity=bonus_quantity,
                )
                ProductStockMovement.objects.create(
                    product=packaging.product,
                    product_packaging=packaging,
                    movement_type=StockMovementType.IN,
                    mass_grams=mass_main,
                    bonus_mass_grams=mass_bonus,
                    note=f"Hasil produksi batch #{batch.id}",
                    movement_at=batch.created_at,
                    created_by=request.user,
                    updated_by=request.user,
                )

            output = self.get_serializer(batch)
            headers = self.get_success_headers(output.data)
            return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)
        except ValueError as exc:
            return Response(
                {"detail": str(exc), "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
