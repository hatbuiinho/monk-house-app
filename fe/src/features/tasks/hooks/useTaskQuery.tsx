import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tasksAPI } from '../api/tasks-api'
import type { TaskError, TaskStatus } from '../data/schema'
import { useTasksStore } from '../data/tasks-store'

export const useTaskQuery = () => {
  const {
    setTasks,
    setTotalItems,
    setPerPage,
    setTotalPages,
    setIsLoading,
    setError,
    // setStats,
    filters,
    setOpen,
    setCurrentRow,
  } = useTasksStore()

  // Query for tasks

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksAPI.getTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // enabled: false,
  })

  useEffect(() => {
    setTasks(data?.items ?? [])
    setTotalItems(data?.totalItems ?? 0)
    setPerPage(data?.perPage ?? 10)
    setTotalPages(data?.totalPages ?? 1)
    setIsLoading(isLoading)
    setError(isError ? new Error('Failed to fetch tasks') : null)
  }, [data, isLoading, isError])

  //TODO: Query for statistics

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (task: {
      title: string
      description?: string
      status: TaskStatus
      label?: string
      assignees: string[]
      due_date?: string
    }) => tasksAPI.createTask(task),
    onSuccess: () => {
      toast.success('Task created successfully')
      setOpen(null)
    },
    onError: (error: TaskError) => {
      toast.error(error.message || 'Failed to create task')
    },
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({
      id,
      task,
    }: {
      id: string
      task: Partial<{
        title: string
        description?: string
        status: TaskStatus
        label?: string
        assignees: string[]
        due_date?: string
      }>
    }) => tasksAPI.updateTask(id, task),
    onSuccess: () => {
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
      toast.success('Tasks deleted successfully')
    },
    onError: (error: TaskError) => {
      toast.error(error.message || 'Failed to delete tasks')
    },
  })

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = tasksAPI.subscribeToTasks((_action, _task) => {
      const tasks = useTasksStore.getState().tasks

      switch (_action) {
        case 'create':
          if (!tasks.find((task) => task.id === _task.id)) {
            setTimeout(() => {
              setTasks([_task, ...tasks])
            }, 500)
          }
          break
        case 'update':
          setTasks(tasks.map((task) => (task.id === _task.id ? _task : task)))
          break
        case 'delete':
          setTasks(tasks.filter((task) => task.id !== _task.id))
          break
      }
      // toast.info(`${actionMessages[action]}: ${task.title}`)
    })

    return unsubscribe
  }, [])

  // Actions
  const createTask = async (task: {
    title: string
    description?: string
    status: TaskStatus
    label?: string
    assignees: string[]
    due_date?: string
  }) => {
    await createTaskMutation.mutateAsync(task)
  }

  const updateTask = async (
    id: string,
    task: Partial<{
      title: string
      description?: string
      status: TaskStatus
      label?: string
      assignees?: string[]
      due_date?: string
    }>
  ) => {
    await updateTaskMutation.mutateAsync({ id, task })
  }

  const deleteTask = async (id: string) => {
    await deleteTaskMutation.mutateAsync(id)
  }

  const deleteTasks = async (ids: string[]) => {
    await deleteTasksMutation.mutateAsync(ids)
  }

  return {
    createTask,
    updateTask,
    deleteTask,
    deleteTasks,
  }
}
