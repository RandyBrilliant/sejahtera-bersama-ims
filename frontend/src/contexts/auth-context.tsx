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
import { isPublicAppPath } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { getDashboardRouteForRole, type User } from '@/types/auth'

function clearClientSessionState() {
  queryClient.clear()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Public kiosk pages must not call /me — a 401 would bounce guests to /login.
    if (typeof window !== 'undefined' && isPublicAppPath(window.location.pathname)) {
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    async function bootstrapSession() {
      try {
        const me = await getMe()
        if (!mounted) return
        if (me.role === 'KUPAS_STAFF') {
          try {
            await logoutApi()
          } catch {
            // ignore — session must not stay active for kupas staff
          }
          clearClientSessionState()
          setUser(null)
          return
        }
        setUser(me)
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
    if (loggedInUser.role === 'KUPAS_STAFF') {
      try {
        await logoutApi()
      } catch {
        // ignore
      }
      clearClientSessionState()
      setUser(null)
      const err = new Error(
        'Akun staf kupas tidak dapat masuk ke sistem. Hubungi administrator.'
      ) as Error & { response?: { data?: { detail?: string } } }
      err.response = {
        data: {
          detail: 'Akun staf kupas tidak dapat masuk ke sistem. Hubungi administrator.',
        },
      }
      throw err
    }
    setUser(loggedInUser)
    alert.success('Login berhasil', `Selamat datang, ${loggedInUser.full_name || loggedInUser.username}`)
    return getDashboardRouteForRole(loggedInUser.role)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      clearClientSessionState()
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
