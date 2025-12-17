import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { departmentsAPI } from '../api/department-api'
import { useDepartmentsStore } from '../data/departments-store'
import type {
  DepartmentError,
  DepartmentCreate,
  DepartmentUpdate,
} from '../data/schema'

export const useDepartmentQuery = () => {
  const queryClient = useQueryClient()
  const {
    setDepartments,
    setTotalItems,
    setCurrentPage,
    setPerPage,
    setTotalPages,
    setIsLoading,
    setError,
    filters,
    setOpen,
    setCurrentRow,
  } = useDepartmentsStore()

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
      (action, _department) => {
        queryClient.invalidateQueries({ queryKey: ['departments'] })

        // Show toast for real-time updates
        const actionMessages = {
          create: 'New department created',
          update: 'Department updated',
          delete: 'Department deleted',
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

  // Update Zustand store with the latest data
  useEffect(() => {
    if (departmentsData) {
      setDepartments(departmentsData.items)
      setTotalItems(departmentsData.totalItems)
      setCurrentPage(departmentsData.page)
      setPerPage(departmentsData.perPage)
      setTotalPages(departmentsData.totalPages)
    }
  }, [departmentsData])

  useEffect(() => {
    setIsLoading(isLoading)
    setError(error as Error | null)
  }, [isLoading, error])

  return {
    departments: departmentsData?.items || [],
    isLoading,
    error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    deleteDepartments,
    refetch,
  }
}
