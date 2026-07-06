from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .api_responses import ApiMessage, validate_username_unique
from .models import EmployeeProfile, UserRole

User = get_user_model()


def _set_employee_joined_date(user, joined_date):
    if joined_date is None:
        return
    profile, _ = EmployeeProfile.objects.get_or_create(user=user)
    profile.joined_date = joined_date
    profile.save(update_fields=["joined_date", "updated_at"])


class EmployeeProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True,
        required=False,
    )
    user = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = ["id", "user", "user_id", "employee_code", "joined_date", "resigned_date", "created_at", "updated_at"]
        read_only_fields = ["id", "employee_code", "created_at", "updated_at", "user"]

    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "username": obj.user.username,
            "full_name": obj.user.full_name,
            "role": obj.user.role,
            "is_active": obj.user.is_active,
        }

    def validate(self, attrs):
        request = self.context.get("request")
        if request and not request.user.is_superuser and request.user.role not in (UserRole.LEADERSHIP, UserRole.ADMIN):
            if "user" in attrs and attrs["user"] != request.user:
                raise serializers.ValidationError("Anda hanya dapat mengelola profil Anda sendiri.")
        return attrs


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        trim_whitespace=False,
    )
    joined_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    employee_profile = EmployeeProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "full_name",
            "role",
            "phone_number",
            "is_active",
            "joined_date",
            "date_joined",
            "last_login",
            "created_at",
            "updated_at",
            "employee_profile",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "created_at", "updated_at", "employee_profile"]

    def validate_username(self, value):
        return validate_username_unique(User, value, self.instance)

    def validate(self, attrs):
        if not attrs.get("full_name") and not (self.instance and self.instance.full_name):
            raise serializers.ValidationError({"full_name": [ApiMessage.PROFILE_FULL_NAME_REQUIRED]})

        password = attrs.get("password")
        if not self.instance:
            if not password:
                raise serializers.ValidationError(
                    {"password": ["Password wajib diisi saat membuat pengguna."]}
                )
            candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
            candidate.username = attrs.get("username", "")
            candidate.full_name = attrs.get("full_name", "")
            try:
                validate_password(password, candidate)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": list(exc.messages)}) from exc
            if password == attrs.get("username"):
                raise serializers.ValidationError(
                    {"password": ["Password tidak boleh sama dengan username."]}
                )
        elif password:
            try:
                validate_password(password, self.instance)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": list(exc.messages)}) from exc

        return attrs

    def create(self, validated_data):
        joined_date = validated_data.pop("joined_date", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        _set_employee_joined_date(user, joined_date)
        return user

    def update(self, instance, validated_data):
        joined_date = validated_data.pop("joined_date", serializers.empty)
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            try:
                validate_password(password, instance)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": list(exc.messages)}) from exc
            instance.set_password(password)
        instance.save()
        if joined_date is not serializers.empty:
            _set_employee_joined_date(instance, joined_date)
        return instance
