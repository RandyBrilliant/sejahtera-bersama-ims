from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from payroll.models import EmployeeCompensation, PayrollEntry, PayrollPeriod
from payroll.period_week import is_saturday, week_bounds_for_pay_saturday

User = get_user_model()


class EmployeeCompensationSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = EmployeeCompensation
        fields = ("user_id", "username", "full_name", "monthly_base_salary_idr", "updated_at")


class EmployeeCompensationUpdateSerializer(serializers.Serializer):
    monthly_base_salary_idr = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"))


class PayrollPeriodNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = ("notes",)


class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = (
            "id",
            "pay_date",
            "period_start_date",
            "period_end_date",
            "status",
            "finalized_at",
            "finalized_by",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "period_start_date",
            "period_end_date",
            "status",
            "finalized_at",
            "finalized_by",
            "created_at",
            "updated_at",
        )


class PayrollPeriodCreateSerializer(serializers.Serializer):
    pay_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_pay_date(self, value: date) -> date:
        if not is_saturday(value):
            raise serializers.ValidationError("Tanggal pembayaran harus hari Sabtu.")
        return value

    def validate(self, attrs):
        pay_date = attrs["pay_date"]
        if PayrollPeriod.objects.filter(pay_date=pay_date).exists():
            raise serializers.ValidationError({"pay_date": ["Periode gaji untuk Sabtu ini sudah ada."]})
        return attrs

    def create(self, validated_data):
        pay_date = validated_data["pay_date"]
        period_start, period_end = week_bounds_for_pay_saturday(pay_date)
        return PayrollPeriod.objects.create(
            pay_date=pay_date,
            period_start_date=period_start,
            period_end_date=period_end,
            notes=validated_data.get("notes", ""),
            status=PayrollPeriod.Status.DRAFT,
        )


class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)

    class Meta:
        model = PayrollEntry
        fields = (
            "id",
            "employee",
            "employee_name",
            "base_salary_snapshot_idr",
            "days_present",
            "late_count",
            "deductions_idr",
            "net_pay_idr",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "employee",
            "employee_name",
            "base_salary_snapshot_idr",
            "days_present",
            "late_count",
            "created_at",
            "updated_at",
        )


class PayrollEntryAdjustSerializer(serializers.ModelSerializer):
    """Penyesuaian potongan (periode masih draft)."""

    class Meta:
        model = PayrollEntry
        fields = ("deductions_idr", "notes")

    def validate_deductions_idr(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Potongan tidak boleh negatif.")
        return value

    def update(self, instance, validated_data):  # type: ignore[override]
        if "deductions_idr" in validated_data:
            old_deductions = instance.deductions_idr
            new_deductions = validated_data["deductions_idr"]
            instance.deductions_idr = new_deductions
            instance.net_pay_idr = instance.net_pay_idr + old_deductions - new_deductions
            if instance.net_pay_idr < Decimal("0"):
                instance.net_pay_idr = Decimal("0")
        if "notes" in validated_data:
            instance.notes = validated_data["notes"]
        instance.save(update_fields=["deductions_idr", "net_pay_idr", "notes", "updated_at"])
        return instance
