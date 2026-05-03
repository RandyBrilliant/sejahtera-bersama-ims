from datetime import date, datetime, time
from decimal import Decimal

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
from inventory.models import (
    IngredientInventory,
    IngredientStockMovement,
    ProductPackaging,
    ProductStockMovement,
    StockMovementType,
)

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
)
from .serializers import (
    CustomerProductPriceSerializer,
    CustomerSerializer,
    PurchaseInOrderSerializer,
    SalesOrderSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [CustomerAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = CustomerFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "company_name", "phone", "email", "tax_id"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Customer.objects.select_related("created_by", "updated_by")

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
    search_fields = ["order_code", "supplier_name", "invoice_number", "notes"]
    ordering_fields = ["created_at", "updated_at", "status", "total_idr", "order_code"]
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
            inv.remaining_stock = inv.remaining_stock + line.quantity
            inv.updated_by = request.user
            inv.save(update_fields=["remaining_stock", "updated_by", "updated_at"])
            IngredientStockMovement.objects.create(
                ingredient_inventory=inv,
                movement_type=StockMovementType.IN,
                quantity=line.quantity,
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


class SalesOrderViewSet(viewsets.ModelViewSet):
    serializer_class = SalesOrderSerializer
    permission_classes = [SalesOrderAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = SalesOrderFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["order_code", "invoice_number", "notes", "customer__name"]
    ordering_fields = ["created_at", "updated_at", "status", "total_idr", "order_code"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return SalesOrder.objects.select_related(
            "customer",
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
        locked_packaging = []
        for line in lines:
            packaging = (
                ProductPackaging.objects.select_for_update()
                .select_related("product")
                .get(pk=line.product_packaging_id)
            )
            if packaging.remaining_stock < line.quantity:
                return Response(
                    {
                        "detail": f"Stok tidak cukup untuk {packaging}: butuh {line.quantity}, tersedia {packaging.remaining_stock}.",
                        "code": "validation_error",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            locked_packaging.append((line, packaging))
        for line, packaging in locked_packaging:
            packaging.remaining_stock = packaging.remaining_stock - line.quantity
            packaging.updated_by = request.user
            packaging.save(update_fields=["remaining_stock", "updated_by", "updated_at"])
            ProductStockMovement.objects.create(
                product_packaging=packaging,
                movement_type=StockMovementType.OUT,
                quantity=line.quantity,
                bonus_quantity=Decimal("0"),
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
