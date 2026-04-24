from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OperationalCashEntryViewSet,
    OperationalCashReportView,
    OperationalCashSummaryView,
    OperationalCategoryViewSet,
)

app_name = "expenses"

router = DefaultRouter()
router.register(r"categories", OperationalCategoryViewSet, basename="operational-categories")
router.register(r"entries", OperationalCashEntryViewSet, basename="operational-cash-entries")

urlpatterns = [
    path("summary/", OperationalCashSummaryView.as_view(), name="operational-cash-summary"),
    path("report/", OperationalCashReportView.as_view(), name="operational-cash-report"),
    path("", include(router.urls)),
]
