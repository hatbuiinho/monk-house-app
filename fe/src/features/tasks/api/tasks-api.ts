import { pb } from '@/lib/pocketbase'
import {
  type Task,
  type TaskCreate,
  type TaskUpdate,
  type TaskFilter,
  type TaskStats,
  type TaskStatus,
  type TaskPriority,
} from '../data/schema'

// Interface for PocketBase record data
interface PocketBaseRecord {
  id: string
  data?: {
    title?: string
    description?: string
    status?: string
    priority?: string
    label?: string
    assignee?: string
    due_date?: string
    created?: string
    updated?: string
  }
  title?: string
  description?: string
  status?: string
  priority?: string
  label?: string
  assignee?: string
  due_date?: string
  created?: string
  updated?: string
}

export class TasksAPI {
  private collection = pb.collection('tasks')

  // Convert PocketBase record to our Task type
  // Convert PocketBase record to our Task type
  private transformRecord(record: PocketBaseRecord): Task {
    // Handle PocketBase record structure with proper fallbacks
    const data = record.data || record // Handle both direct record and nested data

    return {
      id: record.id,
      title: data.title || '',
      description: data.description || '',
      status: (data.status as TaskStatus) || 'todo',
      priority: (data.priority as TaskPriority) || 'medium',
      label: data.label || '',
      assignee: data.assignee || '',
      due_date: data.due_date || '',
      created: data.created || record.created || '',
      updated: data.updated || record.updated || '',
    }
  }

  // Get all tasks with optional filtering
  async getTasks(filter?: TaskFilter): Promise<{
    items: Task[]
    totalItems: number
    page: number
    perPage: number
    totalPages: number
  }> {
    const page = filter?.page || 1
    const perPage = filter?.perPage || 20
    const sort = filter?.sort || '-created'

    // Build filter query
    let query = ''
    const filters: string[] = []

    if (filter?.status) {
      filters.push(`status = "${filter.status}"`)
    }
    if (filter?.priority) {
      filters.push(`priority = "${filter.priority}"`)
    }
    if (filter?.assignee) {
      filters.push(`assignee = "${filter.assignee}"`)
    }
    if (filter?.label) {
      filters.push(`label = "${filter.label}"`)
    }
    if (filter?.search) {
      filters.push(
        `(title ~ "${filter.search}" || description ~ "${filter.search}")`
      )
    }

    if (filters.length > 0) {
      query = filters.join(' && ')
    }

    const result = await this.collection.getList(page, perPage, {
      filter: query,
      sort: sort,
    })

    return {
      items: result.items.map(this.transformRecord),
      totalItems: result.totalItems,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    }
  }

  // Get a single task by ID
  async getTask(id: string): Promise<Task> {
    const record = await this.collection.getOne(id)
    return this.transformRecord(record)
  }

  // Create a new task
  async createTask(task: TaskCreate): Promise<Task> {
    const record = await this.collection.create(task)
    return this.transformRecord(record)
  }

  // Update an existing task
  async updateTask(id: string, task: TaskUpdate): Promise<Task> {
    const record = await this.collection.update(id, task)
    return this.transformRecord(record)
  }

  // Delete a task
  async deleteTask(id: string): Promise<void> {
    await this.collection.delete(id)
  }

  // Bulk delete tasks
  async deleteTasks(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.collection.delete(id)))
  }

  // Real-time subscription for task changes
  subscribeToTasks(
    callback: (action: 'create' | 'update' | 'delete', task: Task) => void
  ): () => void {
    let unsubscribeFunc: (() => void) | null = null

    // Handle the subscription asynchronously
    this.collection
      .subscribe('*', (event) => {
        const { action, record } = event
        if (action === 'create' || action === 'update' || action === 'delete') {
          callback(action, this.transformRecord(record))
        }
      })
      .then((unsubscribe) => {
        unsubscribeFunc = unsubscribe
      })
      .catch((_error) => {
        // Subscription failed silently - the callback won't be called
      })

    return () => {
      // Call the unsubscribe function when available
      if (unsubscribeFunc) {
        unsubscribeFunc()
      }
    }
  }

  // Get task statistics with proper typing
  async getTaskStats(): Promise<TaskStats> {
    const result = await this.collection.getList(1, 1000, {})
    const tasks = result.items.map(this.transformRecord)

    const stats: TaskStats = {
      total: tasks.length,
      todo: 0,
      in_progress: 0,
      done: 0,
      canceled: 0,
      backlog: 0,
      by_priority: {
        low: 0,
        medium: 0,
        high: 0,
      },
    }

    tasks.forEach((task) => {
      // Simple count by status
      switch (task.status) {
        case 'todo':
          stats.todo++
          break
        case 'in_progress':
          stats.in_progress++
          break
        case 'done':
          stats.done++
          break
        case 'canceled':
          stats.canceled++
          break
        case 'backlog':
          stats.backlog++
          break
      }

      // Count by priority
      switch (task.priority) {
        case 'low':
          stats.by_priority.low++
          break
        case 'medium':
          stats.by_priority.medium++
          break
        case 'high':
          stats.by_priority.high++
          break
      }
    })

    return stats
  }
}

// Export a singleton instance
export const tasksAPI = new TasksAPI()
