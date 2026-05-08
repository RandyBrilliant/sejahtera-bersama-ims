from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from payroll.models import EmployeeCompensation, PayrollEntry, PayrollPeriod

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
            "year",
            "month",
            "status",
            "finalized_at",
            "finalized_by",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "finalized_at",
            "finalized_by",
            "created_at",
            "updated_at",
        )


class PayrollPeriodCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = ("year", "month", "notes")

    def validate(self, attrs):
        y, m = int(attrs["year"]), int(attrs["month"])
        if PayrollPeriod.objects.filter(year=y, month=m).exists():
            raise serializers.ValidationError({"month": ["Periode ini sudah ada."]})
        return attrs


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
            instance.deductions_idr = validated_data["deductions_idr"]
        if "notes" in validated_data:
            instance.notes = validated_data["notes"]
        net = instance.base_salary_snapshot_idr - instance.deductions_idr
        if net < Decimal("0"):
            net = Decimal("0")
        instance.net_pay_idr = net
        instance.save(update_fields=["deductions_idr", "net_pay_idr", "notes", "updated_at"])
        return instance
