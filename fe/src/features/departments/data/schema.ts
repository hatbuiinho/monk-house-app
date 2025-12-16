import { z } from 'zod'

// Department schema for PocketBase compatibility
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  created: z.string().optional(),
  updated: z.string().optional(),
})

// Department creation schema (without id and timestamps)
export const departmentCreateSchema = departmentSchema.omit({
  id: true,
  created: true,
  updated: true,
})

// Department update schema (all fields optional except id)
export const departmentUpdateSchema = departmentCreateSchema.partial()

// Department filter schema for queries
export const departmentFilterSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export type Department = z.infer<typeof departmentSchema>
export type DepartmentCreate = z.infer<typeof departmentCreateSchema>
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>
export type DepartmentFilter = z.infer<typeof departmentFilterSchema>

export type DepartmentError = {
  message: string
}
