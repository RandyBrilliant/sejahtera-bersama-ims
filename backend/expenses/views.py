import csv
from datetime import date

from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from account.api_responses import success_response
from account.pagination import StandardResultsSetPagination
from account.permissions import FinanceAccess

from .filters import OperationalCashEntryFilter, OperationalCategoryFilter
from .models import OperationalCashEntry, OperationalCategory
from .report_pdf import build_operational_cash_report_pdf
from .reporting import (
    aggregate_summary,
    by_category_rows,
    by_day_rows,
    entries_for_json,
    entries_queryset_for_range,
    linked_breakdown,
)
from .serializers import OperationalCashEntrySerializer, OperationalCategorySerializer


def _parse_date_range(request):
    raw_start = (request.query_params.get("start_date") or "").strip()
    raw_end = (request.query_params.get("end_date") or "").strip()
    if not raw_start or not raw_end:
        return None, None, Response(
            {
                "detail": "Query param 'start_date' dan 'end_date' wajib (YYYY-MM-DD).",
                "code": "validation_error",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        start_d = date.fromisoformat(raw_start)
        end_d = date.fromisoformat(raw_end)
    except ValueError:
        return None, None, Response(
            {"detail": "Format tanggal tidak valid.", "code": "validation_error"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if start_d > end_d:
        return None, None, Response(
            {"detail": "start_date tidak boleh lebih besar dari end_date.", "code": "validation_error"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return start_d, end_d, None


def _format_idr_cell(n) -> str:
    s = f"{int(n):,}".replace(",", ".")
    return f"Rp {s}"


class AuditTrailMixin:
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class OperationalCategoryViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = OperationalCategorySerializer
    permission_classes = [FinanceAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = OperationalCategoryFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["name", "sort_order", "entry_kind", "created_at", "updated_at"]
    ordering = ["entry_kind", "sort_order", "name"]

    def get_queryset(self):
        return OperationalCategory.objects.select_related("created_by", "updated_by")


class OperationalCashEntryViewSet(AuditTrailMixin, viewsets.ModelViewSet):
    serializer_class = OperationalCashEntrySerializer
    permission_classes = [FinanceAccess]
    pagination_class = StandardResultsSetPagination
    filterset_class = OperationalCashEntryFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["description", "reference", "category__name", "sales_order__order_code", "purchase_in_order__order_code"]
    ordering_fields = ["occurred_on", "amount_idr", "direction", "created_at", "updated_at"]
    ordering = ["-occurred_on", "-id"]

    def get_queryset(self):
        return OperationalCashEntry.objects.select_related(
            "category",
            "sales_order",
            "purchase_in_order",
            "created_by",
            "updated_by",
        )

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="upload-attachment",
    )
    def upload_attachment(self, request, pk=None):
        entry = self.get_object()
        upload = request.FILES.get("attachment")
        if not upload:
            return Response(
                {"detail": "Field attachment (file) wajib diisi.", "code": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entry.attachment = upload
        entry.updated_by = request.user
        entry.save(update_fields=["attachment", "updated_by", "updated_at"])
        return Response(
            OperationalCashEntrySerializer(entry, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class OperationalCashSummaryView(APIView):
    """Aggregated pemasukan vs pengeluaran for a date range."""

    permission_classes = [FinanceAccess]

    def get(self, request):
        start_d, end_d, err = _parse_date_range(request)
        if err:
            return err
        qs = entries_queryset_for_range(start_d, end_d)
        income, expense, net = aggregate_summary(qs)
        by_category = by_category_rows(qs)
        payload = {
            "start_date": start_d.isoformat(),
            "end_date": end_d.isoformat(),
            "income": income,
            "expense": expense,
            "net_cash_idr": net,
            "by_category": by_category,
        }
        return Response(status=status.HTTP_200_OK, data=success_response(data=payload))


class OperationalCashReportView(APIView):
    """
    Full operational cash report for a date range.
    Query: start_date, end_date (required); format=json|csv|pdf (default json).
    """

    permission_classes = [FinanceAccess]

    def get(self, request):
        start_d, end_d, err = _parse_date_range(request)
        if err:
            return err
        fmt = (request.query_params.get("format") or "json").lower().strip()
        qs = entries_queryset_for_range(start_d, end_d)
        income, expense, net = aggregate_summary(qs)
        by_category = by_category_rows(qs)
        by_day = by_day_rows(qs)
        linked = linked_breakdown(qs)

        if fmt == "json":
            entries = entries_for_json(qs, limit=500)
            payload = {
                "start_date": start_d.isoformat(),
                "end_date": end_d.isoformat(),
                "income": income,
                "expense": expense,
                "net_cash_idr": net,
                "by_category": by_category,
                "by_day": by_day,
                "linked_breakdown": linked,
                "entries": entries,
            }
            return Response(status=status.HTTP_200_OK, data=success_response(data=payload))

        if fmt == "csv":
            response = HttpResponse(content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = (
                f'attachment; filename="operational-cash-{start_d.isoformat()}_{end_d.isoformat()}.csv"'
            )
            response.write("\ufeff")
            writer = csv.writer(response)
            writer.writerow(
                [
                    "id",
                    "occurred_on",
                    "direction",
                    "category",
                    "amount_idr",
                    "description",
                    "reference",
                    "sales_order_code",
                    "purchase_in_order_code",
                    "created_by_username",
                ]
            )
            for e in qs.iterator(chunk_size=500):
                writer.writerow(
                    [
                        e.id,
                        e.occurred_on.isoformat(),
                        e.direction,
                        e.category.name,
                        e.amount_idr,
                        e.description.replace("\r\n", " ").replace("\n", " "),
                        e.reference or "",
                        e.sales_order.order_code if e.sales_order_id else "",
                        e.purchase_in_order.order_code if e.purchase_in_order_id else "",
                        e.created_by.username if e.created_by_id else "",
                    ]
                )
            return response

        if fmt == "pdf":
            summary_rows = [
                ["Periode", f"{start_d.isoformat()} s/d {end_d.isoformat()}"],
                ["Total pemasukan", _format_idr_cell(int(income["total_idr"] or 0))],
                ["Baris pemasukan", str(income["line_count"])],
                ["Total pengeluaran", _format_idr_cell(int(expense["total_idr"] or 0))],
                ["Baris pengeluaran", str(expense["line_count"])],
                ["Net kas", _format_idr_cell(net)],
            ]
            day_table = [["Tanggal", "Pemasukan", "Pengeluaran", "Net"]]
            for d in by_day:
                day_table.append(
                    [
                        d["occurred_on"],
                        _format_idr_cell(d["income_idr"]),
                        _format_idr_cell(d["expense_idr"]),
                        _format_idr_cell(d["net_idr"]),
                    ]
                )
            entry_table = [["Tanggal", "Arah", "Kategori", "Jumlah", "Keterangan + tautan"]]
            for e in qs[:200]:
                bits = []
                if e.reference:
                    bits.append(f"Ref: {e.reference}")
                if e.sales_order_id:
                    bits.append(f"SO:{e.sales_order.order_code}")
                if e.purchase_in_order_id:
                    bits.append(f"PI:{e.purchase_in_order.order_code}")
                tail = " | ".join(bits)
                desc = e.description.replace("\n", " ")[:80]
                if tail:
                    desc = f"{desc} ({tail})" if desc else tail
                entry_table.append(
                    [
                        e.occurred_on.isoformat(),
                        e.direction,
                        e.category.name[:28],
                        _format_idr_cell(e.amount_idr),
                        desc[:200],
                    ]
                )
            title = f"Laporan kas operasional {start_d} — {end_d}"
            pdf_buf = build_operational_cash_report_pdf(title, summary_rows, day_table, entry_table, max_entries=150)
            return FileResponse(
                pdf_buf,
                as_attachment=True,
                filename=f"operational-cash-{start_d.isoformat()}-{end_d.isoformat()}.pdf",
                content_type="application/pdf",
            )

        return Response(
            {"detail": "Parameter format harus json, csv, atau pdf.", "code": "validation_error"},
            status=status.HTTP_400_BAD_REQUEST,
        )
