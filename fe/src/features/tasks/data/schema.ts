import { z } from 'zod'
import { priorities, statuses } from './data'

// Task status enum
export const taskStatusEnum = z.enum(statuses.map((status) => status.value))

// Task priority enum
export const taskPriorityEnum = z.enum(
  priorities.map((priority) => priority.value)
)

// Enhanced task schema for PocketBase compatibility
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: taskStatusEnum,
  // priority: taskPriorityEnum,
  label: z.string().optional(),
  assignees: z.array(z.string()),
  departments: z.array(z.string()).optional(),
  due_date: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
})

// Task creation schema (without id and timestamps)
export const taskCreateSchema = taskSchema.omit({
  id: true,
  created: true,
  updated: true,
})

// Task update schema (all fields optional except id)
export const taskUpdateSchema = taskCreateSchema.partial()

// Task filter schema for queries
export const taskFilterSchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assignee: z.string().optional(),
  label: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  status: z.string().min(1, 'Please select a status.'),
  label: z.string().optional(),
  // priority: z.string().min(1, 'Please choose a priority.'),
  assignees: z.array(z.string()),
  due_date: z.string().optional(),
  departments: z.array(z.string()),
})

// Task Statistics Schema
export interface TaskStats {
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

export type TaskError = {
  message: string
}

export type Task = z.infer<typeof taskSchema>
export type TaskCreate = z.infer<typeof taskCreateSchema>
export type TaskUpdate = z.infer<typeof taskUpdateSchema>
export type TaskFilter = z.infer<typeof taskFilterSchema>
export type TaskStatus = z.infer<typeof taskStatusEnum>
export type TaskPriority = z.infer<typeof taskPriorityEnum>
export type TaskForm = z.infer<typeof formSchema>
