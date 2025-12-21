import { create } from 'zustand'
import { pb } from '@/lib/pocketbase'
import { feedbacksAPI } from '../api/feedbacks-api'
import type { Feedback, FeedbackCreate } from './schema'

type FeedbacksDialogType = 'create' | 'edit' | 'delete' | 'view'

type FeedbacksFilter = {
  task?: string
  type?: 'comment' | 'report'
  sender?: string
  page?: number
  perPage?: number
}

type FeedbacksStore = {
  // Dialog state
  dialogOpen: boolean
  dialogType: FeedbacksDialogType | null
  currentFeedback: Feedback | null

  // Feedback list state
  feedbacks: Feedback[]
  isLoading: boolean
  error: string | null

  // Filter state
  filter: FeedbacksFilter

  // Pagination state
  totalItems: number
  page: number
  perPage: number
  totalPages: number

  // Actions
  setDialogOpen: (open: boolean) => void
  setDialogType: (type: FeedbacksDialogType | null) => void
  setCurrentFeedback: (feedback: Feedback | null) => void

  setFilter: (filter: Partial<FeedbacksFilter>) => void
  resetFilter: () => void

  fetchFeedbacks: () => Promise<void>
  createFeedback: (feedback: FeedbackCreate) => Promise<void>
  updateFeedback: (id: string, feedback: Partial<Feedback>) => Promise<void>
  deleteFeedback: (id: string) => Promise<void>

  // Real-time subscription
  subscribeToFeedbacks: () => () => void
}

export const useFeedbacksStore = create<FeedbacksStore>((set, get) => ({
  // Initial state
  dialogOpen: false,
  dialogType: null,
  currentFeedback: null,

  feedbacks: [],
  isLoading: false,
  error: null,

  filter: {
    page: 1,
    perPage: 20,
  },

  totalItems: 0,
  page: 1,
  perPage: 999,
  totalPages: 1,

  // Dialog actions
  setDialogOpen: (open) => set({ dialogOpen: open }),
  setDialogType: (type) => set({ dialogType: type }),
  setCurrentFeedback: (feedback) => set({ currentFeedback: feedback }),

  // Filter actions
  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
      page: filter.page || state.page,
    })),

  resetFilter: () =>
    set({
      filter: { page: 1, perPage: 20 },
      page: 1,
    }),

  // Fetch feedbacks with current filter
  fetchFeedbacks: async () => {
    set({ isLoading: true, error: null })

    try {
      const { filter, page, perPage } = get()
      const result = await feedbacksAPI.getFeedbacks({
        ...filter,
        page,
        perPage,
      })

      set({
        feedbacks: result.items,
        totalItems: result.totalItems,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
        isLoading: false,
      })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to fetch feedbacks',
        isLoading: false,
      })
    }
  },

  // Create new feedback
  createFeedback: async (feedbackData: FeedbackCreate) => {
    set({ isLoading: true, error: null })

    try {
      const currentUser = pb.authStore.record

      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      const feedbackWithUser: FeedbackCreate = {
        ...feedbackData,
        sender: currentUser.id, // Use current user ID
        timestamp: new Date().toISOString(),
      }

      await feedbacksAPI.createFeedback(feedbackWithUser)

      // Refresh feedbacks list
      // await get().fetchFeedbacks()

      set({ isLoading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to create feedback',
        isLoading: false,
      })
      throw error
    }
  },

  // Update existing feedback
  updateFeedback: async (id, feedbackData) => {
    set({ isLoading: true, error: null })

    try {
      await feedbacksAPI.updateFeedback(id, feedbackData)

      // Refresh feedbacks list
      // await get().fetchFeedbacks()

      set({ isLoading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update feedback',
        isLoading: false,
      })
      throw error
    }
  },

  // Delete feedback
  deleteFeedback: async (id) => {
    set({ isLoading: true, error: null })

    try {
      await feedbacksAPI.deleteFeedback(id)

      // Refresh feedbacks list
      // await get().fetchFeedbacks()

      set({ isLoading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to delete feedback',
        isLoading: false,
      })
      throw error
    }
  },

  // Real-time subscription
  subscribeToFeedbacks: () => {
    const unsubscribe = feedbacksAPI.subscribeToFeedbacks(
      (action, _feedback) => {
        if (action === 'create' || action === 'update' || action === 'delete') {
          switch (action) {
            case 'create':
              setTimeout(() => {
                if (!get().feedbacks.find((f) => f.id === _feedback.id)) {
                  set((state) => {
                    // state.feedbacks.push(_feedback)
                    return {
                      feedbacks: [...state.feedbacks, _feedback],
                    }
                  })
                }
              }, 200)
              // if (get().feedbacks.find((f) => f.id != _feedback.id)) {

              // })
              break
            case 'update':
              set((state) => ({
                feedbacks: state.feedbacks.map((f) =>
                  f.id === _feedback.id ? _feedback : f
                ),
              }))
              break
            case 'delete':
              set((state) => ({
                feedbacks: state.feedbacks.filter((f) => f.id !== _feedback.id),
              }))
              break
          }
        }
      }
    )

    return unsubscribe
  },
}))
