import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { departmentsAPI } from '../api/department-api'
import { useDepartmentsStore } from '../data/departments-store'
import type {
  DepartmentCreate,
  DepartmentError,
  DepartmentUpdate,
} from '../data/schema'

export const useDepartmentQuery = () => {
  const {
    setDepartments,
    setTotalItems,
    setIsLoading,
    setError,
    filters,
    setOpen,
    setCurrentRow,
    departments,
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
    // enabled: false, // We'll manually trigger refetch
  })

  // useEffect(() => {

  // }, [filters, currentPage])

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: (department: DepartmentCreate) =>
      departmentsAPI.createDepartment(department),
    onSuccess: () => {
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
      toast.success('Departments deleted successfully')
    },
    onError: (error: DepartmentError) => {
      toast.error(error.message || 'Failed to delete departments')
    },
  })

  useEffect(() => {
    setDepartments(departmentsData?.items ?? [])
    setTotalItems(departmentsData?.totalItems ?? 0)
    // setPerPage(departmentsData?.perPage ?? 10)
    // setTotalPages(departmentsData?.totalPages ?? 1)
    setIsLoading(isLoading)
    setError(error)
  }, [departmentsData, isLoading, error])

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = departmentsAPI.subscribeToDepartments(
      (action, _department) => {
        switch (action) {
          case 'create':
            if (
              !departments.find(
                (department) => department.id === _department.id
              )
            ) {
              setTimeout(() => {
                setDepartments([_department, ...departments])
              }, 1000)
            }
            break
          case 'update':
            setDepartments(
              departments.map((department) =>
                department.id === _department.id ? _department : department
              )
            )
            break
          case 'delete':
            setDepartments(
              departments.filter(
                (department) => department.id !== _department.id
              )
            )
            break
        }
      }
    )

    return unsubscribe
  }, [])

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

  return {
    createDepartment,
    updateDepartment,
    deleteDepartment,
    deleteDepartments,
    refetch,
  }
}
