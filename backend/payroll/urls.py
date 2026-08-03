from django.urls import path

from payroll import views

app_name = "payroll"

urlpatterns = [
    path(
        "compensation/table/",
        views.EmployeeCompensationTableView.as_view(),
        name="compensation-table",
    ),
    path(
        "compensation/<int:user_id>/",
        views.EmployeeCompensationByUserView.as_view(),
        name="compensation-by-user",
    ),
    path("compensation/me/", views.EmployeeCompensationMeView.as_view(), name="compensation-me"),
    path("kupas-items/", views.KupasItemListCreateView.as_view(), name="kupas-item-list-create"),
    path("kupas-items/<int:pk>/", views.KupasItemDetailView.as_view(), name="kupas-item-detail"),
    path(
        "kupas-records/",
        views.KupasProductionRecordListCreateView.as_view(),
        name="kupas-record-list-create",
    ),
    path(
        "kupas-records/<int:pk>/",
        views.KupasProductionRecordDetailView.as_view(),
        name="kupas-record-detail",
    ),
    path("periods/", views.PayrollPeriodListCreateView.as_view(), name="period-list-create"),
    path(
        "periods/<int:pk>/",
        views.PayrollPeriodDetailView.as_view(),
        name="period-detail",
    ),
    path(
        "periods/<int:pk>/generate/",
        views.PayrollPeriodGenerateView.as_view(),
        name="period-generate",
    ),
    path(
        "periods/<int:pk>/finalize/",
        views.PayrollPeriodFinalizeView.as_view(),
        name="period-finalize",
    ),
    path(
        "periods/<int:pk>/unfinalize/",
        views.PayrollPeriodUnfinalizeView.as_view(),
        name="period-unfinalize",
    ),
    path(
        "periods/<int:pk>/entries/",
        views.PayrollEntryListView.as_view(),
        name="period-entry-list",
    ),
    path(
        "periods/<int:pk>/entries/<int:entry_id>/slip/",
        views.PayrollEntrySlipView.as_view(),
        name="period-entry-slip",
    ),
    path(
        "periods/<int:pk>/entries/<int:entry_id>/",
        views.PayrollEntryAdjustView.as_view(),
        name="period-entry-adjust",
    ),
    path("me/entries/<int:period_id>/slip/", views.PayrollMeEntrySlipView.as_view(), name="me-entry-slip"),
    path("me/entries/", views.PayrollMeEntriesView.as_view(), name="me-entries"),
]
