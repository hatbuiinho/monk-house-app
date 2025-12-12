import { pb } from '@/lib/pocketbase'
import { type User, type UserStatus, type UserRole } from './schema'

// Interface for PocketBase record data
interface PocketBaseRecord {
  id: string
  data?: {
    name?: string
    username?: string
    email?: string
    phoneNumber?: string
    status?: string
    role?: string
    created?: string
    updated?: string
  }
  name?: string
  username?: string
  email?: string
  phoneNumber?: string
  status?: string
  role?: string
  created?: string
  updated?: string
}

export class UsersAPI {
  private collection = pb.collection('users')

  // Convert PocketBase record to our User type
  private transformRecord(record: PocketBaseRecord): User {
    // Handle PocketBase record structure with proper fallbacks
    const data = record.data || record // Handle both direct record and nested data

    return {
      id: record.id,
      name: data.name || '',
      username: data.username || '',
      email: data.email || '',
      phoneNumber: data.phoneNumber || '',
      status: (data.status as UserStatus) || 'active',
      role: (data.role as UserRole) || 'member',
      created: data.created || record.created || '',
      updated: data.updated || record.updated || '',
    }
  }

  // Get all users with optional filtering
  async getUsers(filter?: {
    page?: number
    perPage?: number
    sort?: string
    status?: UserStatus
    role?: UserRole
    search?: string
  }): Promise<{
    items: User[]
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
    if (filter?.role) {
      filters.push(`role = "${filter.role}"`)
    }
    if (filter?.search) {
      filters.push(
        `(name ~ "${filter.search}" || username ~ "${filter.search}" || email ~ "${filter.search}")`
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

  // Get a single user by ID
  async getUser(id: string): Promise<User> {
    const record = await this.collection.getOne(id)
    return this.transformRecord(record)
  }

  // Create a new user
  async createUser(user: {
    name: string
    username: string
    email: string
    phoneNumber: string
    status: UserStatus
    role: UserRole
  }): Promise<User> {
    const record = await this.collection.create(user)
    return this.transformRecord(record)
  }

  // Update an existing user
  async updateUser(
    id: string,
    user: Partial<{
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }>
  ): Promise<User> {
    const record = await this.collection.update(id, user)
    return this.transformRecord(record)
  }

  // Delete a user
  async deleteUser(id: string): Promise<void> {
    await this.collection.delete(id)
  }

  // Bulk delete users
  async deleteUsers(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.collection.delete(id)))
  }

  // Real-time subscription for user changes
  subscribeToUsers(
    callback: (action: 'create' | 'update' | 'delete', user: User) => void
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

  // Get user statistics
  async getUserStats(): Promise<{
    total: number
    by_status: Record<UserStatus, number>
    by_role: Record<UserRole, number>
  }> {
    const result = await this.collection.getList(1, 1000, {})
    const users = result.items.map(this.transformRecord)

    const stats = {
      total: users.length,
      by_status: {
        active: 0,
        inactive: 0,
        invited: 0,
        suspended: 0,
      } as Record<UserStatus, number>,
      by_role: {
        admin: 0,
        member: 0,
        group_leader: 0,
        department_leader: 0,
      } as Record<UserRole, number>,
    }

    users.forEach((user) => {
      // Count by status
      stats.by_status[user.status]++

      // Count by role
      stats.by_role[user.role]++
    })

    return stats
  }
}

// Export a singleton instance
export const usersAPI = new UsersAPI()

// For backward compatibility, export a users array that can be used with the new API
// This maintains the existing interface while providing real data
export const users: User[] = []

// Helper function to load users (can be called when needed)
export const loadUsers = async (): Promise<User[]> => {
  try {
    const result = await usersAPI.getUsers()
    return result.items
  } catch {
    return []
  }
}
