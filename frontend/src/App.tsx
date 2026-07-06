import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RouteFallback } from '@/components/route-fallback'
import { AuthProvider } from '@/contexts/auth-context'
import { InAppRoleRoute } from '@/components/auth/in-app-role-route'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppAlert } from '@/components/ui/app-alert'

const LoginPage = lazy(() =>
  import('@/pages/login-page').then((m) => ({ default: m.LoginPage }))
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage }))
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
const AdminProfileLayout = lazy(() =>
  import('@/pages/admin/admin-profile-layout').then((m) => ({ default: m.AdminProfileLayout }))
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
const AdminWarehouseLayout = lazy(() =>
  import('@/pages/admin/admin-warehouse-layout').then((m) => ({
    default: m.AdminWarehouseLayout,
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
const AdminAttendanceTabletPage = lazy(() =>
  import('@/pages/admin/admin-attendance-tablet-page').then((m) => ({
    default: m.AdminAttendanceTabletPage,
  }))
)
const AdminAttendanceScanPage = lazy(() =>
  import('@/pages/admin/admin-attendance-scan-page').then((m) => ({
    default: m.AdminAttendanceScanPage,
  }))
)
const AdminAttendanceSettingsPage = lazy(() =>
  import('@/pages/admin/admin-attendance-settings-page').then((m) => ({
    default: m.AdminAttendanceSettingsPage,
  }))
)
const AdminAttendanceReportPage = lazy(() =>
  import('@/pages/admin/admin-attendance-report-page').then((m) => ({
    default: m.AdminAttendanceReportPage,
  }))
)
const AdminAttendanceLayout = lazy(() =>
  import('@/pages/admin/admin-attendance-layout').then((m) => ({
    default: m.AdminAttendanceLayout,
  }))
)
const AdminAttendanceIndexRedirect = lazy(() =>
  import('@/pages/admin/admin-attendance-layout').then((m) => ({
    default: m.AdminAttendanceIndexRedirect,
  }))
)
const AdminPayrollPeriodsPage = lazy(() =>
  import('@/pages/admin/admin-payroll-periods-page').then((m) => ({
    default: m.AdminPayrollPeriodsPage,
  }))
)
const AdminPayrollLayout = lazy(() =>
  import('@/pages/admin/admin-payroll-layout').then((m) => ({
    default: m.AdminPayrollLayout,
  }))
)
const AdminPayrollCompensationPage = lazy(() =>
  import('@/pages/admin/admin-payroll-compensation-page').then((m) => ({
    default: m.AdminPayrollCompensationPage,
  }))
)
const AdminPayrollKupasItemsPage = lazy(() =>
  import('@/pages/admin/admin-payroll-kupas-items-page').then((m) => ({
    default: m.AdminPayrollKupasItemsPage,
  }))
)
const AdminPayrollKupasEntryPage = lazy(() =>
  import('@/pages/admin/admin-payroll-kupas-entry-page').then((m) => ({
    default: m.AdminPayrollKupasEntryPage,
  }))
)
const AdminPayrollPeriodDetailPage = lazy(() =>
  import('@/pages/admin/admin-payroll-period-detail-page').then((m) => ({
    default: m.AdminPayrollPeriodDetailPage,
  }))
)
const AdminPayrollEntrySlipPage = lazy(() =>
  import('@/pages/admin/admin-payroll-entry-slip-page').then((m) => ({
    default: m.AdminPayrollEntrySlipPage,
  }))
)
const AdminMyAttendancePage = lazy(() =>
  import('@/pages/admin/admin-my-attendance-page').then((m) => ({
    default: m.AdminMyAttendancePage,
  }))
)
const AdminMyPayrollPage = lazy(() =>
  import('@/pages/admin/admin-my-payroll-page').then((m) => ({
    default: m.AdminMyPayrollPage,
  }))
)
const AdminMyPayrollSlipPage = lazy(() =>
  import('@/pages/admin/admin-my-payroll-slip-page').then((m) => ({
    default: m.AdminMyPayrollSlipPage,
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
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin/absensi/scan"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'LEADERSHIP']}>
                  <AdminAttendanceScanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'ADMIN',
                    'LEADERSHIP',
                    'WAREHOUSE_STAFF',
                    'SALES_STAFF',
                    'FINANCE_STAFF',
                  ]}
                >
                  <AdminAppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminHomePage />} />
              <Route path="profil" element={<AdminProfileLayout />}>
                <Route index element={<AdminProfilePage />} />
                <Route path="presensi" element={<AdminMyAttendancePage />} />
                <Route path="slip-gaji" element={<AdminMyPayrollPage />} />
                <Route path="slip-gaji/:periodId" element={<AdminMyPayrollSlipPage />} />
              </Route>
              <Route
                element={
                  <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF']} />
                }
              >
                <Route path="gudang" element={<AdminWarehouseLayout />}>
                  <Route index element={<AdminWarehousePage />} />
                  <Route path="bahan-baku/baru" element={<AdminIngredientNewPage />} />
                  <Route
                    path="bahan-baku/:ingredientId/edit"
                    element={<AdminIngredientEditPage />}
                  />
                  <Route path="bahan-baku" element={<AdminIngredientsPage />} />
                  <Route
                    path="stok-bahan/:inventoryId/edit"
                    element={<AdminIngredientInventoryEditPage />}
                  />
                  <Route path="stok-bahan" element={<AdminIngredientInventoryPage />} />
                  <Route path="mutasi-bahan/baru" element={<AdminIngredientMovementNewPage />} />
                  <Route path="mutasi-bahan" element={<AdminIngredientMovementsPage />} />
                  <Route path="mutasi-produk/baru" element={<AdminProductMovementNewPage />} />
                  <Route path="mutasi-produk" element={<AdminProductMovementsPage />} />
                </Route>
              </Route>

              <Route
                element={
                  <InAppRoleRoute
                    allowedRoles={['ADMIN', 'LEADERSHIP', 'SALES_STAFF', 'FINANCE_STAFF']}
                  />
                }
              >
                <Route path="pelanggan" element={<AdminCustomersPage />} />
              </Route>
              <Route
                element={
                  <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'SALES_STAFF']} />
                }
              >
                <Route path="pelanggan/baru" element={<AdminCustomerNewPage />} />
                <Route path="pelanggan/:id/edit" element={<AdminCustomerEditPage />} />
              </Route>
              <Route path="saya/presensi" element={<Navigate to="/admin/profil/presensi" replace />} />
              <Route path="saya/gaji" element={<Navigate to="/admin/profil/slip-gaji" replace />} />
              <Route path="absensi" element={<AdminAttendanceLayout />}>
                <Route index element={<AdminAttendanceIndexRedirect />} />
                <Route element={<InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP']} />}>
                  <Route path="tablet" element={<AdminAttendanceTabletPage />} />
                  <Route path="pengaturan" element={<AdminAttendanceSettingsPage />} />
                </Route>
                <Route
                  element={
                    <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF']} />
                  }
                >
                  <Route path="laporan" element={<AdminAttendanceReportPage />} />
                </Route>
              </Route>
              <Route
                element={
                  <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF']} />
                }
              >
                <Route path="gaji" element={<AdminPayrollLayout />}>
                  <Route index element={<AdminPayrollPeriodsPage />} />
                  <Route path="kompensasi" element={<AdminPayrollCompensationPage />} />
                  <Route path="jenis-kupas" element={<AdminPayrollKupasItemsPage />} />
                  <Route path="input-kupas" element={<AdminPayrollKupasEntryPage />} />
                  <Route path=":periodId/slip/:entryId" element={<AdminPayrollEntrySlipPage />} />
                  <Route path=":periodId" element={<AdminPayrollPeriodDetailPage />} />
                </Route>
              </Route>
              <Route
                element={
                  <InAppRoleRoute
                    allowedRoles={[
                      'ADMIN',
                      'LEADERSHIP',
                      'WAREHOUSE_STAFF',
                      'SALES_STAFF',
                    ]}
                  />
                }
              >
                <Route path="inventaris" element={<AdminInventoryPage />} />
              </Route>
              <Route path="pesanan" element={<AdminOrdersLayout />}>
                <Route index element={<Navigate to="penjualan" replace />} />
                <Route
                  element={
                    <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF']} />
                  }
                >
                  <Route path="pembelian/baru" element={<AdminPurchaseOrderNewPage />} />
                  <Route path="pembelian/:orderId/edit" element={<AdminPurchaseOrderEditPage />} />
                </Route>
                <Route
                  element={
                    <InAppRoleRoute
                      allowedRoles={[
                        'ADMIN',
                        'LEADERSHIP',
                        'WAREHOUSE_STAFF',
                        'FINANCE_STAFF',
                      ]}
                    />
                  }
                >
                  <Route path="pembelian/:orderId" element={<AdminPurchaseOrderDetailPage />} />
                  <Route path="pembelian" element={<AdminPurchaseOrdersListPage />} />
                </Route>
                <Route
                  element={
                    <InAppRoleRoute
                      allowedRoles={['ADMIN', 'LEADERSHIP', 'SALES_STAFF', 'FINANCE_STAFF']}
                    />
                  }
                >
                  <Route path="penjualan/:orderId" element={<AdminSalesOrderDetailPage />} />
                  <Route path="penjualan" element={<AdminSalesOrdersListPage />} />
                </Route>
                <Route
                  element={
                    <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'SALES_STAFF']} />
                  }
                >
                  <Route path="penjualan/baru" element={<AdminSalesOrderNewPage />} />
                  <Route path="penjualan/:orderId/edit" element={<AdminSalesOrderEditPage />} />
                </Route>
              </Route>

              <Route
                element={
                  <InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF']} />
                }
              >
                <Route path="kas" element={<AdminKasLayout />}>
                  <Route index element={<Navigate to="entri" replace />} />
                  <Route path="kategori/baru" element={<AdminKasCategoryNewPage />} />
                  <Route path="kategori/:id/edit" element={<AdminKasCategoryEditPage />} />
                  <Route path="kategori" element={<AdminKasCategoriesPage />} />
                  <Route path="entri/baru" element={<AdminKasEntryNewPage />} />
                  <Route path="entri/:id/edit" element={<AdminKasEntryEditPage />} />
                  <Route path="entri" element={<AdminKasEntriesPage />} />
                </Route>
                <Route path="analitik" element={<AdminAnalyticsPage />} />
              </Route>
              <Route element={<InAppRoleRoute allowedRoles={['ADMIN', 'LEADERSHIP']} />}>
                <Route path="staf/baru" element={<AdminStaffNewPage />} />
                <Route path="staf/:id/edit" element={<AdminStaffEditPage />} />
                <Route path="staf" element={<AdminStaffPage />} />
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
                <Route path="pengaturan" element={<AdminSettingsPage />} />
              </Route>
            </Route>
            <Route
              path="/warehouse/dashboard"
              element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_STAFF']}>
                  <Navigate to="/admin/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SALES_STAFF']}>
                  <Navigate to="/admin/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/dashboard"
              element={
                <ProtectedRoute allowedRoles={['FINANCE_STAFF']}>
                  <Navigate to="/admin/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <AppAlert />
      </BrowserRouter>
    </AuthProvider>
  )
}
