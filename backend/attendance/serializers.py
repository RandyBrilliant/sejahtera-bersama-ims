from rest_framework import serializers

from attendance.models import AttendanceSettings


class RawScanSerializer(serializers.Serializer):
    """Payload dari tablet: teks mentah hasil pemindaian QR."""

    raw = serializers.CharField(required=True, trim_whitespace=False, allow_blank=False)


class TabletConfirmSerializer(serializers.Serializer):
    raw = serializers.CharField(required=True, trim_whitespace=False, allow_blank=False)
    intent = serializers.ChoiceField(choices=("check_in", "check_out"), required=True)


class AttendanceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSettings
        fields = ("id", "work_start_time", "grace_minutes", "updated_at")
        read_only_fields = ("id", "updated_at")
