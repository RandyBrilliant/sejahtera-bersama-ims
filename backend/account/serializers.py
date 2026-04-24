from django.contrib.auth import get_user_model
from rest_framework import serializers

from .api_responses import ApiMessage, validate_username_unique
from .models import EmployeeProfile, UserRole

User = get_user_model()


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
        fields = ["id", "user", "user_id", "employee_code", "joined_date", "created_at", "updated_at"]
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
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
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
        request = self.context.get("request")
        if request and request.method == "POST" and not attrs.get("password"):
            raise serializers.ValidationError({"password": [ApiMessage.PASSWORD_REQUIRED_ON_CREATE]})
        if not attrs.get("full_name") and not (self.instance and self.instance.full_name):
            raise serializers.ValidationError({"full_name": [ApiMessage.PROFILE_FULL_NAME_REQUIRED]})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
