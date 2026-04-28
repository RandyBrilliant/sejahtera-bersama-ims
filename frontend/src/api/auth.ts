import { api } from '@/lib/api'
import type { User } from '@/types/auth'

type ApiSuccessResponse<T> = {
  success: boolean
  detail: string
  code: string
  data: T
}

type LoginResponseData = {
  user: User
  access: string
  refresh: string
}

export async function login(credentials: {
  username: string
  password: string
}): Promise<User> {
  const { data } = await api.post<ApiSuccessResponse<LoginResponseData>>(
    '/api/account/auth/login/',
    credentials
  )
  if (!data.data?.user) {
    throw new Error('Invalid login response from server')
  }
  return data.data.user
}

export async function logout(): Promise<void> {
  await api.post('/api/account/auth/logout/')
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<ApiSuccessResponse<User>>('/api/account/me/')
  if (!data.data?.id) {
    throw new Error('Failed to fetch current user')
  }
  return data.data
}

export async function updateMe(
  body: Partial<Pick<User, 'full_name' | 'phone_number'>>
): Promise<User> {
  const { data } = await api.patch<ApiSuccessResponse<User>>('/api/account/me/', body)
  if (!data.data?.id) {
    throw new Error('Gagal memperbarui profil')
  }
  return data.data
}

export async function changePassword(body: {
  old_password: string
  new_password: string
}): Promise<void> {
  await api.post('/api/account/auth/change-password/', body)
}
