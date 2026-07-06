"""Shared validation for sensitive file uploads (payment proofs, attachments)."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.text import get_valid_filename

ALLOWED_UPLOAD_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)

ALLOWED_UPLOAD_EXTENSIONS = frozenset({".pdf", ".jpg", ".jpeg", ".png", ".webp"})

DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def max_upload_bytes() -> int:
    return int(getattr(settings, "MAX_UPLOAD_FILE_BYTES", DEFAULT_MAX_UPLOAD_BYTES))


def validate_uploaded_file(upload, *, field_name: str = "file") -> str:
    """
    Validate size, MIME type, and extension. Returns a sanitized filename.
    Raises ValidationError on rejection.
    """
    if not upload:
        raise ValidationError({field_name: ["File wajib diunggah."]})

    max_bytes = max_upload_bytes()
    if upload.size > max_bytes:
        raise ValidationError(
            {field_name: [f"Ukuran file maksimal {max_bytes // (1024 * 1024)} MB."]}
        )

    content_type = (getattr(upload, "content_type", None) or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise ValidationError(
            {field_name: ["Tipe file tidak diizinkan. Gunakan PDF, JPEG, PNG, atau WebP."]}
        )

    original_name = getattr(upload, "name", "") or "upload"
    safe_name = get_valid_filename(original_name)
    if not safe_name:
        raise ValidationError({field_name: ["Nama file tidak valid."]})

    ext = ""
    if "." in safe_name:
        ext = "." + safe_name.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError(
            {field_name: ["Ekstensi file tidak diizinkan. Gunakan PDF, JPEG, PNG, atau WebP."]}
        )

    upload.name = safe_name
    return safe_name


def upload_validation_error_response(exc: ValidationError):
    from rest_framework import status
    from rest_framework.response import Response

    if hasattr(exc, "message_dict"):
        errors = {k: list(v) for k, v in exc.message_dict.items()}
        detail = next(iter(next(iter(errors.values()), ["File tidak valid."])), "File tidak valid.")
    else:
        errors = {"file": list(exc.messages)}
        detail = exc.messages[0] if exc.messages else "File tidak valid."

    return Response(
        {"detail": detail, "code": "validation_error", "errors": errors},
        status=status.HTTP_400_BAD_REQUEST,
    )
