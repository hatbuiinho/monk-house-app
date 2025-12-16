import { z } from 'zod'

// Group schema for PocketBase compatibility
export const groupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  created: z.string().optional(),
  updated: z.string().optional(),
})

// Group creation schema (without id and timestamps)
export const groupCreateSchema = groupSchema.omit({
  id: true,
  created: true,
  updated: true,
})

// Group update schema (all fields optional except id)
export const groupUpdateSchema = groupCreateSchema.partial()

// Group filter schema for queries
export const groupFilterSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export type Group = z.infer<typeof groupSchema>
export type GroupCreate = z.infer<typeof groupCreateSchema>
export type GroupUpdate = z.infer<typeof groupUpdateSchema>
export type GroupFilter = z.infer<typeof groupFilterSchema>
