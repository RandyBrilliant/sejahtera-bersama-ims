import { api } from '@/lib/api'
import type {
  PaginatedUsersResponse,
  SystemUser,
  SystemUserCreateInput,
  SystemUserUpdateInput,
  UsersListParams,
} from '@/types/system-user'

type ApiWrappedUser = { data: SystemUser; code?: string; detail?: string }

function buildListQuery(params: UsersListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.role) search.set('role', params.role)
  if (params.is_active !== undefined) {
    search.set('is_active', String(params.is_active))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchUsers(params: UsersListParams): Promise<PaginatedUsersResponse> {
  const { data } = await api.get<PaginatedUsersResponse>(
    `/api/account/users/${buildListQuery(params)}`
  )
  return data
}

export async function fetchUser(id: number): Promise<SystemUser> {
  const { data } = await api.get<SystemUser>(`/api/account/users/${id}/`)
  return data
}

export async function createSystemUser(body: SystemUserCreateInput): Promise<SystemUser> {
  const { data } = await api.post<SystemUser>('/api/account/users/', body)
  return data
}

export async function updateSystemUser(
  id: number,
  body: Partial<SystemUserUpdateInput>
): Promise<SystemUser> {
  const { data } = await api.patch<SystemUser>(`/api/account/users/${id}/`, body)
  return data
}

export async function deactivateSystemUser(id: number): Promise<SystemUser> {
  const { data } = await api.post<ApiWrappedUser>(`/api/account/users/${id}/deactivate/`)
  return data.data
}

export async function activateSystemUser(id: number): Promise<SystemUser> {
  const { data } = await api.post<ApiWrappedUser>(`/api/account/users/${id}/activate/`)
  return data.data
}
