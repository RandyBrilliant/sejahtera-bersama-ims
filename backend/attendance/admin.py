from django.contrib import admin

from attendance.models import AttendanceDailyCheckIn, StaffAttendanceBadge


@admin.register(StaffAttendanceBadge)
class StaffAttendanceBadgeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "revoked_at", "created_at")
    list_filter = ("revoked_at",)
    raw_id_fields = ("user",)
    search_fields = ("user__username", "user__full_name")


@admin.register(AttendanceDailyCheckIn)
class AttendanceDailyCheckInAdmin(admin.ModelAdmin):
    list_display = ("employee", "work_date", "checked_in_at", "verified_by")
    list_filter = ("work_date",)
    raw_id_fields = ("employee", "verified_by")
    date_hierarchy = "work_date"
