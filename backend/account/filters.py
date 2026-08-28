"""
FilterSet untuk app account (daftar pengguna admin, dll.).
"""
import django_filters
from rest_framework.fields import CharField
from rest_framework.filters import SearchFilter

from .models import CustomUser, UserRole


class PhraseSearchFilter(SearchFilter):
    """Match ``?search=`` as one substring instead of whitespace-split tokens.

    DRF's default SearchFilter splits the query on spaces/commas, then requires
    every token to appear in *any* of ``search_fields``. Searching ``bakar kayu``
    therefore also matches a ``bakar mobil`` row when another field (often
    ``category__name``) contains ``kayu``.
    """

    def get_search_terms(self, request):
        value = request.query_params.get(self.search_param, "")
        field = CharField(trim_whitespace=True, allow_blank=True)
        cleaned = (field.run_validation(value) or "").strip()
        return [cleaned] if cleaned else []


class UserListFilterSet(django_filters.FilterSet):
    """Filter daftar pengguna untuk admin (`UserViewSet`)."""

    role = django_filters.ChoiceFilter(choices=UserRole.choices)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = CustomUser
        fields = ["role", "is_active"]
