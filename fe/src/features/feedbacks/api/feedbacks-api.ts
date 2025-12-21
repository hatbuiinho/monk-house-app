import { pb } from '@/lib/pocketbase'
import type { User } from '@/features/users/data/schema'
import {
  type Feedback,
  type FeedbackCreate,
  type FeedbackUpdate,
  type FeedbackFilter,
  type FeedbackType,
} from '../data/schema'

// Interface for PocketBase record data
interface PocketBaseRecord {
  id: string
  data?: {
    message?: string
    type?: FeedbackType
    sender?: string | User
    task?: string
    timestamp?: string
    created?: string
    updated?: string
  }
  message?: string
  type?: FeedbackType
  sender?: string | User
  task?: string
  timestamp?: string
  created?: string
  updated?: string
  expand?: {
    sender?: User
  }
}

export class FeedbacksAPI {
  private collection = pb.collection('feedbacks')

  // Convert PocketBase record to our Feedback type
  private transformRecord(record: PocketBaseRecord): Feedback {
    // Handle PocketBase record structure with proper fallbacks
    const data = record.data || record // Handle both direct record and nested data

    // Handle sender expansion - if expanded, use the full user object, otherwise use the ID
    let sender: User
    if (record.expand && record.expand.sender) {
      sender = record.expand.sender
    } else if (typeof data.sender === 'string') {
      // If sender is just an ID string, we need to create a minimal user object
      sender = {
        id: data.sender,
        name: 'Unknown User',
        username: '',
        email: '',
        avatar_url: '',
        phoneNumber: '',
        status: 'active',
        roles: [],
        created: '',
        updated: '',
      }
    } else if (typeof data.sender === 'object') {
      sender = data.sender
    } else {
      // Fallback empty user
      sender = {
        id: '',
        name: 'Unknown User',
        username: '',
        email: '',
        avatar_url: '',
        phoneNumber: '',
        status: 'active',
        roles: [],
        created: '',
        updated: '',
      }
    }

    return {
      id: record.id,
      message: data.message || '',
      type: (data.type as FeedbackType) || 'comment',
      sender: sender,
      task: data.task || '',
      timestamp: data.timestamp || '',
      updated: data.updated || record.updated || '',
    }
  }

  // Get all feedbacks with optional filtering and user expansion
  async getFeedbacks(filter?: FeedbackFilter): Promise<{
    items: Feedback[]
    totalItems: number
    page: number
    perPage: number
    totalPages: number
  }> {
    const page = filter?.page || 1
    const perPage = filter?.perPage || 20
    const sort = filter?.sort || 'timestamp'

    // Build filter query
    let query = ''
    const filters: string[] = []

    if (filter?.type) {
      filters.push(`type = "${filter.type}"`)
    }
    if (filter?.task) {
      filters.push(`task = "${filter.task}"`)
    }
    if (filter?.sender) {
      filters.push(`sender = "${filter.sender}"`)
    }

    if (filters.length > 0) {
      query = filters.join(' && ')
    }

    const result = await this.collection.getList(page, perPage, {
      filter: query,
      sort: sort,
      expand: 'sender', // Expand the sender user relationship
    })

    return {
      items: result.items.map(this.transformRecord),
      totalItems: result.totalItems,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    }
  }

  // Get a single feedback by ID with user expansion
  async getFeedback(id: string): Promise<Feedback> {
    const record = await this.collection.getOne(id, {
      expand: 'sender', // Expand the sender user relationship
    })
    return this.transformRecord(record)
  }

  // Create a new feedback
  async createFeedback(feedback: FeedbackCreate): Promise<Feedback> {
    const record = await this.collection.create(feedback, {
      expand: 'sender', // Expand the sender user relationship
    })
    return this.transformRecord(record)
  }

  // Update an existing feedback
  async updateFeedback(
    id: string,
    feedback: FeedbackUpdate
  ): Promise<Feedback> {
    const record = await this.collection.update(id, feedback, {
      expand: 'sender', // Expand the sender user relationship
    })
    return this.transformRecord(record)
  }

  // Delete a feedback
  async deleteFeedback(id: string): Promise<void> {
    await this.collection.delete(id)
  }

  // Bulk delete feedbacks
  async deleteFeedbacks(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.collection.delete(id)))
  }

  // Real-time subscription for feedback changes
  subscribeToFeedbacks(
    callback: (
      action: 'create' | 'update' | 'delete',
      feedback: Feedback
    ) => void
  ): () => void {
    let unsubscribeFunc: (() => void) | null = null

    // Handle the subscription asynchronously
    this.collection
      .subscribe('*', (event) => {
        const { action, record } = event
        if (action === 'create' || action === 'update' || action === 'delete') {
          // For real-time updates, we need to manually expand the sender
          this.collection
            .getOne(record.id, { expand: 'sender' })
            .then((expandedRecord) => {
              callback(action, this.transformRecord(expandedRecord))
            })
            .catch((_error) => {
              // If expansion fails, use the record as-is
              callback(action, this.transformRecord(record))
            })
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
export const feedbacksAPI = new FeedbacksAPI()
