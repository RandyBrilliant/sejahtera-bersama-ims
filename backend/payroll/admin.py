from django.contrib import admin

from payroll.models import (
    EmployeeCompensation,
    KupasItem,
    KupasProductionRecord,
    PayrollEntry,
    PayrollLoanItem,
    PayrollPeriod,
)


@admin.register(EmployeeCompensation)
class EmployeeCompensationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "pay_type",
        "pay_cadence",
        "daily_rate_idr",
        "monthly_base_salary_idr",
        "updated_at",
    )
    list_filter = ("pay_type", "pay_cadence")
    raw_id_fields = ("user",)
    search_fields = ("user__username", "user__full_name")


@admin.register(KupasItem)
class KupasItemAdmin(admin.ModelAdmin):
    list_display = ("name", "rate_per_kg_idr", "resulting_ingredient", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
    raw_id_fields = ("resulting_ingredient",)


@admin.register(KupasProductionRecord)
class KupasProductionRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "work_date", "kupas_item", "kg", "amount_idr", "paid_in_period")
    list_filter = ("work_date", "paid_in_period")
    raw_id_fields = ("employee", "kupas_item", "paid_in_period", "created_by")
    search_fields = ("employee__full_name", "kupas_item__name")
    date_hierarchy = "work_date"


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = (
        "cadence",
        "pay_date",
        "period_start_date",
        "period_end_date",
        "status",
        "finalized_at",
    )
    list_filter = ("cadence", "status")


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = (
        "period",
        "employee",
        "pay_type_snapshot",
        "gross_idr",
        "net_pay_idr",
        "paid_out",
        "days_present",
        "total_kg",
    )
    list_filter = ("pay_type_snapshot", "paid_out")
    raw_id_fields = ("period", "employee")
    list_select_related = ("period", "employee")


@admin.register(PayrollLoanItem)
class PayrollLoanItemAdmin(admin.ModelAdmin):
    list_display = ("entry", "amount_idr", "occurred_on", "payment_method", "cash_entry")
    raw_id_fields = ("entry", "cash_entry", "created_by")
