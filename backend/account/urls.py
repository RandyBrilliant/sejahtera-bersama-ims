from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_cookie_views import (
    AdminResetUserPasswordView,
    ChangePasswordView,
    CookieLogoutView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
)
from .views import EmployeeProfileViewSet, MeView, UserViewSet

app_name = "account"

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
router.register(r"employee-profiles", EmployeeProfileViewSet, basename="employee-profiles")

urlpatterns = [
    path("auth/login/", CookieTokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", CookieLogoutView.as_view(), name="auth-logout"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/change-password-user/", AdminResetUserPasswordView.as_view(), name="auth-change-password-user"),
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
