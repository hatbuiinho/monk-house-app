import { create } from 'zustand'
import type { User, UserStatus, UserRole } from './schema'

type UsersDialogType = 'invite' | 'add' | 'edit' | 'delete'

type UsersFilter = {
  page?: number
  perPage?: number
  sort?: string
  status?: UserStatus
  role?: UserRole
  search?: string
}

type UsersStore = {
  // Dialog state
  open: UsersDialogType | null
  setOpen: (str: UsersDialogType | null) => void
  currentRow: User | null
  setCurrentRow: (user: User | null) => void

  // Data and loading states
  users: User[]
  setUsers: (users: User[]) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  error: Error | null
  setError: (error: Error | null) => void

  // Pagination
  totalItems: number
  setTotalItems: (totalItems: number) => void
  currentPage: number
  setCurrentPage: (currentPage: number) => void
  perPage: number
  setPerPage: (perPage: number) => void
  totalPages: number
  setTotalPages: (totalPages: number) => void

  // Actions
  refetch: () => void
  setRefetch: (refetch: () => void) => void
  createUser: (user: {
    name: string
    username: string
    email: string
    phoneNumber: string
    status: UserStatus
    role: UserRole
  }) => Promise<void>
  setCreateUser: (
    createUser: (user: {
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }) => Promise<void>
  ) => void
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
  setUpdateUser: (
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
  ) => void
  deleteUser: (id: string) => Promise<void>
  setDeleteUser: (deleteUser: (id: string) => Promise<void>) => void
  deleteUsers: (ids: string[]) => Promise<void>
  setDeleteUsers: (deleteUsers: (ids: string[]) => Promise<void>) => void

  // Filtering
  filters: UsersFilter
  setFilters: (filters: UsersFilter) => void
  clearFilters: () => void

  // Statistics
  stats:
    | {
        total: number
        by_status: Record<UserStatus, number>
        by_role: Record<UserRole['code'], number>
      }
    | undefined
  setStats: (
    stats:
      | {
          total: number
          by_status: Record<UserStatus, number>
          by_role: Record<UserRole['code'], number>
        }
      | undefined
  ) => void
  refetchStats: () => void
  setRefetchStats: (refetchStats: () => void) => void
}

export const useUsersStore = create<UsersStore>((set) => ({
  // Dialog state
  open: null,
  setOpen: (str) => set({ open: str }),
  currentRow: null,
  setCurrentRow: (user) => set({ currentRow: user }),

  // Data and loading states
  users: [],
  setUsers: (users) => set({ users }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  error: null,
  setError: (error) => set({ error }),

  // Pagination
  totalItems: 0,
  setTotalItems: (totalItems) => set({ totalItems }),
  currentPage: 1,
  setCurrentPage: (currentPage) => set({ currentPage }),
  perPage: 20,
  setPerPage: (perPage) => set({ perPage }),
  totalPages: 1,
  setTotalPages: (totalPages) => set({ totalPages }),

  // Actions
  refetch: () => {},
  setRefetch: (refetch) => set({ refetch }),
  createUser: async () => {},
  setCreateUser: (createUser) => set({ createUser }),
  updateUser: async () => {},
  setUpdateUser: (updateUser) => set({ updateUser }),
  deleteUser: async () => {},
  setDeleteUser: (deleteUser) => set({ deleteUser }),
  deleteUsers: async () => {},
  setDeleteUsers: (deleteUsers) => set({ deleteUsers }),

  // Filtering
  filters: {
    page: 1,
    perPage: 20,
    sort: '-created',
  },
  setFilters: (filters) => set({ filters }),
  clearFilters: () =>
    set({ filters: { page: 1, perPage: 20, sort: '-created' } }),

  // Statistics
  stats: undefined,
  setStats: (stats) => set({ stats }),
  refetchStats: () => {},
  setRefetchStats: (refetchStats) => set({ refetchStats }),
}))
