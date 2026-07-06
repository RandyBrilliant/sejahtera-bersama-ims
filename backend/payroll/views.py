from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.api_responses import ApiCode, error_response, success_response
from account.models import UserRole
from payroll.models import EmployeeCompensation, PayrollEntry, PayrollPeriod
from payroll.permissions import PayrollFinalizeAccess, PayrollManageAccess
from payroll.serializers import (
    EmployeeCompensationSerializer,
    EmployeeCompensationUpdateSerializer,
    PayrollEntryAdjustSerializer,
    PayrollEntrySerializer,
    PayrollPeriodCreateSerializer,
    PayrollPeriodNotesSerializer,
    PayrollPeriodSerializer,
)
from payroll.services import PayrollWorkflowError, finalize_payroll_period, generate_payroll_entries

User = get_user_model()

_STAFF_ROLES_FOR_PAYROLL = (
    UserRole.ADMIN,
    UserRole.LEADERSHIP,
    UserRole.WAREHOUSE_STAFF,
    UserRole.SALES_STAFF,
    UserRole.FINANCE_STAFF,
)


class EmployeeCompensationTableView(APIView):
    """
    Seluruh staf aktif (+ pimpinan) dengan gaji pokok jika ada — untuk pengelolaan oleh
    pemilik/admin/keuangan (tanpa membuka formulir lengkap akun).
    Pemilik tetap dapat melihat baris bagi semua peran yang relevan pembayaran.
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
            obj = EmployeeCompensation.objects.create(user_id=user_id)

        us = EmployeeCompensationUpdateSerializer(data=request.data)
        us.is_valid(raise_exception=True)
        obj.monthly_base_salary_idr = us.validated_data["monthly_base_salary_idr"]
        obj.save(update_fields=["monthly_base_salary_idr", "updated_at"])
        return Response(
            success_response(data=EmployeeCompensationSerializer(obj).data, detail="Gaji pokok diperbarui."),
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
                        "monthly_base_salary_idr": None,
                        "detail": "Belum ada data gaji pokok.",
                    },
                ),
                status=200,
            )
        return Response(success_response(data=EmployeeCompensationSerializer(obj).data), status=200)


class PayrollPeriodListCreateView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request):
        qs = PayrollPeriod.objects.order_by("-pay_date")
        return Response(success_response(data=PayrollPeriodSerializer(qs, many=True).data), status=200)

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
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        return Response(success_response(data=PayrollPeriodSerializer(p).data), status=200)

    def patch(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        if p.status != PayrollPeriod.Status.DRAFT:
            return Response(
                error_response(detail="Periode terkunci. Catatan tidak dapat diubah.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
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
                detail=f"Slip pegawai dibuat ulang untuk {n} pegawai aktif dengan data gaji pokok.",
            ),
            status=200,
        )


class PayrollPeriodFinalizeView(APIView):
    permission_classes = [PayrollFinalizeAccess]

    def post(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        try:
            p = finalize_payroll_period(p, request.user.pk)
        except PayrollWorkflowError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)
        return Response(
            success_response(
                data=PayrollPeriodSerializer(p).data,
                detail="Periode digaji dikunci.",
            ),
            status=200,
        )


class PayrollEntryListView(APIView):
    permission_classes = [PayrollManageAccess]

    def get(self, request, pk: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        qs = PayrollEntry.objects.select_related("employee").filter(period=p).order_by("employee__full_name")
        return Response(success_response(data=PayrollEntrySerializer(qs, many=True).data), status=200)


class PayrollEntryAdjustView(APIView):
    permission_classes = [PayrollManageAccess]

    def patch(self, request, pk: int, entry_id: int):
        p = get_object_or_404(PayrollPeriod.objects.all(), pk=pk)
        if p.status != PayrollPeriod.Status.DRAFT:
            return Response(
                error_response(detail="Potongan hanya di periode draft.", code=ApiCode.BAD_REQUEST),
                status=400,
            )
        entry = get_object_or_404(PayrollEntry.objects.filter(period=p), pk=entry_id)
        ser = PayrollEntryAdjustSerializer(entry, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(
            success_response(data=PayrollEntrySerializer(entry).data, detail="Entri payroll diperbarui."),
            status=200,
        )


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
                    "base_salary_snapshot_idr": str(e.base_salary_snapshot_idr),
                    "days_present": e.days_present,
                    "late_count": e.late_count,
                    "deductions_idr": str(e.deductions_idr),
                    "net_pay_idr": str(e.net_pay_idr),
                    "notes": e.notes,
                    "finalized_at": e.period.finalized_at.isoformat() if e.period.finalized_at else None,
                }
            )
        return Response(success_response(data={"results": rows}), status=200)
