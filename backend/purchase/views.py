from collections import defaultdict
from datetime import date, datetime, time
from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum, Value
from django.db.models.functions import Cast, Coalesce
from django.http import FileResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from account.api_responses import success_response
from account.pagination import StandardResultsSetPagination
from account.permissions import (
    CustomerAccess,
    CustomerSpecialPriceAccess,
    IsOwner,
    PurchaseInOrderAccess,
    SalesOrderAccess,
    SalesRevenueReportAccess,
)
from account.upload_validation import upload_validation_error_response, validate_uploaded_file
from expenses.reporting import opex_total_for_range
from inventory.models import (
    IngredientInventory,
    IngredientStockMovement,
    Product,
    ProductStockMovement,
    StockMovementType,
)
from inventory.product_stock import weighted_moving_average
from payroll.costing import production_labor_for_range

from .filters import (
    CustomerFilter,
    CustomerProductPriceFilter,
    PurchaseInOrderFilter,
    SalesOrderFilter,
)
from .invoice_pdf import build_sales_order_invoice_pdf
from .models import (
    Customer,
    CustomerProductPrice,
    OrderStatus,
    PurchaseInOrder,
    SalesOrder,
    SalesOrderLine,
    Wilayah,
)
from .receipt_pdf import build_sales_order_receipt_pdf
from .serializers import (
    CustomerProductPriceSerializer,
    CustomerSerializer,
    PurchaseInOrderSerializer,
    SalesOrderSerializer,
    WilayahSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [CustomerAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = CustomerFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "phone", "address", "notes", "wilayah__name"]
    ordering_fields = ["name", "wilayah__name"]
    ordering = ["name"]

    def get_queryset(self):
        return Customer.objects.select_related("wilayah", "created_by", "updated_by")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class WilayahViewSet(viewsets.ModelViewSet):
    serializer_class = WilayahSerializer
    permission_classes = [CustomerAccess]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Wilayah.objects.select_related("created_by", "updated_by")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class CustomerProductPriceViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerProductPriceSerializer
    permission_classes = [CustomerSpecialPriceAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = CustomerProductPriceFilter
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ["updated_at", "selling_price_idr", "customer__name"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return CustomerProductPrice.objects.select_related(
            "customer",
            "product_packaging__product",
            "created_by",
            "updated_by",
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class PurchaseInOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseInOrderSerializer
    permission_classes = [PurchaseInOrderAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = PurchaseInOrderFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["order_code", "invoice_number", "notes"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return PurchaseInOrder.objects.select_related(
            "created_by",
            "updated_by",
            "verified_by",
        ).prefetch_related("lines__ingredient_inventory__ingredient")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status not in (OrderStatus.DRAFT, OrderStatus.CANCELLED):
            return Response(
                {"detail": "Hanya order draft atau cancelled yang dapat dihapus.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="upload-payment-proof",
    )
    def upload_payment_proof(self, request, pk=None):
        order = self.get_object()
        if order.status == OrderStatus.VERIFIED:
            return Response(
                {"detail": "Order sudah diverifikasi.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == OrderStatus.CANCELLED:
            return Response(
                {"detail": "Order dibatalkan.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get("payment_proof")
        if not upload:
            return Response(
                {"detail": "Field payment_proof (file) wajib diisi.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_uploaded_file(upload, field_name="payment_proof")
        except ValidationError as exc:
            return upload_validation_error_response(exc)
        order.payment_proof = upload
        order.payment_proof_uploaded_at = timezone.now()
        order.status = OrderStatus.PAYMENT_PROOF_UPLOADED
        order.updated_by = request.user
        order.save(update_fields=["payment_proof", "payment_proof_uploaded_at", "status", "updated_by", "updated_at"])
        return Response(PurchaseInOrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsOwner], url_path="verify")
    @transaction.atomic
    def verify(self, request, pk=None):
        order = PurchaseInOrder.objects.select_for_update().get(pk=self.get_object().pk)
        if order.status == OrderStatus.VERIFIED:
            return Response({"detail": "Sudah diverifikasi.", "code": "validation_error"}, status=status.HTTP_400_BAD_REQUEST)
        if order.status == OrderStatus.CANCELLED:
            return Response({"detail": "Order dibatalkan.", "code": "validation_error"}, status=status.HTTP_400_BAD_REQUEST)
        if order.status not in (OrderStatus.PAYMENT_PROOF_UPLOADED, OrderStatus.AWAITING_PAYMENT):
            return Response(
                {"detail": "Status harus awaiting payment atau payment proof uploaded.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == OrderStatus.AWAITING_PAYMENT and not order.payment_proof:
            return Response(
                {"detail": "Unggah bukti pembayaran terlebih dahulu.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        for line in order.lines.select_related("ingredient_inventory__ingredient").all():
            inv = (
                IngredientInventory.objects.select_for_update()
                .select_related("ingredient")
                .get(pk=line.ingredient_inventory_id)
            )
            inv.avg_cost_idr = weighted_moving_average(
                old_qty=inv.remaining_stock,
                old_avg_unit_cost=inv.avg_cost_idr,
                add_qty=line.quantity,
                add_total_cost=Decimal(str(line.quantity)) * Decimal(str(line.unit_cost_idr)),
            )
            inv.remaining_stock = inv.remaining_stock + line.quantity
            inv.updated_by = request.user
            inv.save(update_fields=["remaining_stock", "avg_cost_idr", "updated_by", "updated_at"])
            IngredientStockMovement.objects.create(
                ingredient_inventory=inv,
                movement_type=StockMovementType.IN,
                quantity=line.quantity,
                unit_cost_idr=line.unit_cost_idr,
                note=f"Terima pembelian {order.order_code}",
                movement_at=now,
                created_by=request.user,
                updated_by=request.user,
            )
        order.status = OrderStatus.VERIFIED
        order.verified_at = now
        order.verified_by = request.user
        order.updated_by = request.user
        order.save(update_fields=["status", "verified_at", "verified_by", "updated_by", "updated_at"])
        return Response(PurchaseInOrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == OrderStatus.VERIFIED:
            return Response({"detail": "Order terverifikasi tidak dapat dibatalkan.", "code": "validation_error"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = OrderStatus.CANCELLED
        order.updated_by = request.user
        order.save(update_fields=["status", "updated_by", "updated_at"])
        return Response(PurchaseInOrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)


class SalesRevenueReportView(APIView):
    """Aggregated revenue from verified sales orders in a date range (by verified_at)."""

    permission_classes = [SalesRevenueReportAccess]

    def get(self, request):
        raw_start = (request.query_params.get("start_date") or "").strip()
        raw_end = (request.query_params.get("end_date") or "").strip()
        if not raw_start or not raw_end:
            return Response(
                {
                    "detail": "Query param 'start_date' dan 'end_date' wajib diisi (YYYY-MM-DD).",
                    "code": "validation_error",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            start_d = date.fromisoformat(raw_start)
            end_d = date.fromisoformat(raw_end)
        except ValueError:
            return Response(
                {"detail": "Format tanggal tidak valid.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_d > end_d:
            return Response(
                {"detail": "start_date tidak boleh lebih besar dari end_date.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(datetime.combine(start_d, time.min), tz)
        end_dt = timezone.make_aware(datetime.combine(end_d, time.max), tz)

        base_qs = SalesOrder.objects.filter(
            status=OrderStatus.VERIFIED,
            verified_at__gte=start_dt,
            verified_at__lte=end_dt,
        )

        summary = base_qs.aggregate(
            verified_order_count=Count("id"),
            total_revenue_idr=Coalesce(Sum("total_idr"), Value(0)),
            total_subtotal_idr=Coalesce(Sum("subtotal_idr"), Value(0)),
            total_tax_idr=Coalesce(Sum("tax_amount_idr"), Value(0)),
        )

        by_customer = list(
            base_qs.values("customer_id", "customer__name")
            .annotate(
                orders=Count("id"),
                revenue_idr=Coalesce(Sum("total_idr"), Value(0)),
            )
            .order_by("-revenue_idr")
        )

        line_qs = SalesOrderLine.objects.filter(order__in=base_qs).select_related(
            "product_packaging__product",
        )
        # quantity is Decimal; unit_price_idr is integer — cast price before multiply (Django 6 ORM).
        qty_field = DecimalField(max_digits=12, decimal_places=3)
        money_dec = DecimalField(max_digits=24, decimal_places=3)
        zero_qty = Value(Decimal("0"), output_field=qty_field)
        zero_idr = Value(Decimal("0"), output_field=money_dec)
        line_revenue_expr = ExpressionWrapper(
            F("quantity") * Cast(F("unit_price_idr"), DecimalField(max_digits=24, decimal_places=0)),
            output_field=money_dec,
        )
        by_packaging = list(
            line_qs.values(
                "product_packaging_id",
                "product_packaging__label",
                "product_packaging__product__variant_name",
            )
            .annotate(
                total_quantity=Coalesce(Sum("quantity"), zero_qty),
                revenue_idr=Coalesce(Sum(line_revenue_expr), zero_idr),
            )
            .order_by("-revenue_idr")
        )

        payload = {
            "start_date": start_d.isoformat(),
            "end_date": end_d.isoformat(),
            "summary": summary,
            "by_customer": by_customer,
            "by_packaging": by_packaging,
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=payload))


def _to_int_idr(value) -> int:
    return int(Decimal(str(value or 0)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class HppProfitReportView(APIView):
    """Owner P&L: revenue - HPP (material + production labor) = gross; - OPEX = net."""

    permission_classes = [IsOwner]

    def get(self, request):
        raw_start = (request.query_params.get("start_date") or "").strip()
        raw_end = (request.query_params.get("end_date") or "").strip()
        if not raw_start or not raw_end:
            return Response(
                {
                    "detail": "Query param 'start_date' dan 'end_date' wajib diisi (YYYY-MM-DD).",
                    "code": "validation_error",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            start_d = date.fromisoformat(raw_start)
            end_d = date.fromisoformat(raw_end)
        except ValueError:
            return Response(
                {"detail": "Format tanggal tidak valid.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_d > end_d:
            return Response(
                {"detail": "start_date tidak boleh lebih besar dari end_date.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(datetime.combine(start_d, time.min), tz)
        end_dt = timezone.make_aware(datetime.combine(end_d, time.max), tz)

        base_qs = SalesOrder.objects.filter(
            status=OrderStatus.VERIFIED,
            verified_at__gte=start_dt,
            verified_at__lte=end_dt,
        )
        line_qs = SalesOrderLine.objects.filter(order__in=base_qs).select_related(
            "product_packaging__product",
        )

        money_dec = DecimalField(max_digits=24, decimal_places=3)
        kg_dec = DecimalField(max_digits=20, decimal_places=6)
        zero_idr = Value(Decimal("0"), output_field=money_dec)
        zero_kg = Value(Decimal("0"), output_field=kg_dec)
        line_revenue_expr = ExpressionWrapper(
            F("quantity") * Cast(F("unit_price_idr"), DecimalField(max_digits=24, decimal_places=0)),
            output_field=money_dec,
        )
        line_kg_expr = ExpressionWrapper(
            F("quantity") * F("product_packaging__net_mass_kg"),
            output_field=kg_dec,
        )

        by_variant_rows = list(
            line_qs.values(
                "product_packaging__product_id",
                "product_packaging__product__variant_name",
            )
            .annotate(
                revenue_idr=Coalesce(Sum(line_revenue_expr), zero_idr),
                cogs_material_idr=Coalesce(Sum("cogs_material_idr"), Value(0)),
                kg=Coalesce(Sum(line_kg_expr), zero_kg),
            )
            .order_by("-revenue_idr")
        )

        revenue = sum((Decimal(str(r["revenue_idr"])) for r in by_variant_rows), Decimal("0"))
        material_cogs = sum(
            (Decimal(str(r["cogs_material_idr"] or 0)) for r in by_variant_rows), Decimal("0")
        )
        kg_sold = sum((Decimal(str(r["kg"])) for r in by_variant_rows), Decimal("0"))

        labor = production_labor_for_range(start_d, end_d)
        labor_kupas = labor["kupas_idr"]
        labor_daily_prod = labor["daily_production_idr"]
        labor_nonprod = labor["daily_nonproduction_idr"]
        labor_hpp = labor_kupas + labor_daily_prod

        cogs_total = material_cogs + labor_hpp
        gross_profit = revenue - cogs_total

        opex_expenses = Decimal(str(opex_total_for_range(start_d, end_d)))
        opex_total = opex_expenses + labor_nonprod
        net_profit = gross_profit - opex_total

        hpp_per_kg = (cogs_total / kg_sold) if kg_sold > 0 else Decimal("0")

        # Per-variant HPP: material COGS is exact per variant; production labor is
        # allocated across variants by kg share (period-level, flagged in the UI).
        by_variant = []
        for r in by_variant_rows:
            v_kg = Decimal(str(r["kg"]))
            v_material = Decimal(str(r["cogs_material_idr"] or 0))
            allocated_labor = (labor_hpp * v_kg / kg_sold) if kg_sold > 0 else Decimal("0")
            v_hpp = v_material + allocated_labor
            by_variant.append(
                {
                    "product_id": r["product_packaging__product_id"],
                    "variant_name": r["product_packaging__product__variant_name"],
                    "kg": str(v_kg.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)),
                    "revenue_idr": _to_int_idr(r["revenue_idr"]),
                    "cogs_material_idr": _to_int_idr(v_material),
                    "allocated_labor_idr": _to_int_idr(allocated_labor),
                    "hpp_idr": _to_int_idr(v_hpp),
                    "gross_profit_idr": _to_int_idr(Decimal(str(r["revenue_idr"])) - v_hpp),
                }
            )

        payload = {
            "start_date": start_d.isoformat(),
            "end_date": end_d.isoformat(),
            "verified_order_count": base_qs.count(),
            "kg_sold": str(kg_sold.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)),
            "revenue_idr": _to_int_idr(revenue),
            "cogs": {
                "material_idr": _to_int_idr(material_cogs),
                "labor_kupas_idr": _to_int_idr(labor_kupas),
                "labor_daily_production_idr": _to_int_idr(labor_daily_prod),
                "total_idr": _to_int_idr(cogs_total),
            },
            "gross_profit_idr": _to_int_idr(gross_profit),
            "opex": {
                "expenses_idr": _to_int_idr(opex_expenses),
                "labor_nonproduction_idr": _to_int_idr(labor_nonprod),
                "total_idr": _to_int_idr(opex_total),
            },
            "net_profit_idr": _to_int_idr(net_profit),
            "hpp_per_kg_idr": _to_int_idr(hpp_per_kg),
            "by_variant": by_variant,
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=payload))


class SalesOrderViewSet(viewsets.ModelViewSet):
    serializer_class = SalesOrderSerializer
    permission_classes = [SalesOrderAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = SalesOrderFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["order_code", "invoice_number", "notes", "customer__name"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return SalesOrder.objects.select_related(
            "customer__wilayah",
            "created_by",
            "updated_by",
            "verified_by",
        ).prefetch_related("lines__product_packaging__product")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status not in (OrderStatus.DRAFT, OrderStatus.CANCELLED):
            return Response(
                {"detail": "Hanya order draft atau cancelled yang dapat dihapus.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="upload-payment-proof",
    )
    def upload_payment_proof(self, request, pk=None):
        order = self.get_object()
        if order.status == OrderStatus.VERIFIED:
            return Response(
                {"detail": "Order sudah diverifikasi.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == OrderStatus.CANCELLED:
            return Response(
                {"detail": "Order dibatalkan.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get("payment_proof")
        if not upload:
            return Response(
                {"detail": "Field payment_proof (file) wajib diisi.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_uploaded_file(upload, field_name="payment_proof")
        except ValidationError as exc:
            return upload_validation_error_response(exc)
        order.payment_proof = upload
        order.payment_proof_uploaded_at = timezone.now()
        order.status = OrderStatus.PAYMENT_PROOF_UPLOADED
        order.updated_by = request.user
        order.save(update_fields=["payment_proof", "payment_proof_uploaded_at", "status", "updated_by", "updated_at"])
        return Response(SalesOrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="invoice-pdf")
    def invoice_pdf(self, request, pk=None):
        order = self.get_object()
        if order.status == OrderStatus.CANCELLED:
            return Response(
                {"detail": "Tidak dapat membuat invoice untuk order yang dibatalkan.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pdf_buffer = build_sales_order_invoice_pdf(order)
        filename = f"{order.order_code}-invoice.pdf"
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

    @action(detail=True, methods=["get"], url_path="receipt-pdf")
    def receipt_pdf(self, request, pk=None):
        """Bon/Faktur receipt (15x10.5 cm) for the Epson LQ printer.

        Query param ``mode``: ``preprinted`` (default) prints values only to
        overlay the existing pre-printed pad; ``full`` prints the whole form.
        """
        order = self.get_object()
        if order.status == OrderStatus.CANCELLED:
            return Response(
                {"detail": "Tidak dapat membuat nota untuk order yang dibatalkan.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mode = (request.query_params.get("mode") or "preprinted").strip().lower()
        if mode not in ("preprinted", "full"):
            return Response(
                {"detail": "Parameter 'mode' harus 'preprinted' atau 'full'.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pdf_buffer = build_sales_order_receipt_pdf(order, mode=mode)
        filename = f"{order.order_code}-nota-{mode}.pdf"
        return FileResponse(
            pdf_buffer,
            as_attachment=False,
            filename=filename,
            content_type="application/pdf",
        )

    @action(detail=True, methods=["post"], permission_classes=[IsOwner], url_path="verify")
    @transaction.atomic
    def verify(self, request, pk=None):
        order = SalesOrder.objects.select_for_update().get(pk=self.get_object().pk)
        if order.status == OrderStatus.VERIFIED:
            return Response({"detail": "Sudah diverifikasi.", "code": "validation_error"}, status=status.HTTP_400_BAD_REQUEST)
        if order.status == OrderStatus.CANCELLED:
            return Response({"detail": "Order dibatalkan.", "code": "validation_error"}, status=status.HTTP_400_BAD_REQUEST)
        if order.status not in (OrderStatus.PAYMENT_PROOF_UPLOADED, OrderStatus.AWAITING_PAYMENT):
            return Response(
                {"detail": "Status harus awaiting payment atau payment proof uploaded.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == OrderStatus.AWAITING_PAYMENT and not order.payment_proof:
            return Response(
                {"detail": "Unggah bukti pembayaran terlebih dahulu.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        lines = list(order.lines.select_related("product_packaging__product").all())
        mass_by_product: defaultdict[int, Decimal] = defaultdict(Decimal)
        for line in lines:
            packaging = line.product_packaging
            line_mass = (
                Decimal(str(line.quantity)) * Decimal(str(packaging.net_mass_kg)) * Decimal("1000")
            )
            mass_by_product[packaging.product_id] += line_mass

        products_locked: dict[int, Product] = {
            pid: Product.objects.select_for_update().get(pk=pid)
            for pid in sorted(mass_by_product.keys())
        }

        for pid, need in mass_by_product.items():
            prod = products_locked[pid]
            available = prod.remaining_mass_grams or Decimal("0")
            if available < need:
                return Response(
                    {
                        "detail": (
                            f"Stok utama tidak cukup untuk varian «{prod.variant_name}»: "
                            f"butuh {need} g, tersedia {available} g."
                        ),
                        "code": "validation_error",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        for pid, need in mass_by_product.items():
            prod = products_locked[pid]
            prod.remaining_mass_grams = (prod.remaining_mass_grams or Decimal("0")) - need
            prod.updated_by = request.user
            prod.save(update_fields=["remaining_mass_grams", "updated_by", "updated_at"])

        for line in lines:
            packaging = line.product_packaging
            line_mass = (
                Decimal(str(line.quantity)) * Decimal(str(packaging.net_mass_kg)) * Decimal("1000")
            )
            prod = products_locked[packaging.product_id]
            avg_cost_per_kg = Decimal(str(prod.avg_cost_per_kg_idr or 0))
            cogs = int(
                (line_mass * avg_cost_per_kg / Decimal("1000")).quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )
            line.cogs_material_idr = cogs
            line.updated_by = request.user
            line.save(update_fields=["cogs_material_idr", "updated_by", "updated_at"])
            ProductStockMovement.objects.create(
                product=packaging.product,
                product_packaging=packaging,
                movement_type=StockMovementType.OUT,
                mass_grams=line_mass,
                bonus_mass_grams=Decimal("0"),
                unit_cost_per_kg_idr=avg_cost_per_kg,
                note=f"Pengiriman penjualan {order.order_code}",
                movement_at=now,
                created_by=request.user,
                updated_by=request.user,
            )
        order.status = OrderStatus.VERIFIED
        order.verified_at = now
        order.verified_by = request.user
        order.updated_by = request.user
        order.save(update_fields=["status", "verified_at", "verified_by", "updated_by", "updated_at"])
        return Response(SalesOrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == OrderStatus.VERIFIED:
            return Response({"detail": "Order terverifikasi tidak dapat dibatalkan.", "code": "validation_error"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = OrderStatus.CANCELLED
        order.updated_by = request.user
        order.save(update_fields=["status", "updated_by", "updated_at"])
        return Response(SalesOrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)
