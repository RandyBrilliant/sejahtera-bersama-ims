from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DailyInventoryRecapView,
    IngredientInventoryViewSet,
    IngredientStockMovementViewSet,
    IngredientViewSet,
    InventorySummaryView,
    ProductPackagingViewSet,
    ProductStockMovementViewSet,
    ProductViewSet,
    ProductionBatchViewSet,
    RangeInventoryRecapView,
)

app_name = "inventory"

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="products")
router.register(r"product-packaging", ProductPackagingViewSet, basename="product-packaging")
router.register(r"ingredients", IngredientViewSet, basename="ingredients")
router.register(r"ingredient-inventory", IngredientInventoryViewSet, basename="ingredient-inventory")
router.register(r"ingredient-stock-movements", IngredientStockMovementViewSet, basename="ingredient-stock-movements")
router.register(r"product-stock-movements", ProductStockMovementViewSet, basename="product-stock-movements")
router.register(r"production-batches", ProductionBatchViewSet, basename="production-batches")

urlpatterns = [
    path("summary/", InventorySummaryView.as_view(), name="inventory-summary"),
    path("summary/daily/", DailyInventoryRecapView.as_view(), name="inventory-summary-daily"),
    path("summary/range/", RangeInventoryRecapView.as_view(), name="inventory-summary-range"),
    path("", include(router.urls)),
]
