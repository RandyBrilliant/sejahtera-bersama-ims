import type { UserRole } from '@/types/auth'

export interface EmployeeProfileDto {
  id: number
  employee_code: string
  joined_date: string | null
  created_at: string
  updated_at: string
}

export interface SystemUser {
  id: number
  username: string
  full_name: string
  role: UserRole
  phone_number: string
  is_active: boolean
  date_joined: string
  last_login: string | null
  created_at: string
  updated_at: string
  employee_profile: EmployeeProfileDto | null
}

export interface PaginatedUsersResponse {
  count: number
  next: string | null
  previous: string | null
  results: SystemUser[]
}

export type UsersListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  role?: UserRole | ''
  is_active?: boolean
}

export type SystemUserCreateInput = {
  username: string
  password: string
  full_name: string
  role: UserRole
  phone_number?: string
}

export type SystemUserUpdateInput = {
  username?: string
  full_name?: string
  role?: UserRole
  phone_number?: string
  password?: string
}
