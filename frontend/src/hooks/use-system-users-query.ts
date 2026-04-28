import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  activateSystemUser,
  createSystemUser,
  deactivateSystemUser,
  fetchUser,
  fetchUsers,
  updateSystemUser,
} from '@/api/system-users'
import type {
  SystemUserCreateInput,
  SystemUserUpdateInput,
  UsersListParams,
} from '@/types/system-user'

export const systemUsersKeys = {
  all: ['system-users'] as const,
  lists: () => [...systemUsersKeys.all, 'list'] as const,
  list: (params: UsersListParams) => [...systemUsersKeys.lists(), params] as const,
  details: () => [...systemUsersKeys.all, 'detail'] as const,
  detail: (id: number) => [...systemUsersKeys.details(), id] as const,
}

export function useSystemUsersQuery(params: UsersListParams) {
  return useQuery({
    queryKey: systemUsersKeys.list(params),
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useSystemUserQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: systemUsersKeys.detail(id ?? 0),
    queryFn: () => fetchUser(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useCreateSystemUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SystemUserCreateInput) => createSystemUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.lists() })
    },
  })
}

export function useUpdateSystemUserMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<SystemUserUpdateInput>) => updateSystemUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.detail(id) })
    },
  })
}

export function useDeactivateSystemUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => deactivateSystemUser(userId),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.detail(userId) })
    },
  })
}

export function useActivateSystemUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => activateSystemUser(userId),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: systemUsersKeys.detail(userId) })
    },
  })
}
