from datetime import datetime, timedelta

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.api_responses import ApiCode, error_response, success_response
from attendance.models import AttendanceDailyCheckIn, StaffAttendanceBadge
from attendance.permissions import (
    AttendanceReportAccess,
    AttendanceSettingsAccess,
    AttendanceVerifierAccess,
)
from attendance.serializers import (
    AttendanceSettingsSerializer,
    RawScanSerializer,
    TabletConfirmSerializer,
)
from attendance.services import (
    AttendanceError,
    build_tablet_preview,
    confirm_check_in,
    confirm_check_out,
    reissue_badge,
    resolve_employee_from_badge_token,
    revoke_badge,
    unrevoke_badge,
)
from attendance.utils_lateness import get_attendance_settings
from attendance.utils_parse import parse_badge_token
from attendance.utils_zone import jakarta_today_date


class StaffBadgeTokenAdminView(APIView):
    permission_classes = [IsAuthenticated, AttendanceVerifierAccess]

    def get(self, request, user_id: int):
        badge = StaffAttendanceBadge.objects.select_related(
            "user",
            "user__employee_profile",
        ).filter(user_id=user_id).first()

        if badge is None:
            return Response(
                error_response(
                    detail="Badge presensi untuk pengguna ini belum ada.",
                    code=ApiCode.NOT_FOUND,
                ),
                status=404,
            )

        emp = badge.user
        ec = getattr(emp.employee_profile, "employee_code", "") if hasattr(emp, "employee_profile") else ""

        return Response(
            success_response(
                data={
                    "user_id": emp.id,
                    "full_name": emp.full_name,
                    "employee_code": ec or "",
                    "badge_token": str(badge.id),
                    "is_revoked": badge.revoked_at is not None,
                }
            ),
            status=200,
        )


class StaffBadgeRevokeView(APIView):
    permission_classes = [IsAuthenticated, AttendanceVerifierAccess]

    def post(self, request, user_id: int):
        try:
            badge = revoke_badge(user_id)
        except AttendanceError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.NOT_FOUND), status=404)
        return Response(
            success_response(
                data={
                    "user_id": user_id,
                    "is_revoked": True,
                    "revoked_at": badge.revoked_at.isoformat() if badge.revoked_at else None,
                },
                detail="Kartu dinonaktifkan (revoke).",
            ),
            status=200,
        )


class StaffBadgeUnrevokeView(APIView):
    permission_classes = [IsAuthenticated, AttendanceVerifierAccess]

    def post(self, request, user_id: int):
        try:
            badge = unrevoke_badge(user_id)
        except AttendanceError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.NOT_FOUND), status=404)
        return Response(
            success_response(
                data={
                    "user_id": user_id,
                    "is_revoked": False,
                    "badge_token": str(badge.id),
                },
                detail="Kartu diaktifkan kembali.",
            ),
            status=200,
        )


class StaffBadgeReissueView(APIView):
    permission_classes = [IsAuthenticated, AttendanceVerifierAccess]

    def post(self, request, user_id: int):
        badge = reissue_badge(user_id)
        return Response(
            success_response(
                data={
                    "user_id": user_id,
                    "badge_token": str(badge.id),
                    "is_revoked": False,
                },
                detail="Badge baru dikeluarkan (UUID berubah). Cetak ulang kartu.",
            ),
            status=200,
        )


class AdminAttendancePreviewView(APIView):
    permission_classes = [IsAuthenticated, AttendanceVerifierAccess]

    def post(self, request):
        ser = RawScanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        token = parse_badge_token(ser.validated_data["raw"])
        if token is None:
            return Response(
                error_response(
                    detail="Kode kartu tidak dikenali.",
                    code=ApiCode.VALIDATION_ERROR,
                    errors={"raw": ["Pastikan QR berisi UUID kartu staf yang valid."]},
                ),
                status=400,
            )

        try:
            badge = resolve_employee_from_badge_token(token)
        except AttendanceError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.NOT_FOUND), status=404)

        data = build_tablet_preview(badge, jakarta_today_date())
        data["badge_token"] = str(badge.id)
        return Response(success_response(data=data), status=200)


class AdminAttendanceConfirmView(APIView):
    permission_classes = [IsAuthenticated, AttendanceVerifierAccess]

    def post(self, request):
        ser = TabletConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        token = parse_badge_token(ser.validated_data["raw"])
        intent = ser.validated_data["intent"]
        if token is None:
            return Response(
                error_response(
                    detail="Kode kartu tidak dikenali.",
                    code=ApiCode.VALIDATION_ERROR,
                    errors={"raw": ["Pastikan QR berisi UUID kartu staf yang valid."]},
                ),
                status=400,
            )

        try:
            if intent == "check_in":
                row, created = confirm_check_in(token, request.user.pk)
                return Response(
                    success_response(
                        data={
                            "intent": "check_in",
                            "created": created,
                            "employee_id": row.employee_id,
                            "work_date": str(row.work_date),
                            "checked_in_at": row.checked_in_at.isoformat(),
                            "is_late": row.is_late,
                            "minutes_late": row.minutes_late,
                            "already_checked_in_today": not created,
                            "verified_by_id": row.verified_by_id,
                            "timezone": settings.TIME_ZONE,
                        },
                        detail="Presensi masuk dicatat.",
                    ),
                    status=200,
                )
            row, created = confirm_check_out(token, request.user.pk)
            return Response(
                success_response(
                    data={
                        "intent": "check_out",
                        "created": created,
                        "employee_id": row.employee_id,
                        "work_date": str(row.work_date),
                        "checked_in_at": row.checked_in_at.isoformat(),
                        "checked_out_at": row.checked_out_at.isoformat()
                        if row.checked_out_at
                        else None,
                        "verified_out_by_id": row.verified_out_by_id,
                        "timezone": settings.TIME_ZONE,
                    },
                    detail="Presensi pulang dicatat.",
                ),
                status=200,
            )
        except AttendanceError as e:
            return Response(error_response(detail=e.detail, code=ApiCode.BAD_REQUEST), status=400)


class AttendanceSettingsView(APIView):
    permission_classes = [IsAuthenticated, AttendanceSettingsAccess]

    def get(self, request):
        s = get_attendance_settings()
        return Response(
            success_response(data=AttendanceSettingsSerializer(s).data),
            status=200,
        )

    def patch(self, request):
        s = get_attendance_settings()
        ser = AttendanceSettingsSerializer(s, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        inst = ser.save()
        return Response(
            success_response(data=AttendanceSettingsSerializer(inst).data, detail="Pengaturan disimpan."),
            status=200,
        )


def _parse_date_param(val: str | None):
    return datetime.strptime(val, "%Y-%m-%d").date()  # noqa: DTZ007


class AttendanceReportRowsView(APIView):
    permission_classes = [IsAuthenticated, AttendanceReportAccess]

    def get(self, request):
        df_raw = request.query_params.get("date_from")
        dt_raw = request.query_params.get("date_to")
        emp_id = request.query_params.get("employee_id")

        today = jakarta_today_date()

        try:
            date_to = _parse_date_param(dt_raw) if dt_raw else today
            date_from = _parse_date_param(df_raw) if df_raw else date_to - timedelta(days=30)
        except ValueError:
            return Response(
                error_response(detail="Format tanggal pakai YYYY-MM-DD.", code=ApiCode.VALIDATION_ERROR),
                status=400,
            )

        if date_from > date_to:
            return Response(
                error_response(detail="date_from tidak boleh setelah date_to.", code=ApiCode.VALIDATION_ERROR),
                status=400,
            )

        qs = AttendanceDailyCheckIn.objects.select_related(
            "employee",
            "verified_by",
            "verified_out_by",
        ).filter(work_date__gte=date_from, work_date__lte=date_to).order_by("-work_date", "employee__username")

        if emp_id and str(emp_id).isdigit():
            qs = qs.filter(employee_id=int(emp_id))

        try:
            page_size = min(max(int(request.query_params.get("page_size", "50")), 1), 500)
            page = max(int(request.query_params.get("page", "1")), 1)
        except ValueError:
            return Response(
                error_response(detail="page / page_size tidak valid.", code=ApiCode.VALIDATION_ERROR),
                status=400,
            )

        total = qs.count()
        start = (page - 1) * page_size
        slice_qs = qs[start : start + page_size]

        rows = []
        for r in slice_qs:
            rows.append(
                {
                    "id": r.id,
                    "employee_id": r.employee_id,
                    "employee_name": r.employee.full_name,
                    "employee_username": r.employee.username,
                    "work_date": str(r.work_date),
                    "checked_in_at": r.checked_in_at.isoformat(),
                    "verified_in_by": r.verified_by.full_name,
                    "is_late": r.is_late,
                    "minutes_late": r.minutes_late,
                    "checked_out_at": r.checked_out_at.isoformat() if r.checked_out_at else None,
                    "verified_out_by": r.verified_out_by.full_name
                    if r.verified_out_by_id
                    else None,
                }
            )

        return Response(
            success_response(
                data={
                    "count": total,
                    "page": page,
                    "page_size": page_size,
                    "date_from": str(date_from),
                    "date_to": str(date_to),
                    "results": rows,
                }
            ),
            status=200,
        )


class AttendanceMeRowsView(APIView):
    """Riwayat presensi sendiri (terbatas)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        df_raw = request.query_params.get("date_from")
        dt_raw = request.query_params.get("date_to")
        today = jakarta_today_date()

        try:
            date_to = _parse_date_param(dt_raw) if dt_raw else today
            date_from = _parse_date_param(df_raw) if df_raw else date_to - timedelta(days=90)
        except ValueError:
            return Response(
                error_response(detail="Format tanggal pakai YYYY-MM-DD.", code=ApiCode.VALIDATION_ERROR),
                status=400,
            )

        if date_from > date_to:
            return Response(
                error_response(detail="date_from tidak boleh setelah date_to.", code=ApiCode.VALIDATION_ERROR),
                status=400,
            )

        qs = AttendanceDailyCheckIn.objects.filter(
            employee_id=request.user.pk,
            work_date__gte=date_from,
            work_date__lte=date_to,
        ).order_by("-work_date")

        rows = [
            {
                "work_date": str(r.work_date),
                "checked_in_at": r.checked_in_at.isoformat(),
                "is_late": r.is_late,
                "minutes_late": r.minutes_late,
                "checked_out_at": r.checked_out_at.isoformat() if r.checked_out_at else None,
            }
            for r in qs
        ]

        return Response(
            success_response(
                data={
                    "date_from": str(date_from),
                    "date_to": str(date_to),
                    "results": rows,
                }
            ),
            status=200,
        )
