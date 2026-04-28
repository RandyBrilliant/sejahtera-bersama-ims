import { createContext } from 'react'

import type { User } from '@/types/auth'

export type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<string>
  logout: () => Promise<void>
  /** Ambil ulang sesi dari server (mis. setelah menyimpan profil). */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
