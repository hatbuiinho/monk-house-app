import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  // z.literal('invited'),
  // z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

export const userRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  created: z.string().optional(),
  updated: z.string().optional(),
})
export type UserRole = z.infer<typeof userRoleSchema>

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  avatar_url: z.string(),
  phoneNumber: z.string(),
  status: userStatusSchema,
  roles: z.array(userRoleSchema),
  created: z.string(),
  updated: z.string(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

export type UserError = {
  message: string
}
