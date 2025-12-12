import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('invited'),
  z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

export const userRoleSchema = z.union([
  z.literal('admin'),
  z.literal('member'),
  z.literal('group_leader'),
  z.literal('department_leader'),
])
export type UserRole = z.infer<typeof userRoleSchema>

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  status: userStatusSchema,
  role: userRoleSchema,
  created: z.string(),
  updated: z.string(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

export type UserError = {
  message: string
}
