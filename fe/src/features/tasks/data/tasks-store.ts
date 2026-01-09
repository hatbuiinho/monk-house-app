import { addDays } from 'date-fns'
import { create } from 'zustand'
import type { Task, TaskFilter } from './schema'

type TasksDialogType = 'create' | 'update' | 'delete' | 'import'

type TasksStore = {
  // Dialog state
  open: TasksDialogType | null
  setOpen: (str: TasksDialogType | null) => void
  currentTask: Task | null
  setCurrentTask: (task: Task | null) => void

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
  // perPage: number
  // setPerPage: (perPage: number) => void
  totalPages: number
  setTotalPages: (totalPages: number) => void

  // Filtering
  filters: TaskFilter
  setFilters: (filters: Partial<TaskFilter>) => void
  clearFilters: () => void

  // Selection
  selectedTasks: string[]
  toggleTaskSelection: (taskId: string) => void
  selectAllTasks: () => void
  clearSelection: () => void
  setSelectedTasks: (taskIds: string[]) => void

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

export const useTasksStore = create<TasksStore>((set, get) => ({
  // Dialog state
  open: null,
  setOpen: (str) => set({ open: str }),
  currentTask: null,
  setCurrentTask: (task) => {
    set({ currentTask: task })
  },

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
  // setPerPage: (perPage) => set({ perPage }),
  totalPages: 1,
  setTotalPages: (totalPages) => set({ totalPages }),

  // Actions

  // Filtering
  filters: {
    currentPage: 1,
    perPage: 12,
    sort: '-created',
    startDate: new Date(),
    endDate: addDays(new Date(), 1),
  },
  setFilters: (filters) => {
    const { filters: oldFilters } = get()
    set({ filters: { ...oldFilters, ...filters } })
  },
  clearFilters: () =>
    set({
      filters: {
        currentPage: 1,
        perPage: 12,
        sort: '-created',
      },
    }),

  // Statistics
  stats: undefined,
  setStats: (stats) => set({ stats }),
  refetchStats: () => {},
  setRefetchStats: (refetchStats) => set({ refetchStats }),

  // Selection
  selectedTasks: [],
  toggleTaskSelection: (taskId: string) =>
    set((state) => ({
      selectedTasks: state.selectedTasks.includes(taskId)
        ? state.selectedTasks.filter((id) => id !== taskId)
        : [...state.selectedTasks, taskId],
    })),
  selectAllTasks: () =>
    set((state) => ({
      selectedTasks: state.tasks.map((task) => task.id),
    })),
  clearSelection: () => set({ selectedTasks: [] }),
  setSelectedTasks: (taskIds: string[]) => set({ selectedTasks: taskIds }),
}))
