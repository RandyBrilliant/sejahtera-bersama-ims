import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RouteFallback } from '@/components/route-fallback'
import { AuthProvider } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppAlert } from '@/components/ui/app-alert'

const LoginPage = lazy(() =>
  import('@/pages/login-page').then((m) => ({ default: m.LoginPage }))
)
const AdminAppShell = lazy(() =>
  import('@/components/dashboard/admin/admin-app-shell').then((m) => ({
    default: m.AdminAppShell,
  }))
)
const AdminHomePage = lazy(() =>
  import('@/pages/admin/admin-home-page').then((m) => ({ default: m.AdminHomePage }))
)
const AdminProfilePage = lazy(() =>
  import('@/pages/admin/admin-profile-page').then((m) => ({ default: m.AdminProfilePage }))
)
const AdminStaffPage = lazy(() =>
  import('@/pages/admin/admin-staff-page').then((m) => ({ default: m.AdminStaffPage }))
)
const AdminStaffNewPage = lazy(() =>
  import('@/pages/admin/admin-staff-new-page').then((m) => ({ default: m.AdminStaffNewPage }))
)
const AdminStaffEditPage = lazy(() =>
  import('@/pages/admin/admin-staff-edit-page').then((m) => ({ default: m.AdminStaffEditPage }))
)
const AdminCustomersPage = lazy(() =>
  import('@/pages/admin/admin-customers-page').then((m) => ({ default: m.AdminCustomersPage }))
)
const AdminCustomerNewPage = lazy(() =>
  import('@/pages/admin/admin-customer-new-page').then((m) => ({
    default: m.AdminCustomerNewPage,
  }))
)
const AdminCustomerEditPage = lazy(() =>
  import('@/pages/admin/admin-customer-edit-page').then((m) => ({
    default: m.AdminCustomerEditPage,
  }))
)
const AdminKasLayout = lazy(() =>
  import('@/pages/admin/admin-kas-layout').then((m) => ({ default: m.AdminKasLayout }))
)
const AdminKasCategoriesPage = lazy(() =>
  import('@/pages/admin/admin-kas-categories-page').then((m) => ({
    default: m.AdminKasCategoriesPage,
  }))
)
const AdminKasCategoryNewPage = lazy(() =>
  import('@/pages/admin/admin-kas-category-new-page').then((m) => ({
    default: m.AdminKasCategoryNewPage,
  }))
)
const AdminKasCategoryEditPage = lazy(() =>
  import('@/pages/admin/admin-kas-category-edit-page').then((m) => ({
    default: m.AdminKasCategoryEditPage,
  }))
)
const AdminKasEntriesPage = lazy(() =>
  import('@/pages/admin/admin-kas-entries-page').then((m) => ({
    default: m.AdminKasEntriesPage,
  }))
)
const AdminKasEntryNewPage = lazy(() =>
  import('@/pages/admin/admin-kas-entry-new-page').then((m) => ({
    default: m.AdminKasEntryNewPage,
  }))
)
const AdminKasEntryEditPage = lazy(() =>
  import('@/pages/admin/admin-kas-entry-edit-page').then((m) => ({
    default: m.AdminKasEntryEditPage,
  }))
)
const AdminInventoryPage = lazy(() =>
  import('@/pages/admin/admin-inventory-page').then((m) => ({ default: m.AdminInventoryPage }))
)
const AdminInventoryNewPage = lazy(() =>
  import('@/pages/admin/admin-inventory-new-page').then((m) => ({
    default: m.AdminInventoryNewPage,
  }))
)
const AdminInventoryEditPage = lazy(() =>
  import('@/pages/admin/admin-inventory-edit-page').then((m) => ({
    default: m.AdminInventoryEditPage,
  }))
)
const AdminInventoryPackagingNewPage = lazy(() =>
  import('@/pages/admin/admin-inventory-packaging-new-page').then((m) => ({
    default: m.AdminInventoryPackagingNewPage,
  }))
)
const AdminInventoryPackagingEditPage = lazy(() =>
  import('@/pages/admin/admin-inventory-packaging-edit-page').then((m) => ({
    default: m.AdminInventoryPackagingEditPage,
  }))
)
const AdminIngredientsPage = lazy(() =>
  import('@/pages/admin/admin-ingredients-page').then((m) => ({
    default: m.AdminIngredientsPage,
  }))
)
const AdminIngredientNewPage = lazy(() =>
  import('@/pages/admin/admin-ingredient-new-page').then((m) => ({
    default: m.AdminIngredientNewPage,
  }))
)
const AdminIngredientEditPage = lazy(() =>
  import('@/pages/admin/admin-ingredient-edit-page').then((m) => ({
    default: m.AdminIngredientEditPage,
  }))
)
const AdminIngredientInventoryPage = lazy(() =>
  import('@/pages/admin/admin-ingredient-inventory-page').then((m) => ({
    default: m.AdminIngredientInventoryPage,
  }))
)
const AdminIngredientInventoryEditPage = lazy(() =>
  import('@/pages/admin/admin-ingredient-inventory-edit-page').then((m) => ({
    default: m.AdminIngredientInventoryEditPage,
  }))
)
const AdminIngredientMovementsPage = lazy(() =>
  import('@/pages/admin/admin-ingredient-movements-page').then((m) => ({
    default: m.AdminIngredientMovementsPage,
  }))
)
const AdminIngredientMovementNewPage = lazy(() =>
  import('@/pages/admin/admin-ingredient-movement-new-page').then((m) => ({
    default: m.AdminIngredientMovementNewPage,
  }))
)
const AdminProductMovementsPage = lazy(() =>
  import('@/pages/admin/admin-product-movements-page').then((m) => ({
    default: m.AdminProductMovementsPage,
  }))
)
const AdminProductMovementNewPage = lazy(() =>
  import('@/pages/admin/admin-product-movement-new-page').then((m) => ({
    default: m.AdminProductMovementNewPage,
  }))
)
const AdminWarehousePage = lazy(() =>
  import('@/pages/admin/admin-warehouse-page').then((m) => ({
    default: m.AdminWarehousePage,
  }))
)
const AdminAnalyticsPage = lazy(() =>
  import('@/pages/admin/admin-analytics-page').then((m) => ({
    default: m.AdminAnalyticsPage,
  }))
)
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/admin-settings-page').then((m) => ({
    default: m.AdminSettingsPage,
  }))
)
const AdminOrdersLayout = lazy(() =>
  import('@/pages/admin/admin-orders-layout').then((m) => ({
    default: m.AdminOrdersLayout,
  }))
)
const AdminPurchaseOrdersListPage = lazy(() =>
  import('@/pages/admin/admin-purchase-orders-list-page').then((m) => ({
    default: m.AdminPurchaseOrdersListPage,
  }))
)
const AdminSalesOrdersListPage = lazy(() =>
  import('@/pages/admin/admin-sales-orders-list-page').then((m) => ({
    default: m.AdminSalesOrdersListPage,
  }))
)
const AdminPurchaseOrderNewPage = lazy(() =>
  import('@/pages/admin/admin-purchase-order-new-page').then((m) => ({
    default: m.AdminPurchaseOrderNewPage,
  }))
)
const AdminPurchaseOrderEditPage = lazy(() =>
  import('@/pages/admin/admin-purchase-order-edit-page').then((m) => ({
    default: m.AdminPurchaseOrderEditPage,
  }))
)
const AdminPurchaseOrderDetailPage = lazy(() =>
  import('@/pages/admin/admin-purchase-order-detail-page').then((m) => ({
    default: m.AdminPurchaseOrderDetailPage,
  }))
)
const AdminSalesOrderNewPage = lazy(() =>
  import('@/pages/admin/admin-sales-order-new-page').then((m) => ({
    default: m.AdminSalesOrderNewPage,
  }))
)
const AdminSalesOrderEditPage = lazy(() =>
  import('@/pages/admin/admin-sales-order-edit-page').then((m) => ({
    default: m.AdminSalesOrderEditPage,
  }))
)
const AdminSalesOrderDetailPage = lazy(() =>
  import('@/pages/admin/admin-sales-order-detail-page').then((m) => ({
    default: m.AdminSalesOrderDetailPage,
  }))
)
const WarehouseDashboardPage = lazy(() =>
  import('@/pages/warehouse-dashboard-page').then((m) => ({
    default: m.WarehouseDashboardPage,
  }))
)
const SalesDashboardPage = lazy(() =>
  import('@/pages/sales-dashboard-page').then((m) => ({
    default: m.SalesDashboardPage,
  }))
)
const FinanceDashboardPage = lazy(() =>
  import('@/pages/finance-dashboard-page').then((m) => ({
    default: m.FinanceDashboardPage,
  }))
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'LEADERSHIP']}>
                  <AdminAppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminHomePage />} />
              <Route path="profil" element={<AdminProfilePage />} />
              <Route path="staf/baru" element={<AdminStaffNewPage />} />
              <Route path="staf/:id/edit" element={<AdminStaffEditPage />} />
              <Route path="staf" element={<AdminStaffPage />} />
              <Route path="pelanggan/baru" element={<AdminCustomerNewPage />} />
              <Route path="pelanggan/:id/edit" element={<AdminCustomerEditPage />} />
              <Route path="pelanggan" element={<AdminCustomersPage />} />
              <Route path="kas" element={<AdminKasLayout />}>
                <Route index element={<Navigate to="entri" replace />} />
                <Route path="kategori/baru" element={<AdminKasCategoryNewPage />} />
                <Route path="kategori/:id/edit" element={<AdminKasCategoryEditPage />} />
                <Route path="kategori" element={<AdminKasCategoriesPage />} />
                <Route path="entri/baru" element={<AdminKasEntryNewPage />} />
                <Route path="entri/:id/edit" element={<AdminKasEntryEditPage />} />
                <Route path="entri" element={<AdminKasEntriesPage />} />
              </Route>
              <Route path="inventaris/baru" element={<AdminInventoryNewPage />} />
              <Route
                path="inventaris/kemasan/:packagingId/edit"
                element={<AdminInventoryPackagingEditPage />}
              />
              <Route
                path="inventaris/:productId/kemasan/baru"
                element={<AdminInventoryPackagingNewPage />}
              />
              <Route path="inventaris/:productId/edit" element={<AdminInventoryEditPage />} />
              <Route path="inventaris" element={<AdminInventoryPage />} />
              <Route path="gudang/bahan-baku/baru" element={<AdminIngredientNewPage />} />
              <Route
                path="gudang/bahan-baku/:ingredientId/edit"
                element={<AdminIngredientEditPage />}
              />
              <Route path="gudang/bahan-baku" element={<AdminIngredientsPage />} />
              <Route
                path="gudang/stok-bahan/:inventoryId/edit"
                element={<AdminIngredientInventoryEditPage />}
              />
              <Route path="gudang/stok-bahan" element={<AdminIngredientInventoryPage />} />
              <Route path="gudang/mutasi-bahan/baru" element={<AdminIngredientMovementNewPage />} />
              <Route path="gudang/mutasi-bahan" element={<AdminIngredientMovementsPage />} />
              <Route path="gudang/mutasi-produk/baru" element={<AdminProductMovementNewPage />} />
              <Route path="gudang/mutasi-produk" element={<AdminProductMovementsPage />} />
              <Route path="gudang" element={<AdminWarehousePage />} />
              <Route path="pesanan" element={<AdminOrdersLayout />}>
                <Route index element={<Navigate to="penjualan" replace />} />
                <Route path="pembelian/baru" element={<AdminPurchaseOrderNewPage />} />
                <Route
                  path="pembelian/:orderId/edit"
                  element={<AdminPurchaseOrderEditPage />}
                />
                <Route
                  path="pembelian/:orderId"
                  element={<AdminPurchaseOrderDetailPage />}
                />
                <Route path="pembelian" element={<AdminPurchaseOrdersListPage />} />
                <Route path="penjualan/baru" element={<AdminSalesOrderNewPage />} />
                <Route path="penjualan/:orderId/edit" element={<AdminSalesOrderEditPage />} />
                <Route path="penjualan/:orderId" element={<AdminSalesOrderDetailPage />} />
                <Route path="penjualan" element={<AdminSalesOrdersListPage />} />
              </Route>
              <Route path="analitik" element={<AdminAnalyticsPage />} />
              <Route path="pengaturan" element={<AdminSettingsPage />} />
            </Route>
            <Route
              path="/warehouse/dashboard"
              element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_STAFF']}>
                  <WarehouseDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SALES_STAFF']}>
                  <SalesDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/dashboard"
              element={
                <ProtectedRoute allowedRoles={['FINANCE_STAFF']}>
                  <FinanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        <AppAlert />
      </BrowserRouter>
    </AuthProvider>
  )
}
