from datetime import date
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum, Value
from django.db.models.functions import Coalesce
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
    ProductPackagingFilter,
    ProductStockMovementFilter,
    ProductionBatchFilter,
)
from .models import (
    Ingredient,
    IngredientInventory,
    IngredientStockMovement,
    Product,
    ProductPackaging,
    ProductStockMovement,
    ProductionBatch,
    ProductionIngredientUsage,
    ProductionPackagingOutput,
    StockMovementType,
)
from .serializers import (
    IngredientInventorySerializer,
    IngredientSerializer,
    IngredientStockMovementSerializer,
    ProductPackagingSerializer,
    ProductSerializer,
    ProductStockMovementSerializer,
    ProductionBatchSerializer,
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
    ordering_fields = ["name", "variant_name", "created_at", "updated_at"]
    ordering = ["variant_name"]

    def get_queryset(self):
        return Product.objects.select_related("created_by", "updated_by")

    @action(detail=True, methods=["get"], url_path="packaging-summary")
    def packaging_summary(self, request, pk=None):
        product = self.get_object()
        aggregates = product.packaging_variants.aggregate(
            total_packaging=Count("id"),
            active_packaging=Count("id", filter=models.Q(is_active=True)),
            total_stock=Coalesce(Sum("remaining_stock"), Value(0)),
            stock_value_idr=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("remaining_stock") * F("base_price_idr"),
                        output_field=DecimalField(max_digits=24, decimal_places=3),
                    )
                ),
                Value(0),
            ),
        )
        return Response(status=status.HTTP_200_OK, data=success_response(data=aggregates))


class ProductPackagingViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = ProductPackagingSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = ProductPackagingFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["label", "sku", "product__name", "product__variant_name"]
    ordering_fields = [
        "label",
        "net_mass_grams",
        "remaining_stock",
        "base_price_idr",
        "created_at",
        "updated_at",
    ]
    ordering = ["product__variant_name", "net_mass_grams"]

    def get_queryset(self):
        return ProductPackaging.objects.select_related("product", "created_by", "updated_by")


class IngredientViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = IngredientSerializer
    permission_classes = [InventoryAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = IngredientFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at", "updated_at"]
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
    ordering_fields = ["remaining_stock", "minimum_stock", "created_at", "updated_at"]
    ordering = ["ingredient__name"]

    def get_queryset(self):
        return IngredientInventory.objects.select_related(
            "ingredient",
            "created_by",
            "updated_by",
        )


class InventorySummaryView(APIView):
    permission_classes = [InventoryAccess]

    def get(self, request):
        product_aggregates = ProductPackaging.objects.aggregate(
            total_packaging=Count("id"),
            active_packaging=Count("id", filter=models.Q(is_active=True)),
            total_product_stock=Coalesce(Sum("remaining_stock"), Value(0)),
            total_product_stock_value_idr=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("remaining_stock") * F("base_price_idr"),
                        output_field=DecimalField(max_digits=24, decimal_places=3),
                    )
                ),
                Value(0),
            ),
        )
        ingredient_aggregates = IngredientInventory.objects.aggregate(
            total_ingredient_items=Count("id"),
            low_stock_items=Count("id", filter=models.Q(remaining_stock__lt=F("minimum_stock"))),
            total_ingredient_stock=Coalesce(Sum("remaining_stock"), Value(0)),
        )
        payload = {"products": product_aggregates, "ingredients": ingredient_aggregates}
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
            .annotate(total_used=Coalesce(Sum("quantity_used"), Value(0)))
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
                total_produced=Coalesce(Sum("quantity_produced"), Value(0)),
                total_bonus=Coalesce(Sum("bonus_quantity"), Value(0)),
                total_output=Coalesce(Sum(F("quantity_produced") + F("bonus_quantity")), Value(0)),
                estimated_value_idr=Coalesce(
                    Sum(
                        ExpressionWrapper(
                            (F("quantity_produced") + F("bonus_quantity")) * F("product_packaging__base_price_idr"),
                            output_field=DecimalField(max_digits=24, decimal_places=3),
                        )
                    ),
                    Value(0),
                ),
            )
            .order_by("product_packaging__product__variant_name", "product_packaging__label")
        )

        ingredient_summary = ProductionIngredientUsage.objects.filter(batch__production_date=recap_date).aggregate(
            total_ingredients_used=Coalesce(Sum("quantity_used"), Value(0)),
        )
        packaging_summary = ProductionPackagingOutput.objects.filter(batch__production_date=recap_date).aggregate(
            total_packages_produced=Coalesce(Sum("quantity_produced"), Value(0)),
            total_bonus_packages=Coalesce(Sum("bonus_quantity"), Value(0)),
            total_packages_output=Coalesce(Sum(F("quantity_produced") + F("bonus_quantity")), Value(0)),
            estimated_production_value_idr=Coalesce(
                Sum(
                    ExpressionWrapper(
                        (F("quantity_produced") + F("bonus_quantity")) * F("product_packaging__base_price_idr"),
                        output_field=DecimalField(max_digits=24, decimal_places=3),
                    )
                ),
                Value(0),
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
            .annotate(total_used=Coalesce(Sum("quantity_used"), Value(0)))
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
                total_produced=Coalesce(Sum("quantity_produced"), Value(0)),
                total_bonus=Coalesce(Sum("bonus_quantity"), Value(0)),
                total_output=Coalesce(Sum(F("quantity_produced") + F("bonus_quantity")), Value(0)),
                estimated_value_idr=Coalesce(
                    Sum(
                        ExpressionWrapper(
                            (F("quantity_produced") + F("bonus_quantity")) * F("product_packaging__base_price_idr"),
                            output_field=DecimalField(max_digits=24, decimal_places=3),
                        )
                    ),
                    Value(0),
                ),
            )
            .order_by("product_packaging__product__variant_name", "product_packaging__label")
        )

        ingredient_summary = ingredient_base_qs.aggregate(
            total_ingredients_used=Coalesce(Sum("quantity_used"), Value(0)),
        )
        packaging_summary = packaging_base_qs.aggregate(
            total_packages_produced=Coalesce(Sum("quantity_produced"), Value(0)),
            total_bonus_packages=Coalesce(Sum("bonus_quantity"), Value(0)),
            total_packages_output=Coalesce(Sum(F("quantity_produced") + F("bonus_quantity")), Value(0)),
            estimated_production_value_idr=Coalesce(
                Sum(
                    ExpressionWrapper(
                        (F("quantity_produced") + F("bonus_quantity")) * F("product_packaging__base_price_idr"),
                        output_field=DecimalField(max_digits=24, decimal_places=3),
                    )
                ),
                Value(0),
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
    ordering_fields = ["movement_at", "created_at", "quantity"]
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
    search_fields = ["product_packaging__product__variant_name", "product_packaging__label", "note"]
    ordering_fields = ["movement_at", "created_at", "quantity", "bonus_quantity"]
    ordering = ["-movement_at"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return ProductStockMovement.objects.select_related(
            "product_packaging__product",
            "created_by",
            "updated_by",
        )

    @transaction.atomic
    def perform_create(self, serializer):
        movement = serializer.validated_data["movement_type"]
        qty = serializer.validated_data["quantity"]
        bonus_qty = serializer.validated_data.get("bonus_quantity") or Decimal("0")
        packaging = (
            ProductPackaging.objects.select_for_update()
            .select_related("product")
            .get(pk=serializer.validated_data["product_packaging"].pk)
        )

        if movement == StockMovementType.OUT and packaging.remaining_stock < qty:
            raise ValueError("Stok produk tidak mencukupi untuk stock out.")

        if movement == StockMovementType.OUT and bonus_qty > 0:
            raise ValueError("Bonus quantity hanya untuk stock in.")

        delta = (qty + bonus_qty) if movement == StockMovementType.IN else -qty
        packaging.remaining_stock = packaging.remaining_stock + delta
        packaging.updated_by = self.request.user
        packaging.save(update_fields=["remaining_stock", "updated_by", "updated_at"])

        serializer.save(
            product_packaging=packaging,
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

            for row in packaging_outputs:
                packaging = ProductPackaging.objects.select_for_update().get(pk=row["product_packaging"].pk)
                quantity_produced = row["quantity_produced"]
                bonus_quantity = row.get("bonus_quantity") or Decimal("0")

                total_in = quantity_produced + bonus_quantity
                packaging.remaining_stock = packaging.remaining_stock + total_in
                packaging.updated_by = request.user
                packaging.save(update_fields=["remaining_stock", "updated_by", "updated_at"])

                ProductionPackagingOutput.objects.create(
                    batch=batch,
                    product_packaging=packaging,
                    quantity_produced=quantity_produced,
                    bonus_quantity=bonus_quantity,
                )
                ProductStockMovement.objects.create(
                    product_packaging=packaging,
                    movement_type=StockMovementType.IN,
                    quantity=quantity_produced,
                    bonus_quantity=bonus_quantity,
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
