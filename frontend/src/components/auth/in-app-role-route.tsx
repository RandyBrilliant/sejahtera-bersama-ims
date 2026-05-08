import { Navigate, Outlet } from 'react-router-dom'
import { type ReactNode } from 'react'

import { useAuth } from '@/hooks/use-auth'
import type { UserRole } from '@/types/auth'

type InAppRoleRouteProps = {
  allowedRoles: readonly UserRole[]
  children?: ReactNode
}

export function InAppRoleRoute({ allowedRoles, children }: InAppRoleRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to="/admin/dashboard" replace />
  if (children) return <>{children}</>
  return <Outlet />
}
