"""
FilterSet untuk app account (daftar pengguna admin, dll.).
"""
import django_filters

from .models import CustomUser, UserRole


class UserListFilterSet(django_filters.FilterSet):
    """Filter daftar pengguna untuk admin (`UserViewSet`)."""

    role = django_filters.ChoiceFilter(choices=UserRole.choices)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = CustomUser
        fields = ["role", "is_active"]
