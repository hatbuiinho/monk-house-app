import React, { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import useDialogState from '@/hooks/use-dialog-state'
import type { User, UserStatus, UserRole, UserError } from '../data/schema'
import { usersAPI } from '../data/users'

type UsersDialogType = 'invite' | 'add' | 'edit' | 'delete'

type UsersFilter = {
  page?: number
  perPage?: number
  sort?: string
  status?: UserStatus
  role?: UserRole
  search?: string
}

type UsersContextType = {
  // Dialog state
  open: UsersDialogType | null
  setOpen: (str: UsersDialogType | null) => void
  currentRow: User | null
  setCurrentRow: React.Dispatch<React.SetStateAction<User | null>>

  // Data and loading states
  users: User[]
  isLoading: boolean
  error: Error | null

  // Pagination
  totalItems: number
  currentPage: number
  perPage: number
  totalPages: number

  // Actions
  refetch: () => void
  createUser: (user: {
    name: string
    username: string
    email: string
    phoneNumber: string
    status: UserStatus
    role: UserRole
  }) => Promise<void>
  updateUser: (
    id: string,
    user: Partial<{
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }>
  ) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  deleteUsers: (ids: string[]) => Promise<void>

  // Filtering
  filters: UsersFilter
  setFilters: (filters: UsersFilter) => void
  clearFilters: () => void

  // Statistics
  stats:
    | {
        total: number
        by_status: Record<UserStatus, number>
        by_role: Record<UserRole, number>
      }
    | undefined
  refetchStats: () => void
}

const UsersContext = React.createContext<UsersContextType | null>(null)

const defaultFilters: UsersFilter = {
  page: 1,
  perPage: 20,
  sort: '-created',
}

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<UsersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<User | null>(null)
  const [filters, setFilters] = useState<UsersFilter>(defaultFilters)
  const queryClient = useQueryClient()

  // Query for users
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersAPI.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  //TODO: Query for statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['users-stats'],
    queryFn: () => usersAPI.getUserStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (user: {
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }) => usersAPI.createUser(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('User created successfully')
      setOpen(null)
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to create user')
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({
      id,
      user,
    }: {
      id: string
      user: Partial<{
        name: string
        username: string
        email: string
        phoneNumber: string
        status: UserStatus
        role: UserRole
      }>
    }) => usersAPI.updateUser(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('User updated successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to update user')
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('User deleted successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to delete user')
    },
  })

  // Bulk delete users mutation
  const deleteUsersMutation = useMutation({
    mutationFn: (ids: string[]) => usersAPI.deleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('Users deleted successfully')
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to delete users')
    },
  })

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = usersAPI.subscribeToUsers((action, user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })

      // Show toast for real-time updates
      const actionMessages = {
        create: 'New user created',
        update: 'User updated',
        delete: 'User deleted',
      }
      toast.info(`${actionMessages[action]}: ${user.name}`)
    })

    return unsubscribe
  }, [queryClient])

  // Actions
  const createUser = async (user: {
    name: string
    username: string
    email: string
    phoneNumber: string
    status: UserStatus
    role: UserRole
  }) => {
    await createUserMutation.mutateAsync(user)
  }

  const updateUser = async (
    id: string,
    user: Partial<{
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }>
  ) => {
    await updateUserMutation.mutateAsync({ id, user })
  }

  const deleteUser = async (id: string) => {
    await deleteUserMutation.mutateAsync(id)
  }

  const deleteUsers = async (ids: string[]) => {
    await deleteUsersMutation.mutateAsync(ids)
  }

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const contextValue: UsersContextType = {
    // Dialog state
    open,
    setOpen,
    currentRow,
    setCurrentRow,

    // Data and loading states
    users: usersData?.items || [],
    isLoading,
    error: error as Error | null,

    // Pagination
    totalItems: usersData?.totalItems || 0,
    currentPage: usersData?.page || 1,
    perPage: usersData?.perPage || 20,
    totalPages: usersData?.totalPages || 1,

    // Actions
    refetch,
    createUser,
    updateUser,
    deleteUser,
    deleteUsers,

    // Filtering
    filters,
    setFilters,
    clearFilters,

    // Statistics
    stats,
    refetchStats,
  }

  return (
    <UsersContext.Provider value={contextValue}>
      {children}
    </UsersContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUsers = () => {
  const usersContext = React.useContext(UsersContext)

  if (!usersContext) {
    throw new Error('useUsers has to be used within <UsersContext>')
  }

  return usersContext
}
