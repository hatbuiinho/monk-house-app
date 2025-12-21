import { z } from 'zod'
import type { User } from '@/features/users/data/schema'

// Feedback type enum
export const feedbackTypeEnum = z.enum(['comment', 'report'])

// Feedback schema for PocketBase compatibility
export const feedbackSchema = z.object({
  id: z.string(),
  message: z.string().min(1, 'Message is required'),
  type: feedbackTypeEnum,
  sender: z.union([z.string(), z.custom<User>()]),
  task: z.string(), // id of task
  timestamp: z.string(), // feedback timestamp
  created: z.string().optional(),
  updated: z.string().optional(),
})

// Feedback creation schema (without id and timestamps)
export const feedbackCreateSchema = feedbackSchema.omit({
  id: true,
  created: true,
  updated: true,
})

// Feedback update schema (all fields optional except id)
export const feedbackUpdateSchema = feedbackCreateSchema.partial()

// Feedback filter schema for queries
export const feedbackFilterSchema = z.object({
  type: feedbackTypeEnum.optional(),
  task: z.string().optional(),
  sender: z.string().optional(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export type Feedback = z.infer<typeof feedbackSchema>
export type FeedbackCreate = z.infer<typeof feedbackCreateSchema>
export type FeedbackUpdate = z.infer<typeof feedbackUpdateSchema>
export type FeedbackFilter = z.infer<typeof feedbackFilterSchema>
export type FeedbackType = z.infer<typeof feedbackTypeEnum>

export type FeedbackError = {
  message: string
}
