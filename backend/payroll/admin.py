from django.contrib import admin

from payroll.models import EmployeeCompensation, PayrollEntry, PayrollPeriod


@admin.register(EmployeeCompensation)
class EmployeeCompensationAdmin(admin.ModelAdmin):
    list_display = ("user", "monthly_base_salary_idr", "updated_at")
    raw_id_fields = ("user",)
    search_fields = ("user__username", "user__full_name")


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ("pay_date", "period_start_date", "period_end_date", "status", "finalized_at")


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ("period", "employee", "net_pay_idr", "days_present", "late_count")
    raw_id_fields = ("period", "employee")
    list_select_related = ("period", "employee")
