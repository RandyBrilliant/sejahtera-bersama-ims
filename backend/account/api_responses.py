"""
Shared API response helpers and messages.
"""
from rest_framework import status
from rest_framework.views import exception_handler


class ApiCode:
    SUCCESS = "success"
    VALIDATION_ERROR = "validation_error"
    NOT_FOUND = "not_found"
    PERMISSION_DENIED = "permission_denied"
    METHOD_NOT_ALLOWED = "method_not_allowed"
    INTERNAL_ERROR = "internal_error"
    SERVER_ERROR = INTERNAL_ERROR

    DELETE_NOT_ALLOWED = "delete_not_allowed"
    ALREADY_DEACTIVATED = "already_deactivated"
    ALREADY_ACTIVATED = "already_activated"
    DEACTIVATED = "deactivated"
    ACTIVATED = "activated"
    PROFILE_UPDATED = "profile_updated"
    RESET_PASSWORD_SUCCESS = "reset_password_success"
    RESET_PASSWORD_FOR_USER_SUCCESS = "reset_password_for_user_success"

    USERNAME_TAKEN = "username_taken"
    PASSWORD_REQUIRED_ON_CREATE = "password_required_on_create"
    PROFILE_FULL_NAME_REQUIRED = "profile_full_name_required"


class ApiMessage:
    VALIDATION_ERROR = "Data tidak valid. Periksa field yang dilampirkan."
    NOT_FOUND = "Resource tidak ditemukan."
    PERMISSION_DENIED = "Anda tidak memiliki izin untuk aksi ini."
    METHOD_NOT_ALLOWED = "Metode tidak diizinkan."

    DELETE_NOT_ALLOWED = "Penghapusan tidak diizinkan. Gunakan aksi deactivate untuk menonaktifkan akun."
    ALREADY_DEACTIVATED = "Akun sudah nonaktif."
    ALREADY_ACTIVATED = "Akun sudah aktif."
    DEACTIVATED = "Akun berhasil dinonaktifkan."
    ACTIVATED = "Akun berhasil diaktifkan kembali."
    PROFILE_UPDATED = "Profil berhasil diperbarui."
    RESET_PASSWORD_SUCCESS = "Kata sandi berhasil diatur ulang."
    RESET_PASSWORD_FOR_USER_SUCCESS = "Kata sandi pengguna berhasil diatur ulang."

    USERNAME_TAKEN = "Username ini sudah digunakan."
    PASSWORD_REQUIRED_ON_CREATE = "Password wajib diisi saat membuat akun baru."
    PROFILE_FULL_NAME_REQUIRED = "Nama lengkap wajib diisi."


def error_response(
    detail: str,
    code: str,
    errors: dict | None = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> dict:
    payload = {"detail": detail, "code": code}
    if errors is not None:
        payload["errors"] = errors
    return payload


def success_response(data=None, detail: str | None = None, code: str = ApiCode.SUCCESS) -> dict:
    payload = {"code": code}
    if detail is not None:
        payload["detail"] = detail
    if data is not None:
        payload["data"] = data
    return payload


def validate_username_unique(model_class, value: str, instance=None):
    from rest_framework import serializers

    if not value:
        return value
    cleaned = value.strip().lower()
    qs = model_class.objects.filter(username__iexact=cleaned)
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise serializers.ValidationError(ApiMessage.USERNAME_TAKEN)
    return cleaned


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    data = response.data
    if not isinstance(data, dict):
        return response

    if response.status_code == status.HTTP_400_BAD_REQUEST and "detail" not in data and "code" not in data:
        response.data = {
            "detail": ApiMessage.VALIDATION_ERROR,
            "code": ApiCode.VALIDATION_ERROR,
            "errors": data,
        }
        return response

    if "code" not in data:
        data["code"] = {
            status.HTTP_404_NOT_FOUND: ApiCode.NOT_FOUND,
            status.HTTP_403_FORBIDDEN: ApiCode.PERMISSION_DENIED,
            status.HTTP_405_METHOD_NOT_ALLOWED: ApiCode.METHOD_NOT_ALLOWED,
        }.get(response.status_code, ApiCode.VALIDATION_ERROR)
    if "detail" not in data:
        data["detail"] = ApiMessage.VALIDATION_ERROR

    response.data = data
    return response
