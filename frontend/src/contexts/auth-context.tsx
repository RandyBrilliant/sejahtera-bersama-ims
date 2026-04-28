import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getMe, login as loginApi, logout as logoutApi } from '@/api/auth'
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context-object'
import { alert } from '@/lib/alert'
import { getDashboardRouteForRole, type User } from '@/types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function bootstrapSession() {
      try {
        const me = await getMe()
        if (mounted) setUser(me)
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    bootstrapSession()
    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const loggedInUser = await loginApi({ username, password })
    setUser(loggedInUser)
    alert.success('Login berhasil', `Selamat datang, ${loggedInUser.full_name || loggedInUser.username}`)
    return getDashboardRouteForRole(loggedInUser.role)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      setUser(null)
      alert.info('Logout berhasil', 'Anda telah keluar dari aplikasi.')
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
