import React, { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import useDialogState from '@/hooks/use-dialog-state'
import { tasksAPI } from '../api/tasks-api'
import type {
  TaskStats,
  Task,
  TaskCreate,
  TaskFilter,
  TaskUpdate,
  TaskError,
} from '../data/schema'

type TasksDialogType = 'create' | 'update' | 'delete' | 'import'

type TasksContextType = {
  // Dialog state
  open: TasksDialogType | null
  setOpen: (str: TasksDialogType | null) => void
  currentRow: Task | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Task | null>>

  // Data and loading states
  tasks: Task[]
  isLoading: boolean
  error: Error | null

  // Pagination
  totalItems: number
  currentPage: number
  perPage: number
  totalPages: number

  // Actions
  refetch: () => void
  createTask: (task: TaskCreate) => Promise<void>
  updateTask: (id: string, task: TaskUpdate) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  deleteTasks: (ids: string[]) => Promise<void>

  // Filtering
  filters: TaskFilter
  setFilters: (filters: TaskFilter) => void
  clearFilters: () => void

  // Statistics
  stats: TaskStats | undefined
  refetchStats: () => void
}

const TasksContext = React.createContext<TasksContextType | null>(null)

const defaultFilters: TaskFilter = {
  page: 1,
  perPage: 20,
  sort: '-created',
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<TasksDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Task | null>(null)
  const [filters, setFilters] = useState<TaskFilter>(defaultFilters)
  const queryClient = useQueryClient()

  // Query for tasks
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksAPI.getTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Query for statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['tasks-stats'],
    queryFn: () => tasksAPI.getTaskStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: TaskCreate) => tasksAPI.createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-stats'] })
      toast.success('Task created successfully')
      setOpen(null)
    },
    onError: (error: TaskError) => {
      toast.error(error.message || 'Failed to create task')
    },
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: TaskUpdate }) =>
      tasksAPI.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-stats'] })
      toast.success('Task updated successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: TaskError) => {
      toast.error(error.message || 'Failed to update task')
    },
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksAPI.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-stats'] })
      toast.success('Task deleted successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: TaskError) => {
      toast.error(error.message || 'Failed to delete task')
    },
  })

  // Bulk delete tasks mutation
  const deleteTasksMutation = useMutation({
    mutationFn: (ids: string[]) => tasksAPI.deleteTasks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-stats'] })
      toast.success('Tasks deleted successfully')
    },
    onError: (error: TaskError) => {
      toast.error(error.message || 'Failed to delete tasks')
    },
  })

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = tasksAPI.subscribeToTasks((action, task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-stats'] })

      // Show toast for real-time updates
      const actionMessages = {
        create: 'New task created',
        update: 'Task updated',
        delete: 'Task deleted',
        task: task.id,
      }
      toast.info(actionMessages[action])
    })

    return unsubscribe
  }, [queryClient])

  // Actions
  const createTask = async (task: TaskCreate) => {
    await createTaskMutation.mutateAsync(task)
  }

  const updateTask = async (id: string, task: TaskUpdate) => {
    await updateTaskMutation.mutateAsync({ id, task })
  }

  const deleteTask = async (id: string) => {
    await deleteTaskMutation.mutateAsync(id)
  }

  const deleteTasks = async (ids: string[]) => {
    await deleteTasksMutation.mutateAsync(ids)
  }

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const contextValue: TasksContextType = {
    // Dialog state
    open,
    setOpen,
    currentRow,
    setCurrentRow,

    // Data and loading states
    tasks: tasksData?.items || [],
    isLoading,
    error: error as Error | null,

    // Pagination
    totalItems: tasksData?.totalItems || 0,
    currentPage: tasksData?.page || 1,
    perPage: tasksData?.perPage || 20,
    totalPages: tasksData?.totalPages || 1,

    // Actions
    refetch,
    createTask,
    updateTask,
    deleteTask,
    deleteTasks,

    // Filtering
    filters,
    setFilters,
    clearFilters,

    // Statistics
    stats,
    refetchStats,
  }

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTasks = () => {
  const tasksContext = React.useContext(TasksContext)

  if (!tasksContext) {
    throw new Error('useTasks has to be used within <TasksContext>')
  }

  return tasksContext
}
