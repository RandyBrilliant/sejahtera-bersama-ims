"""
JWT auth views for username-based IMS authentication.
"""
from datetime import timedelta

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django.utils.module_loading import import_string
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .api_responses import ApiCode, ApiMessage, error_response, success_response
from .models import UserRole
from .permissions import has_role
from .throttles import AuthRateThrottle

User = get_user_model()


def _cookie_settings():
    s = getattr(django_settings, "SIMPLE_JWT", {}) or {}
    return {
        "access_key": s.get("AUTH_COOKIE_ACCESS_KEY") or "kms_access",
        "refresh_key": s.get("AUTH_COOKIE_REFRESH_KEY") or "kms_refresh",
        "secure": s.get("AUTH_COOKIE_SECURE", False),
        "httponly": s.get("AUTH_COOKIE_HTTP_ONLY", True),
        "samesite": s.get("AUTH_COOKIE_SAMESITE") or "Lax",
        "path": s.get("AUTH_COOKIE_PATH") or "/",
    }


def _access_max_age_seconds():
    lifetime = getattr(jwt_api_settings, "ACCESS_TOKEN_LIFETIME", None)
    if lifetime is None:
        return 300
    return int(lifetime.total_seconds())


def _refresh_max_age_seconds():
    lifetime = getattr(jwt_api_settings, "REFRESH_TOKEN_LIFETIME", None)
    if lifetime is None:
        return 86400
    return int(lifetime.total_seconds())


def _is_mobile_client(request):
    return request.META.get("HTTP_X_CLIENT_TYPE", "").lower() == "mobile"


def _mobile_refresh_lifetime():
    return timedelta(days=getattr(django_settings, "JWT_MOBILE_REFRESH_DAYS", 365))


def _mobile_refresh_token_for_user(user):
    token = RefreshToken.for_user(user)
    token.set_exp(lifetime=_mobile_refresh_lifetime())
    return token


def _extend_refresh_token(token_str):
    token = RefreshToken(token_str)
    token.set_exp(lifetime=_mobile_refresh_lifetime())
    return str(token)


def _set_cookie(response, key, value, max_age, cookie_settings):
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        path=cookie_settings["path"],
        secure=cookie_settings["secure"],
        httponly=cookie_settings["httponly"],
        samesite=cookie_settings["samesite"],
    )


def _delete_cookie(response, key, cookie_settings):
    response.delete_cookie(
        key=key,
        path=cookie_settings["path"],
        samesite=cookie_settings["samesite"],
    )


def _user_summary(user):
    return {
        "id": user.id,
        "username": user.username,
        "full_name": getattr(user, "full_name", "") or "",
        "role": user.role,
        "is_active": user.is_active,
    }


@method_decorator(csrf_exempt, name="dispatch")
class CookieTokenObtainPairView(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer_class = import_string(jwt_api_settings.TOKEN_OBTAIN_SERIALIZER)
        serializer = serializer_class(data=request.data, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed as e:
            detail = e.detail
            if isinstance(detail, list) and detail:
                detail = str(detail[0])
            elif not isinstance(detail, str):
                detail = "Username atau password salah."
            return Response(
                error_response(detail=detail, code=ApiCode.PERMISSION_DENIED),
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except (InvalidToken, TokenError) as e:
            return Response(
                error_response(
                    detail=str(e) or ApiMessage.PERMISSION_DENIED,
                    code=ApiCode.PERMISSION_DENIED,
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data
        user = serializer.user
        access = data["access"]
        refresh = data["refresh"]

        if _is_mobile_client(request):
            mobile_token = _mobile_refresh_token_for_user(user)
            access = str(mobile_token.access_token)
            refresh = str(mobile_token)

        cookie_settings = _cookie_settings()
        response = Response(
            success_response(
                data={"user": _user_summary(user), "access": access, "refresh": refresh},
                detail="Login berhasil.",
                code=ApiCode.SUCCESS,
            ),
            status=status.HTTP_200_OK,
        )
        _set_cookie(response, cookie_settings["access_key"], access, _access_max_age_seconds(), cookie_settings)
        _set_cookie(response, cookie_settings["refresh_key"], refresh, _refresh_max_age_seconds(), cookie_settings)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class CookieTokenRefreshView(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        cookie_settings = _cookie_settings()
        refresh_raw = request.COOKIES.get(cookie_settings["refresh_key"]) or request.data.get("refresh")
        if not refresh_raw:
            return Response(
                error_response(
                    detail="Refresh token tidak ditemukan. Kirim dalam cookie atau body.",
                    code=ApiCode.PERMISSION_DENIED,
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer_class = import_string(jwt_api_settings.TOKEN_REFRESH_SERIALIZER)
        serializer = serializer_class(data={"refresh": refresh_raw}, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except (InvalidToken, TokenError) as e:
            return Response(
                error_response(
                    detail=str(e) or "Token tidak valid atau kedaluwarsa.",
                    code=ApiCode.PERMISSION_DENIED,
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data
        access = data["access"]
        new_refresh = data.get("refresh")
        if new_refresh and _is_mobile_client(request):
            new_refresh = _extend_refresh_token(new_refresh)

        response_data = {"access": access}
        if new_refresh:
            response_data["refresh"] = new_refresh

        response = Response(
            success_response(data=response_data, detail="Token diperbarui.", code=ApiCode.SUCCESS),
            status=status.HTTP_200_OK,
        )
        _set_cookie(response, cookie_settings["access_key"], access, _access_max_age_seconds(), cookie_settings)
        if new_refresh:
            _set_cookie(
                response,
                cookie_settings["refresh_key"],
                new_refresh,
                _refresh_max_age_seconds(),
                cookie_settings,
            )
        return response


@method_decorator(csrf_exempt, name="dispatch")
class CookieLogoutView(APIView):
    permission_classes = ()
    authentication_classes = ()

    def post(self, request):
        cookie_settings = _cookie_settings()
        response = Response(
            success_response(detail="Logout berhasil.", code=ApiCode.SUCCESS),
            status=status.HTTP_200_OK,
        )
        _delete_cookie(response, cookie_settings["access_key"], cookie_settings)
        _delete_cookie(response, cookie_settings["refresh_key"], cookie_settings)
        return response


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        user = request.user
        old_password = (request.data.get("old_password") or "").strip()
        new_password = (request.data.get("new_password") or "").strip()
        field_errors: dict[str, list[str]] = {}

        if not old_password:
            field_errors.setdefault("old_password", []).append("Password lama wajib diisi.")
        if not new_password:
            field_errors.setdefault("new_password", []).append("Password baru wajib diisi.")

        if field_errors:
            return Response(
                error_response(
                    detail=ApiMessage.VALIDATION_ERROR,
                    code=ApiCode.VALIDATION_ERROR,
                    errors=field_errors,
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_password):
            field_errors.setdefault("old_password", []).append("Password lama tidak sesuai.")
            return Response(
                error_response(
                    detail=ApiMessage.VALIDATION_ERROR,
                    code=ApiCode.VALIDATION_ERROR,
                    errors=field_errors,
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            msgs = list(e.messages) or ["Password tidak memenuhi syarat."]
            field_errors.setdefault("new_password", []).extend(msgs)
            return Response(
                error_response(
                    detail=msgs[0],
                    code=ApiCode.VALIDATION_ERROR,
                    errors=field_errors,
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response(
            success_response(
                detail=ApiMessage.RESET_PASSWORD_SUCCESS,
                code=ApiCode.RESET_PASSWORD_SUCCESS,
            ),
            status=status.HTTP_200_OK,
        )


class AdminResetUserPasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        if not has_role(request.user, UserRole.ADMIN):
            return Response(
                error_response(
                    detail=ApiMessage.PERMISSION_DENIED,
                    code=ApiCode.PERMISSION_DENIED,
                    status_code=status.HTTP_403_FORBIDDEN,
                ),
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        new_password = (request.data.get("new_password") or "").strip()
        field_errors: dict[str, list[str]] = {}

        if not user_id:
            field_errors.setdefault("user_id", []).append("ID pengguna wajib diisi.")
        if not new_password:
            field_errors.setdefault("new_password", []).append("Password baru wajib diisi.")

        if field_errors:
            return Response(
                error_response(
                    detail=ApiMessage.VALIDATION_ERROR,
                    code=ApiCode.VALIDATION_ERROR,
                    errors=field_errors,
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user = User.objects.filter(pk=user_id).first()
        if not target_user:
            return Response(
                error_response(
                    detail=ApiMessage.NOT_FOUND,
                    code=ApiCode.NOT_FOUND,
                    errors={"user_id": ["Pengguna tidak ditemukan."]},
                    status_code=status.HTTP_404_NOT_FOUND,
                ),
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            validate_password(new_password, target_user)
        except ValidationError as e:
            msgs = list(e.messages) or ["Password tidak memenuhi syarat."]
            field_errors.setdefault("new_password", []).extend(msgs)
            return Response(
                error_response(
                    detail=msgs[0],
                    code=ApiCode.VALIDATION_ERROR,
                    errors=field_errors,
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.set_password(new_password)
        target_user.save(update_fields=["password"])
        return Response(
            success_response(
                detail=ApiMessage.RESET_PASSWORD_FOR_USER_SUCCESS,
                code=ApiCode.RESET_PASSWORD_FOR_USER_SUCCESS,
                data={"user": _user_summary(target_user)},
            ),
            status=status.HTTP_200_OK,
        )
