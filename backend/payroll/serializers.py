from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

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
from payroll.period_week import PayrollPeriodError, default_bounds_for_pay_date

User = get_user_model()


class EmployeeCompensationSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = EmployeeCompensation
        fields = (
            "user_id",
            "username",
            "full_name",
            "pay_type",
            "pay_cadence",
            "daily_rate_idr",
            "monthly_base_salary_idr",
            "updated_at",
        )


class EmployeeCompensationUpdateSerializer(serializers.Serializer):
    pay_type = serializers.ChoiceField(choices=PayType.choices, required=False)
    pay_cadence = serializers.ChoiceField(choices=PayCadence.choices, required=False)
    daily_rate_idr = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    monthly_base_salary_idr = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )


class KupasItemSerializer(serializers.ModelSerializer):
    resulting_ingredient_name = serializers.CharField(
        source="resulting_ingredient.name", read_only=True, allow_null=True
    )

    class Meta:
        model = KupasItem
        fields = (
            "id",
            "name",
            "rate_per_kg_idr",
            "resulting_ingredient",
            "resulting_ingredient_name",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class KupasProductionRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    kupas_item_name = serializers.CharField(source="kupas_item.name", read_only=True)

    class Meta:
        model = KupasProductionRecord
        fields = (
            "id",
            "employee",
            "employee_name",
            "work_date",
            "kupas_item",
            "kupas_item_name",
            "kg",
            "rate_snapshot_idr",
            "amount_idr",
            "paid_in_period",
            "note",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "employee_name",
            "kupas_item_name",
            "rate_snapshot_idr",
            "amount_idr",
            "paid_in_period",
            "created_by",
            "created_at",
            "updated_at",
        )


class KupasProductionRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KupasProductionRecord
        fields = ("employee", "work_date", "kupas_item", "kg", "note")

    def validate(self, attrs):
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        if employee is None:
            raise serializers.ValidationError({"employee": ["Wajib."]})

        comp = EmployeeCompensation.objects.filter(user_id=employee.pk).first()
        if comp is None or comp.pay_type != PayType.PIECE_RATE:
            raise serializers.ValidationError(
                {"employee": ["Pegawai harus bertipe borongan kupas (PIECE_RATE)."]}
            )

        if self.instance and self.instance.paid_in_period_id is not None:
            raise serializers.ValidationError("Catatan sudah dibayar dan tidak dapat diubah.")

        return attrs


class PayrollPeriodNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = ("notes",)


class PayrollPeriodSerializer(serializers.ModelSerializer):
    gaji_cash_entry_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = PayrollPeriod
        fields = (
            "id",
            "cadence",
            "pay_date",
            "period_start_date",
            "period_end_date",
            "status",
            "finalized_at",
            "finalized_by",
            "notes",
            "gaji_cash_entry_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "cadence",
            "period_start_date",
            "period_end_date",
            "status",
            "finalized_at",
            "finalized_by",
            "gaji_cash_entry_id",
            "created_at",
            "updated_at",
        )


class PayrollPeriodCreateSerializer(serializers.Serializer):
    cadence = serializers.ChoiceField(choices=PayCadence.choices, default=PayCadence.WEEKLY)
    pay_date = serializers.DateField()
    cutoff_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        pay_date = attrs["pay_date"]
        cutoff = attrs.get("cutoff_date")
        cadence = attrs.get("cadence", PayCadence.WEEKLY)
        if PayrollPeriod.objects.filter(cadence=cadence, pay_date=pay_date).exists():
            raise serializers.ValidationError(
                {"pay_date": ["Periode gaji untuk cadence & tanggal bayar ini sudah ada."]}
            )
        try:
            default_bounds_for_pay_date(pay_date, cutoff, cadence=cadence)
        except PayrollPeriodError as e:
            field = "pay_date" if cadence == PayCadence.WEEKLY and "Sabtu" in e.detail else "cutoff_date"
            raise serializers.ValidationError({field: [e.detail]}) from e
        return attrs

    def create(self, validated_data):
        pay_date = validated_data["pay_date"]
        cutoff = validated_data.get("cutoff_date")
        cadence = validated_data.get("cadence", PayCadence.WEEKLY)
        period_start, period_end = default_bounds_for_pay_date(pay_date, cutoff, cadence=cadence)
        return PayrollPeriod.objects.create(
            cadence=cadence,
            pay_date=pay_date,
            period_start_date=period_start,
            period_end_date=period_end,
            notes=validated_data.get("notes", ""),
            status=PayrollPeriod.Status.DRAFT,
        )


class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    loan_item_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollEntry
        fields = (
            "id",
            "employee",
            "employee_name",
            "pay_type_snapshot",
            "base_salary_snapshot_idr",
            "daily_rate_snapshot_idr",
            "days_present",
            "late_count",
            "total_kg",
            "gross_idr",
            "bonus_idr",
            "advance_deduction_idr",
            "deductions_idr",
            "net_pay_idr",
            "notes",
            "paid_out",
            "paid_out_at",
            "loan_item_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "employee",
            "employee_name",
            "pay_type_snapshot",
            "base_salary_snapshot_idr",
            "daily_rate_snapshot_idr",
            "days_present",
            "late_count",
            "total_kg",
            "gross_idr",
            "paid_out",
            "paid_out_at",
            "loan_item_count",
            "created_at",
            "updated_at",
        )

    def get_loan_item_count(self, obj) -> int:
        return obj.loan_items.count()


class PayrollEntryPaidOutSerializer(serializers.Serializer):
    paid_out = serializers.BooleanField()


class PayrollEntryAdjustSerializer(serializers.ModelSerializer):
    """Penyesuaian potongan dan bonus (periode masih draft). Pinjaman lewat loan items."""

    class Meta:
        model = PayrollEntry
        fields = ("deductions_idr", "bonus_idr", "notes")

    def validate_deductions_idr(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Potongan tidak boleh negatif.")
        return value

    def validate_bonus_idr(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Bonus tidak boleh negatif.")
        return value

    def update(self, instance, validated_data):  # type: ignore[override]
        gross = instance.gross_idr
        deductions = validated_data.get("deductions_idr", instance.deductions_idr)
        bonus = validated_data.get("bonus_idr", instance.bonus_idr)
        advance = instance.advance_deduction_idr

        if "deductions_idr" in validated_data:
            instance.deductions_idr = deductions
        if "bonus_idr" in validated_data:
            instance.bonus_idr = bonus
        if "notes" in validated_data:
            instance.notes = validated_data["notes"]

        net = gross + bonus - deductions - advance
        if net < Decimal("0"):
            net = Decimal("0")
        instance.net_pay_idr = net
        instance.save(
            update_fields=[
                "deductions_idr",
                "bonus_idr",
                "net_pay_idr",
                "notes",
                "updated_at",
            ]
        )
        return instance


class PayrollLoanItemSerializer(serializers.ModelSerializer):
    cash_entry_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = PayrollLoanItem
        fields = (
            "id",
            "amount_idr",
            "occurred_on",
            "payment_method",
            "note",
            "cash_entry_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "cash_entry_id", "created_at", "updated_at")

    def validate_amount_idr(self, value: Decimal) -> Decimal:
        if value < 1:
            raise serializers.ValidationError("Nominal pinjaman minimal Rp 1.")
        return value


class PayrollPostGajiToCashSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=[("CASH", "Cash"), ("TRANSFER", "Transfer")], default="CASH")

