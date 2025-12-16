import { pb } from '@/lib/pocketbase'
import {
  type Department,
  type DepartmentCreate,
  type DepartmentUpdate,
  type DepartmentFilter,
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

export class DepartmentsAPI {
  private collection = pb.collection('departments')

  // Convert PocketBase record to our Department type
  private transformRecord(record: PocketBaseRecord): Department {
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

  // Get all departments with optional filtering
  async getDepartments(filter?: DepartmentFilter): Promise<{
    items: Department[]
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
      filters.push(`code ~ "${filter.code}"`)
    }

    if (filters.length > 0) {
      query = filters.join(' || ')
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

  // Get a single department by ID
  async getDepartment(id: string): Promise<Department> {
    const record = await this.collection.getOne(id)
    return this.transformRecord(record)
  }

  // Create a new department
  async createDepartment(department: DepartmentCreate): Promise<Department> {
    const record = await this.collection.create(department)
    return this.transformRecord(record)
  }

  // Update an existing department
  async updateDepartment(
    id: string,
    department: DepartmentUpdate
  ): Promise<Department> {
    const record = await this.collection.update(id, department)
    return this.transformRecord(record)
  }

  // Delete a department
  async deleteDepartment(id: string): Promise<void> {
    await this.collection.delete(id)
  }

  // Bulk delete departments
  async deleteDepartments(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.collection.delete(id)))
  }

  // Real-time subscription for department changes
  subscribeToDepartments(
    callback: (
      action: 'create' | 'update' | 'delete',
      department: Department
    ) => void
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
export const departmentsAPI = new DepartmentsAPI()
