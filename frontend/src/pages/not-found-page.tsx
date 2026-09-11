import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { getDashboardRouteForRole } from '@/types/auth'

export function NotFoundPage() {
  const { isAuthenticated, user } = useAuth()
  const home = isAuthenticated && user ? getDashboardRouteForRole(user.role) : '/login'

  return (
    <div className="page-enter flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-on-surface font-heading text-2xl font-semibold">Halaman tidak ditemukan</p>
      <p className="text-on-surface-variant max-w-md text-sm">
        URL yang Anda buka tidak ada atau sudah dipindahkan.
      </p>
      <Button asChild variant="outline">
        <Link to={home}>
          {isAuthenticated ? 'Kembali ke beranda' : 'Ke halaman login'}
        </Link>
      </Button>
    </div>
  )
}
