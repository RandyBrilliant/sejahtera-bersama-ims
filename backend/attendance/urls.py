from django.urls import path

from attendance import views

app_name = "attendance"

urlpatterns = [
    path(
        "admin/badges/<int:user_id>/",
        views.StaffBadgeTokenAdminView.as_view(),
        name="admin-badge-by-user",
    ),
    path(
        "admin/badges/<int:user_id>/revoke/",
        views.StaffBadgeRevokeView.as_view(),
        name="admin-badge-revoke",
    ),
    path(
        "admin/badges/<int:user_id>/unrevoke/",
        views.StaffBadgeUnrevokeView.as_view(),
        name="admin-badge-unrevoke",
    ),
    path(
        "admin/badges/<int:user_id>/reissue/",
        views.StaffBadgeReissueView.as_view(),
        name="admin-badge-reissue",
    ),
    path(
        "admin/check-ins/preview/",
        views.AdminAttendancePreviewView.as_view(),
        name="admin-check-ins-preview",
    ),
    path(
        "admin/check-ins/confirm/",
        views.AdminAttendanceConfirmView.as_view(),
        name="admin-check-ins-confirm",
    ),
    path(
        "kiosk/check-ins/preview/",
        views.PublicAttendancePreviewView.as_view(),
        name="kiosk-check-ins-preview",
    ),
    path(
        "kiosk/check-ins/confirm/",
        views.PublicAttendanceConfirmView.as_view(),
        name="kiosk-check-ins-confirm",
    ),
    path(
        "settings/",
        views.AttendanceSettingsView.as_view(),
        name="attendance-settings",
    ),
    path(
        "reports/rows/",
        views.AttendanceReportRowsView.as_view(),
        name="attendance-report-rows",
    ),
    path(
        "me/rows/",
        views.AttendanceMeRowsView.as_view(),
        name="attendance-me-rows",
    ),
]
