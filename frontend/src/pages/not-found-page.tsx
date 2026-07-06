import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="page-enter flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-on-surface font-heading text-2xl font-semibold">Halaman tidak ditemukan</p>
      <p className="text-on-surface-variant max-w-md text-sm">
        URL yang Anda buka tidak ada atau sudah dipindahkan.
      </p>
      <Button asChild variant="outline">
        <Link to={isAuthenticated ? '/admin/dashboard' : '/login'}>
          {isAuthenticated ? 'Kembali ke dasbor' : 'Ke halaman login'}
        </Link>
      </Button>
    </div>
  )
}
