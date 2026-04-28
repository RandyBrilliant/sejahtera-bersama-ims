import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'

import { useAuth } from '@/hooks/use-auth'
import type { UserRole } from '@/types/auth'

type ProtectedRouteProps = {
  allowedRoles: UserRole[]
  children: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="page-enter flex min-h-screen items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
        <span className="sr-only">Memuat</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
