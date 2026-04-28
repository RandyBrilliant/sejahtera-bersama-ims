from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .api_responses import ApiCode, ApiMessage, error_response, success_response
from .filters import UserListFilterSet
from .serializers import EmployeeProfileSerializer, UserSerializer
from .models import EmployeeProfile, UserRole
from .permissions import IsAdminOrOwner, user_is_owner
from .user_payload import build_user_payload

User = get_user_model()


def _user_payload(user):
    return build_user_payload(user)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    _allowed_fields = {"full_name", "phone_number"}

    def get(self, request):
        return Response(success_response(data=_user_payload(request.user)), status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        updates = {}
        for field in self._allowed_fields:
            if field in request.data:
                value = request.data.get(field)
                updates[field] = value.strip() if isinstance(value, str) else value
        if not updates:
            return Response(
                error_response(
                    detail=ApiMessage.VALIDATION_ERROR,
                    code=ApiCode.VALIDATION_ERROR,
                    errors={"non_field_errors": ["No updatable fields were provided."]},
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )
        for key, value in updates.items():
            setattr(user, key, value)
        user.save(update_fields=list(updates.keys()))
        return Response(
            success_response(data=_user_payload(user), detail=ApiMessage.PROFILE_UPDATED, code=ApiCode.PROFILE_UPDATED),
            status=status.HTTP_200_OK,
        )


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = UserListFilterSet
    search_fields = ["username", "full_name", "phone_number"]
    ordering_fields = ["username", "full_name", "created_at", "updated_at", "date_joined"]
    ordering = ["username"]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        qs = User.objects.all()
        return qs if user_is_owner(self.request.user) else qs.exclude(role=UserRole.LEADERSHIP)

    def _guard_owner_role_change(self, role):
        if not user_is_owner(self.request.user) and role == UserRole.LEADERSHIP:
            raise ValidationError({"role": ["Hanya owner yang dapat menetapkan role owner."]})

    def perform_create(self, serializer):
        self._guard_owner_role_change(serializer.validated_data.get("role", UserRole.WAREHOUSE_STAFF))
        serializer.save()

    def perform_update(self, serializer):
        role = serializer.validated_data.get("role", serializer.instance.role)
        self._guard_owner_role_change(role)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        return Response(
            error_response(
                detail=ApiMessage.DELETE_NOT_ALLOWED,
                code=ApiCode.DELETE_NOT_ALLOWED,
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            ),
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if not user.is_active:
            return Response(error_response(detail=ApiMessage.ALREADY_DEACTIVATED, code=ApiCode.ALREADY_DEACTIVATED), status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(success_response(data=UserSerializer(user, context={"request": request}).data, detail=ApiMessage.DEACTIVATED, code=ApiCode.DEACTIVATED), status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        user = self.get_object()
        if user.is_active:
            return Response(error_response(detail=ApiMessage.ALREADY_ACTIVATED, code=ApiCode.ALREADY_ACTIVATED), status=status.HTTP_400_BAD_REQUEST)
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(success_response(data=UserSerializer(user, context={"request": request}).data, detail=ApiMessage.ACTIVATED, code=ApiCode.ACTIVATED), status=status.HTTP_200_OK)


class EmployeeProfileViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["employee_code", "user__username", "user__full_name"]
    ordering_fields = ["employee_code", "joined_date", "created_at", "updated_at"]
    ordering = ["employee_code"]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        qs = EmployeeProfile.objects.select_related("user")
        if user_is_owner(self.request.user) or self.request.user.role == UserRole.ADMIN:
            return qs
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        if user_is_owner(self.request.user) or self.request.user.role == UserRole.ADMIN:
            serializer.save()
            return
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        return Response(
            error_response(
                detail=ApiMessage.DELETE_NOT_ALLOWED,
                code=ApiCode.DELETE_NOT_ALLOWED,
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            ),
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        profile = self.get_object()
        user = profile.user
        if not user.is_active:
            return Response(
                error_response(detail=ApiMessage.ALREADY_DEACTIVATED, code=ApiCode.ALREADY_DEACTIVATED),
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(
            success_response(
                data=EmployeeProfileSerializer(profile, context={"request": request}).data,
                detail=ApiMessage.DEACTIVATED,
                code=ApiCode.DEACTIVATED,
            ),
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        profile = self.get_object()
        user = profile.user
        if user.is_active:
            return Response(
                error_response(detail=ApiMessage.ALREADY_ACTIVATED, code=ApiCode.ALREADY_ACTIVATED),
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(
            success_response(
                data=EmployeeProfileSerializer(profile, context={"request": request}).data,
                detail=ApiMessage.ACTIVATED,
                code=ApiCode.ACTIVATED,
            ),
            status=status.HTTP_200_OK,
        )
