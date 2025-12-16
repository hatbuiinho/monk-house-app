import React, { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import useDialogState from '@/hooks/use-dialog-state'
import { departmentsAPI } from '../api/department-api'
import type {
  Department,
  DepartmentCreate,
  DepartmentFilter,
  DepartmentUpdate,
  DepartmentError,
} from '../data/schema'

type DepartmentsDialogType = 'create' | 'update' | 'delete' | 'import'

type DepartmentsContextType = {
  // Dialog state
  open: DepartmentsDialogType | null
  setOpen: (str: DepartmentsDialogType | null) => void
  currentRow: Department | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Department | null>>

  // Data and loading states
  departments: Department[]
  isLoading: boolean
  error: Error | null

  // Pagination
  totalItems: number
  currentPage: number
  perPage: number
  totalPages: number

  // Actions
  refetch: () => void
  createDepartment: (department: DepartmentCreate) => Promise<void>
  updateDepartment: (id: string, department: DepartmentUpdate) => Promise<void>
  deleteDepartment: (id: string) => Promise<void>
  deleteDepartments: (ids: string[]) => Promise<void>

  // Filtering
  filters: DepartmentFilter
  setFilters: (filters: DepartmentFilter) => void
  clearFilters: () => void
}

const DepartmentsContext = React.createContext<DepartmentsContextType | null>(
  null
)

const defaultFilters: DepartmentFilter = {
  page: 1,
  perPage: 20,
  sort: 'name', // Sort by name as requested
}

export function DepartmentsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<DepartmentsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Department | null>(null)
  const [filters, setFilters] = useState<DepartmentFilter>(defaultFilters)
  const queryClient = useQueryClient()

  // Query for departments
  const {
    data: departmentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['departments', filters],
    queryFn: () => departmentsAPI.getDepartments(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: (department: DepartmentCreate) =>
      departmentsAPI.createDepartment(department),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Department created successfully')
      setOpen(null)
    },
    onError: (error: DepartmentError) => {
      toast.error(error.message || 'Failed to create department')
    },
  })

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: ({
      id,
      department,
    }: {
      id: string
      department: DepartmentUpdate
    }) => departmentsAPI.updateDepartment(id, department),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Department updated successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: DepartmentError) => {
      toast.error(error.message || 'Failed to update department')
    },
  })

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string) => departmentsAPI.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Department deleted successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: DepartmentError) => {
      toast.error(error.message || 'Failed to delete department')
    },
  })

  // Bulk delete departments mutation
  const deleteDepartmentsMutation = useMutation({
    mutationFn: (ids: string[]) => departmentsAPI.deleteDepartments(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departments deleted successfully')
    },
    onError: (error: DepartmentError) => {
      toast.error(error.message || 'Failed to delete departments')
    },
  })

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = departmentsAPI.subscribeToDepartments(
      (action, department) => {
        queryClient.invalidateQueries({ queryKey: ['departments'] })

        // Show toast for real-time updates
        const actionMessages = {
          create: 'New department created',
          update: 'Department updated',
          delete: 'Department deleted',
          department: department.id,
        }
        toast.info(actionMessages[action])
      }
    )

    return unsubscribe
  }, [queryClient])

  // Actions
  const createDepartment = async (department: DepartmentCreate) => {
    await createDepartmentMutation.mutateAsync(department)
  }

  const updateDepartment = async (id: string, department: DepartmentUpdate) => {
    await updateDepartmentMutation.mutateAsync({ id, department })
  }

  const deleteDepartment = async (id: string) => {
    await deleteDepartmentMutation.mutateAsync(id)
  }

  const deleteDepartments = async (ids: string[]) => {
    await deleteDepartmentsMutation.mutateAsync(ids)
  }

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const contextValue: DepartmentsContextType = {
    // Dialog state
    open,
    setOpen,
    currentRow,
    setCurrentRow,

    // Data and loading states
    departments: departmentsData?.items || [],
    isLoading,
    error: error as Error | null,

    // Pagination
    totalItems: departmentsData?.totalItems || 0,
    currentPage: departmentsData?.page || 1,
    perPage: departmentsData?.perPage || 20,
    totalPages: departmentsData?.totalPages || 1,

    // Actions
    refetch,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    deleteDepartments,

    // Filtering
    filters,
    setFilters,
    clearFilters,
  }

  return (
    <DepartmentsContext.Provider value={contextValue}>
      {children}
    </DepartmentsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDepartments = () => {
  const departmentsContext = React.useContext(DepartmentsContext)

  if (!departmentsContext) {
    throw new Error('useDepartments has to be used within <DepartmentsContext>')
  }

  return departmentsContext
}
