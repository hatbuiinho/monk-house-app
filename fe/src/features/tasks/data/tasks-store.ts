import { create } from 'zustand'
import type { Task, TaskStatus, TaskPriority } from './schema'

type TasksDialogType = 'create' | 'update' | 'delete' | 'import'

export type TasksFilter = {
  page?: number
  perPage?: number
  sort?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee?: string
  label?: string
  search?: string
}

type TasksStore = {
  // Dialog state
  open: TasksDialogType | null
  setOpen: (str: TasksDialogType | null) => void
  currentRow: Task | null
  setCurrentRow: (task: Task | null) => void

  // Data and loading states
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
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

  // Filtering
  filters: TasksFilter
  setFilters: (filters: TasksFilter) => void
  clearFilters: () => void

  // Statistics
  stats:
    | {
        total: number
        todo: number
        in_progress: number
        done: number
        canceled: number
        backlog: number
        by_priority: {
          low: number
          medium: number
          high: number
        }
      }
    | undefined
  setStats: (
    stats:
      | {
          total: number
          todo: number
          in_progress: number
          done: number
          canceled: number
          backlog: number
          by_priority: {
            low: number
            medium: number
            high: number
          }
        }
      | undefined
  ) => void
  refetchStats: () => void
  setRefetchStats: (refetchStats: () => void) => void
}

export const useTasksStore = create<TasksStore>((set) => ({
  // Dialog state
  open: null,
  setOpen: (str) => set({ open: str }),
  currentRow: null,
  setCurrentRow: (task) => set({ currentRow: task }),

  // Data and loading states
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
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
