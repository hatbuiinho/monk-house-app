import { pb } from '@/lib/pocketbase'
import {
  type Group,
  type GroupCreate,
  type GroupUpdate,
  type GroupFilter,
} from '../data/schema'

// Interface for PocketBase record data
interface PocketBaseRecord {
  id: string
  data?: {
    name?: string
    code?: string
    created?: string
    updated?: string
  }
  name?: string
  code?: string
  created?: string
  updated?: string
}

export class GroupsAPI {
  private collection = pb.collection('groups')

  // Convert PocketBase record to our Group type
  private transformRecord(record: PocketBaseRecord): Group {
    // Handle PocketBase record structure with proper fallbacks
    const data = record.data || record // Handle both direct record and nested data

    return {
      id: record.id,
      name: data.name || '',
      code: data.code || '',
      created: data.created || record.created || '',
      updated: data.updated || record.updated || '',
    }
  }

  // Get all groups with optional filtering
  async getGroups(filter?: GroupFilter): Promise<{
    items: Group[]
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

    if (filter?.name) {
      filters.push(`name ~ "${filter.name}"`)
    }
    if (filter?.code) {
      filters.push(`code = "${filter.code}"`)
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

  // Get a single group by ID
  async getGroup(id: string): Promise<Group> {
    const record = await this.collection.getOne(id)
    return this.transformRecord(record)
  }

  // Create a new group
  async createGroup(group: GroupCreate): Promise<Group> {
    const record = await this.collection.create(group)
    return this.transformRecord(record)
  }

  // Update an existing group
  async updateGroup(id: string, group: GroupUpdate): Promise<Group> {
    const record = await this.collection.update(id, group)
    return this.transformRecord(record)
  }

  // Delete a group
  async deleteGroup(id: string): Promise<void> {
    await this.collection.delete(id)
  }

  // Bulk delete groups
  async deleteGroups(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.collection.delete(id)))
  }

  // Real-time subscription for group changes
  subscribeToGroups(
    callback: (action: 'create' | 'update' | 'delete', group: Group) => void
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
}

// Export a singleton instance
export const groupsAPI = new GroupsAPI()
