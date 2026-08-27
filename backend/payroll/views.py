from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.api_responses import ApiCode, error_response, success_response
from account.models import UserRole
from payroll.kas_sync import delete_loan_item, post_period_gaji_to_cash, save_loan_item
from payroll.models import (
    EmployeeCompensation,
    KupasItem,
    KupasProductionRecord,
    PayCadence,
    PayrollEntry,
    PayrollLoanItem,
    PayrollPeriod,
    PayType,
)
from payroll.permissions import PayrollFinalizeAccess, PayrollManageAccess
from payroll.serializers import (
    EmployeeCompensationSerializer,
    EmployeeCompensationUpdateSerializer,
    KupasItemSerializer,
    KupasProductionRecordSerializer,
    KupasProductionRecordWriteSerializer,
    PayrollEntryAdjustSerializer,
    PayrollEntryPaidOutSerializer,
    PayrollEntrySerializer,
    PayrollLoanItemSerializer,
    PayrollPeriodCreateSerializer,
    PayrollPeriodNotesSerializer,
    PayrollPeriodSerializer,
    PayrollPostGajiToCashSerializer,
)
from payroll.services import (
    PayrollWorkflowError,
    build_payroll_slip_detail,
    finalize_payroll_period,
    generate_payroll_entries,
    unfinalize_payroll_period,
)

User = get_user_model()

_STAFF_ROLES_FOR_PAYROLL = (
    UserRole.ADMIN,
    UserRole.LEADERSHIP,
    UserRole.WAREHOUSE_STAFF,
    UserRole.SALES_STAFF,
    UserRole.FINANCE_STAFF,
    UserRole.KUPAS_STAFF,
)


class EmployeeCompensationTableView(APIView):
    """
    Seluruh staf aktif (+ pimpinan) dengan gaji pokok jika ada — untuk pengelolaan oleh
    pemilik/admin/keuangan (tanpa membuka formulir lengkap akun).
    """

    permission_classes = [PayrollManageAccess]

    def get(self, request):
        users_qs = (
            User.objects.filter(is_active=True, role__in=_STAFF_ROLES_FOR_PAYROLL)
            .select_related("employee_profile")
            .order_by("full_name", "username")
        )

        uid_list = list(users_qs.values_list("pk", flat=True))
        comp_map = {
            ec.user_id: ec
            for ec in EmployeeCompensation.objects.filter(user_id__in=uid_list).select_related("user")
        }

        rows = []
        for u in users_qs:
            emp = getattr(u, "employee_profile", None)
            ec = comp_map.get(u.pk)
            rows.append(
                {
                    "user_id": u.pk,
                    "username": u.username,
                    "full_name": u.full_name,
                    "role": u.role,
                    "employee_code": emp.employee_code if emp else "",
                    "pay_type": ec.pay_type if ec else PayType.DAILY,
                    "pay_cadence": ec.pay_cadence if ec else PayCadence.MONTHLY,
                    "daily_rate_idr": str(ec.daily_rate_idr) if ec else None,
                    "monthly_base_salary_idr": str(ec.monthly_base_salary_idr) if ec else None,
                    "compensation_updated_at": ec.updated_at.isoformat() if ec else None,
                }
            )

        return Response(success_response(data={"results": rows}), status=200)


class EmployeeCompensationByUserView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request, user_id: int):
        obj = EmployeeCompensation.objects.select_related("user").filter(user_id=user_id).first()
        if obj is None:
            return Response(error_response(detail="Data kompensasi belum ada.", code=ApiCode.NOT_FOUND), status=404)
        return Response(success_response(data=EmployeeCompensationSerializer(obj).data), status=200)

    def patch(self, request, user_id: int):
        obj = EmployeeCompensation.objects.filter(user_id=user_id).first()
        if obj is None:
            user = get_object_or_404(User, pk=user_id)
            from payroll.period_week import default_cadence_for_role

            obj = EmployeeCompensation.objects.create(
                user_id=user_id,
                pay_cadence=default_cadence_for_role(user.role),
            )

        us = EmployeeCompensationUpdateSerializer(data=request.data)
        us.is_valid(raise_exception=True)
        data = us.validated_data
        update_fields = ["updated_at"]
        if "pay_type" in data:
            obj.pay_type = data["pay_type"]
            update_fields.append("pay_type")
        if "pay_cadence" in data:
            obj.pay_cadence = data["pay_cadence"]
            update_fields.append("pay_cadence")
        if "daily_rate_idr" in data:
            obj.daily_rate_idr = data["daily_rate_idr"]
            update_fields.append("daily_rate_idr")
        if "monthly_base_salary_idr" in data:
            obj.monthly_base_salary_idr = data["monthly_base_salary_idr"]
            update_fields.append("monthly_base_salary_idr")
        obj.save(update_fields=update_fields)
        return Response(
            success_response(data=EmployeeCompensationSerializer(obj).data, detail="Kompensasi diperbarui."),
            status=200,
        )


class EmployeeCompensationMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obj = EmployeeCompensation.objects.filter(user_id=request.user.pk).first()
        if obj is None:
            return Response(
                success_response(
                    data={
                        "user_id": request.user.pk,
                        "pay_type": None,
                        "pay_cadence": None,
                        "daily_rate_idr": None,
                        "monthly_base_salary_idr": None,
                        "detail": "Belum ada data kompensasi.",
                    },
                ),
                status=200,
            )
        return Response(success_response(data=EmployeeCompensationSerializer(obj).data), status=200)


class KupasItemListCreateView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request):
        active_only = request.query_params.get("active_only", "1") != "0"
        qs = KupasItem.objects.select_related("resulting_ingredient").order_by("name")
        if active_only:
            qs = qs.filter(is_active=True)
        return Response(success_response(data=KupasItemSerializer(qs, many=True).data), status=200)

    def post(self, request):
        ser = KupasItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(
            success_response(data=KupasItemSerializer(obj).data, detail="Jenis kupas dibuat."),
            status=201,
        )


class KupasItemDetailView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request, pk: int):
        obj = get_object_or_404(KupasItem.objects.select_related("resulting_ingredient"), pk=pk)
        return Response(success_response(data=KupasItemSerializer(obj).data), status=200)

    def patch(self, request, pk: int):
        obj = get_object_or_404(KupasItem, pk=pk)
        ser = KupasItemSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(
            success_response(data=KupasItemSerializer(obj).data, detail="Jenis kupas diperbarui."),
            status=200,
        )


class KupasProductionRecordListCreateView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request):
        qs = KupasProductionRecord.objects.select_related("employee", "kupas_item").order_by(
            "-work_date", "employee__full_name"
        )
        work_date = request.query_params.get("work_date")
        employee_id = request.query_params.get("employee_id")
        unpaid_only = request.query_params.get("unpaid_only") == "1"
        if work_date:
            qs = qs.filter(work_date=work_date)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if unpaid_only:
            qs = qs.filter(paid_in_period__isnull=True)
        return Response(success_response(data=KupasProductionRecordSerializer(qs, many=True).data), status=200)

    def post(self, request):
        ser = KupasProductionRecordWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(created_by=request.user)
        obj = KupasProductionRecord.objects.select_related("employee", "kupas_item").get(pk=obj.pk)
        return Response(
            success_response(
                data=KupasProductionRecordSerializer(obj).data,
                detail="Catatan kupas disimpan.",
            ),
            status=201,
        )


class KupasProductionRecordDetailView(APIView):
    permission_classes = [PayrollManageAccess]

    def patch(self, request, pk: int):
        obj = get_object_or_404(
            KupasProductionRecord.objects.select_related("employee", "kupas_item"),
            pk=pk,
        )
        if obj.paid_in_period_id is not None:
            return Response(
                error_response(detail="Catatan sudah dibayar.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        ser = KupasProductionRecordWriteSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(
            success_response(data=KupasProductionRecordSerializer(obj).data, detail="Catatan kupas diperbarui."),
            status=200,
        )

    def delete(self, request, pk: int):
        obj = get_object_or_404(KupasProductionRecord, pk=pk)
        if obj.paid_in_period_id is not None:
            return Response(
                error_response(detail="Catatan sudah dibayar.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        obj.delete()
        return Response(success_response(detail="Catatan kupas dihapus."), status=200)


class PayrollPeriodListCreateView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request):
        try:
            page_size = min(max(int(request.query_params.get("page_size", "20")), 1), 100)
            page = max(int(request.query_params.get("page", "1")), 1)
        except ValueError:
            return Response(
                error_response(detail="page / page_size tidak valid.", code=ApiCode.VALIDATION_ERROR),
                status=400,
            )

        qs = PayrollPeriod.objects.select_related("gaji_cash_entry").order_by("-pay_date")
        total = qs.count()
        start = (page - 1) * page_size
        slice_qs = qs[start : start + page_size]
        return Response(
            success_response(
                data={
                    "count": total,
                    "page": page,
                    "page_size": page_size,
                    "results": PayrollPeriodSerializer(slice_qs, many=True).data,
                }
            ),
            status=200,
        )

    def post(self, request):
        ser = PayrollPeriodCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        p = ser.save()
        return Response(
            success_response(data=PayrollPeriodSerializer(p).data, detail="Periode dibuat."),
            status=201,
        )


class PayrollPeriodDetailView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.select_related("gaji_cash_entry"), pk=pk)
        return Response(success_response(data=PayrollPeriodSerializer(p).data), status=200)

    def patch(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        ser = PayrollPeriodNotesSerializer(p, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(success_response(data=PayrollPeriodSerializer(p).data, detail="Periode diperbarui."), status=200)

    def delete(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        if p.status != PayrollPeriod.Status.DRAFT:
            return Response(
                error_response(detail="Hanya periode draft yang bisa dihapus.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        p.delete()
        return Response(success_response(detail="Periode draft dihapus."), status=200)


class PayrollPeriodGenerateView(APIView):
    permission_classes = [PayrollManageAccess]

    def post(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        try:
            n = generate_payroll_entries(p)
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        return Response(
            success_response(
                data={"entries_created_or_refreshed": n, "period": PayrollPeriodSerializer(p).data},
                detail=f"Slip pegawai dibuat ulang untuk {n} pegawai dengan pekerjaan belum dibayar.",
            ),
            status=200,
        )


class PayrollPeriodFinalizeView(APIView):
    permission_classes = [PayrollFinalizeAccess]

    def post(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.select_related("gaji_cash_entry"), pk=pk)
        ser = PayrollPostGajiToCashSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        try:
            p = finalize_payroll_period(p, request.user, ser.validated_data["payment_method"])
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        p = PayrollPeriod.objects.select_related("gaji_cash_entry").get(pk=p.pk)
        return Response(
            success_response(
                data=PayrollPeriodSerializer(p).data,
                detail="Tutup buku selesai. Total gaji bersih dicatat ke kas operasional.",
            ),
            status=200,
        )


class PayrollPeriodUnfinalizeView(APIView):
    """Buka kunci periode — ADMIN / Pemilik."""

    permission_classes = [PayrollFinalizeAccess]

    def post(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        try:
            p = unfinalize_payroll_period(p)
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        return Response(
            success_response(
                data=PayrollPeriodSerializer(p).data,
                detail="Kunci periode dibuka. Entri kas gaji dihapus dan periode kembali draft.",
            ),
            status=200,
        )


class PayrollEntryListView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        qs = PayrollEntry.objects.select_related("employee").filter(period=p).order_by("employee__full_name")
        return Response(success_response(data=PayrollEntrySerializer(qs, many=True).data), status=200)


class PayrollPeriodPostGajiToCashView(APIView):
    """Catat total gaji bersih periode ke kas operasional (kategori Gaji & upah)."""

    permission_classes = [PayrollManageAccess]

    def post(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.select_related("gaji_cash_entry"), pk=pk)
        ser = PayrollPostGajiToCashSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        try:
            cash = post_period_gaji_to_cash(p, request.user, ser.validated_data["payment_method"])
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        if cash is None:
            return Response(
                error_response(detail="Total gaji bersih bernilai 0 — tidak ada yang dicatat ke kas.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        p = PayrollPeriod.objects.select_related("gaji_cash_entry").get(pk=p.pk)
        return Response(
            success_response(
                data={
                    "period": PayrollPeriodSerializer(p).data,
                    "cash_entry_id": cash.id,
                    "amount_idr": cash.amount_idr,
                },
                detail="Total gaji bersih dicatat ke kas operasional.",
            ),
            status=200,
        )


class PayrollEntryLoanListCreateView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request, pk: int, entry_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        entry = get_object_or_404(PayrollEntry.objects.filter(period=p), pk=entry_id)
        qs = entry.loan_items.all()
        return Response(success_response(data=PayrollLoanItemSerializer(qs, many=True).data), status=200)

    def post(self, request, pk: int, entry_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        entry = get_object_or_404(PayrollEntry.objects.select_related("employee", "period").filter(period=p), pk=entry_id)
        ser = PayrollLoanItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            item = save_loan_item(
                entry=entry,
                user=request.user,
                amount=ser.validated_data["amount_idr"],
                occurred_on=ser.validated_data["occurred_on"],
                payment_method=ser.validated_data.get("payment_method", PayrollLoanItem.PaymentMethod.CASH),
                note=ser.validated_data.get("note", ""),
            )
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        entry.refresh_from_db()
        return Response(
            success_response(
                data={
                    "loan": PayrollLoanItemSerializer(item).data,
                    "entry": PayrollEntrySerializer(entry).data,
                },
                detail="Pinjaman ditambahkan dan dicatat ke kas.",
            ),
            status=201,
        )


class PayrollEntryLoanDetailView(APIView):
    permission_classes = [PayrollManageAccess]

    def patch(self, request, pk: int, entry_id: int, loan_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        entry = get_object_or_404(PayrollEntry.objects.select_related("employee", "period").filter(period=p), pk=entry_id)
        item = get_object_or_404(PayrollLoanItem.objects.filter(entry=entry), pk=loan_id)
        ser = PayrollLoanItemSerializer(item, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        try:
            item = save_loan_item(
                entry=entry,
                user=request.user,
                amount=ser.validated_data.get("amount_idr", item.amount_idr),
                occurred_on=ser.validated_data.get("occurred_on", item.occurred_on),
                payment_method=ser.validated_data.get("payment_method", item.payment_method),
                note=ser.validated_data.get("note", item.note),
                item=item,
            )
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        entry.refresh_from_db()
        return Response(
            success_response(
                data={
                    "loan": PayrollLoanItemSerializer(item).data,
                    "entry": PayrollEntrySerializer(entry).data,
                },
                detail="Pinjaman diperbarui.",
            ),
            status=200,
        )

    def delete(self, request, pk: int, entry_id: int, loan_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        entry = get_object_or_404(PayrollEntry.objects.filter(period=p), pk=entry_id)
        item = get_object_or_404(PayrollLoanItem.objects.filter(entry=entry), pk=loan_id)
        if p.status != PayrollPeriod.Status.DRAFT:
            return Response(
                error_response(detail="Pinjaman hanya bisa diubah pada periode draft.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        delete_loan_item(item)
        entry.refresh_from_db()
        return Response(
            success_response(
                data={"entry": PayrollEntrySerializer(entry).data},
                detail="Pinjaman dihapus dari slip dan kas.",
            ),
            status=200,
        )


class PayrollEntryAdjustView(APIView):
    permission_classes = [PayrollManageAccess]

    def patch(self, request, pk: int, entry_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        entry = get_object_or_404(PayrollEntry.objects.filter(period=p), pk=entry_id)

        # paid_out checklist can be toggled even after the period is locked
        if "paid_out" in request.data and set(request.data.keys()) <= {"paid_out"}:
            paid_ser = PayrollEntryPaidOutSerializer(data=request.data)
            paid_ser.is_valid(raise_exception=True)
            paid_out = paid_ser.validated_data["paid_out"]
            entry.paid_out = paid_out
            entry.paid_out_at = timezone.now() if paid_out else None
            entry.save(update_fields=["paid_out", "paid_out_at", "updated_at"])
            return Response(
                success_response(
                    data=PayrollEntrySerializer(entry).data,
                    detail="Status pembayaran diperbarui.",
                ),
                status=200,
            )

        if p.status != PayrollPeriod.Status.DRAFT:
            return Response(
                error_response(detail="Penyesuaian hanya di periode draft.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        ser = PayrollEntryAdjustSerializer(entry, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(
            success_response(data=PayrollEntrySerializer(entry).data, detail="Entri payroll diperbarui."),
            status=200,
        )


class PayrollEntrySlipView(APIView):
    """Slip detail satu pegawai dalam periode dikunci."""

    permission_classes = [PayrollManageAccess]

    def get(self, request, pk: int, entry_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        entry = get_object_or_404(
            PayrollEntry.objects.select_related("employee", "period").filter(period=p),
            pk=entry_id,
        )
        try:
            data = build_payroll_slip_detail(entry)
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        return Response(success_response(data=data), status=200)


class PayrollMeEntrySlipView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, period_id: int):
        entry = PayrollEntry.objects.select_related("employee", "period").filter(
            period_id=period_id,
            employee_id=request.user.pk,
            period__status=PayrollPeriod.Status.FINALIZED,
        ).first()
        if entry is None:
            return Response(error_response(detail="Slip tidak ditemukan.", code=ApiCode.NOT_FOUND), status=404)
        try:
            data = build_payroll_slip_detail(entry)
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        return Response(success_response(data=data), status=200)


class PayrollMeEntriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PayrollEntry.objects.select_related("period").filter(
            employee_id=request.user.pk,
            period__status=PayrollPeriod.Status.FINALIZED,
        ).order_by("-period__pay_date")

        pay_from = request.query_params.get("pay_date_from")
        pay_to = request.query_params.get("pay_date_to")
        if pay_from:
            qs = qs.filter(period__pay_date__gte=pay_from)
        if pay_to:
            qs = qs.filter(period__pay_date__lte=pay_to)

        rows = []
        for e in qs:
            rows.append(
                {
                    "period_id": e.period_id,
                    "pay_date": str(e.period.pay_date),
                    "period_start_date": str(e.period.period_start_date),
                    "period_end_date": str(e.period.period_end_date),
                    "pay_type_snapshot": e.pay_type_snapshot,
                    "base_salary_snapshot_idr": str(e.base_salary_snapshot_idr),
                    "daily_rate_snapshot_idr": str(e.daily_rate_snapshot_idr),
                    "days_present": e.days_present,
                    "late_count": e.late_count,
                    "total_kg": str(e.total_kg),
                    "gross_idr": str(e.gross_idr),
                    "bonus_idr": str(e.bonus_idr),
                    "advance_deduction_idr": str(e.advance_deduction_idr),
                    "deductions_idr": str(e.deductions_idr),
                    "net_pay_idr": str(e.net_pay_idr),
                    "notes": e.notes,
                    "finalized_at": e.period.finalized_at.isoformat() if e.period.finalized_at else None,
                }
            )
        return Response(success_response(data={"results": rows}), status=200)
