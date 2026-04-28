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
const AdminPlaceholderPage = lazy(() =>
  import('@/pages/admin/admin-placeholder-page').then((m) => ({
    default: m.AdminPlaceholderPage,
  }))
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
              <Route
                path="inventaris"
                element={
                  <AdminPlaceholderPage
                    title="Inventaris"
                    description="Kelola master barang, level stok minimum, dan kategori. Siap untuk tabel data, filter, dan aksi massal begitu API tersedia."
                  />
                }
              />
              <Route
                path="pesanan"
                element={
                  <AdminPlaceholderPage
                    title="Pesanan"
                    description="Alur pembelian & penjualan serta status pesanan akan ditampilkan di sini untuk tim admin dan pimpinan."
                  />
                }
              />
              <Route
                path="pengiriman"
                element={
                  <AdminPlaceholderPage
                    title="Pengiriman"
                    description="Pantau pengiriman, kurir, dan SLA logistik — placeholder layout hingga integrasi pengiriman."
                  />
                }
              />
              <Route
                path="gudang"
                element={
                  <AdminPlaceholderPage
                    title="Gudang"
                    description="Operasi gudang: lokasi rak, pergerakan barang, dan slot penyimpanan. Struktur halaman mengikuti kebutuhan IMS."
                  />
                }
              />
              <Route
                path="analitik"
                element={
                  <AdminPlaceholderPage
                    title="Analitik"
                    description="Ringkasan KPI mendalam, tren penjualan, dan laporan eksekutif. Grafik dapat ditambahkan setelah sumber data siap."
                  />
                }
              />
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
