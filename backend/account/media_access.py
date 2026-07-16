"""
Authenticated media delivery with optional HMAC-signed URLs for cross-origin access.
"""
import hashlib
import hmac
import mimetypes
import time
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.utils.encoding import force_bytes
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.jwt_cookie_auth import JWTCookieAuthentication
from account.models import UserRole
from account.permissions import has_role, is_authenticated, user_is_owner

MEDIA_SIGNATURE_TTL_SECONDS = int(getattr(settings, "MEDIA_SIGNATURE_TTL_SECONDS", 3600))
MEDIA_SIGNATURE_PARAM = "sig"
MEDIA_EXPIRY_PARAM = "exp"


def _media_url_prefix() -> str:
    prefix = (settings.MEDIA_URL or "media/").strip("/")
    return f"/{prefix}/"


def _sign_payload(relative_path: str, expires_at: int) -> str:
    message = f"{relative_path}:{expires_at}"
    digest = hmac.new(
        force_bytes(settings.SECRET_KEY),
        force_bytes(message),
        hashlib.sha256,
    ).hexdigest()
    return digest


def build_signed_media_url(relative_path: str) -> str:
    """Return a relative URL (/media/...) with expiry + HMAC query params."""
    relative_path = relative_path.lstrip("/")
    if relative_path.startswith("media/"):
        relative_path = relative_path[len("media/") :]

    expires_at = int(time.time()) + MEDIA_SIGNATURE_TTL_SECONDS
    signature = _sign_payload(relative_path, expires_at)
    base = f"{_media_url_prefix()}{relative_path}"
    return f"{base}?{MEDIA_EXPIRY_PARAM}={expires_at}&{MEDIA_SIGNATURE_PARAM}={signature}"


def verify_media_signature(relative_path: str, expires_at: str | None, signature: str | None) -> bool:
    if not expires_at or not signature:
        return False
    try:
        exp_int = int(expires_at)
    except (TypeError, ValueError):
        return False
    if exp_int < int(time.time()):
        return False

    relative_path = relative_path.lstrip("/")
    if relative_path.startswith("media/"):
        relative_path = relative_path[len("media/") :]

    expected = _sign_payload(relative_path, exp_int)
    return hmac.compare_digest(expected, signature)


def _resolve_media_path(file_path: str) -> Path:
    media_root = Path(settings.MEDIA_ROOT).resolve()
    candidate = (media_root / file_path).resolve()
    if not str(candidate).startswith(str(media_root)):
        raise Http404("File not found")
    if not candidate.is_file():
        raise Http404("File not found")
    return candidate


def user_can_access_media_path(user, relative_path: str) -> bool:
    if not is_authenticated(user):
        return False

    normalized = relative_path.lstrip("/")
    if normalized.startswith("media/"):
        normalized = normalized[len("media/") :]

    # Bukti transfer — only finance / admin / owner via session auth.
    # Other roles that can view an order receive short-lived signed URLs instead.
    if normalized.startswith("purchase/payment_proofs/"):
        if user_is_owner(user):
            return True
        return has_role(user, UserRole.ADMIN, UserRole.FINANCE_STAFF)

    if normalized.startswith("expenses/attachments/"):
        if user_is_owner(user):
            return True
        return has_role(
            user,
            UserRole.ADMIN,
            UserRole.FINANCE_STAFF,
            UserRole.WAREHOUSE_STAFF,
            UserRole.SALES_STAFF,
        )

    # Future account/* uploads — staff-only app, authenticated users only.
    if normalized.startswith("account/"):
        return True

    return False


class ProtectedMediaServeView(APIView):
    """
    Serve uploaded files only to authenticated users or holders of a valid signed URL.
    """

    authentication_classes = [JWTCookieAuthentication, JWTAuthentication]
    permission_classes = []

    def get(self, request, file_path: str):
        expires_at = request.GET.get(MEDIA_EXPIRY_PARAM)
        signature = request.GET.get(MEDIA_SIGNATURE_PARAM)
        signed_ok = verify_media_signature(file_path, expires_at, signature)

        if not signed_ok and not user_can_access_media_path(request.user, file_path):
            if not is_authenticated(request.user):
                return HttpResponseForbidden("Authentication required")
            return HttpResponseForbidden("Permission denied")

        absolute_path = _resolve_media_path(file_path)
        content_type, _ = mimetypes.guess_type(absolute_path.name)
        response = FileResponse(absolute_path.open("rb"), content_type=content_type or "application/octet-stream")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
