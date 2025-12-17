import { create } from 'zustand'
import type {
  Department,
  DepartmentFilter,
  DepartmentCreate,
  DepartmentUpdate,
} from './schema'

type DepartmentsDialogType = 'create' | 'update' | 'delete' | 'import'

type DepartmentsStore = {
  // Dialog state
  open: DepartmentsDialogType | null
  setOpen: (str: DepartmentsDialogType | null) => void
  currentRow: Department | null
  setCurrentRow: (department: Department | null) => void

  // Data and loading states
  departments: Department[]
  setDepartments: (departments: Department[]) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  error: Error | null
  setError: (error: Error | null) => void

  // Pagination
  totalItems: number
  setTotalItems: (totalItems: number) => void
  currentPage: number
  setCurrentPage: (currentPage: number) => void
  perPage: number
  setPerPage: (perPage: number) => void
  totalPages: number
  setTotalPages: (totalPages: number) => void

  // Actions
  refetch: () => void
  setRefetch: (refetch: () => void) => void
  createDepartment: (department: DepartmentCreate) => Promise<void>
  setCreateDepartment: (
    createDepartment: (department: DepartmentCreate) => Promise<void>
  ) => void
  updateDepartment: (id: string, department: DepartmentUpdate) => Promise<void>
  setUpdateDepartment: (
    updateDepartment: (
      id: string,
      department: DepartmentUpdate
    ) => Promise<void>
  ) => void
  deleteDepartment: (id: string) => Promise<void>
  setDeleteDepartment: (deleteDepartment: (id: string) => Promise<void>) => void
  deleteDepartments: (ids: string[]) => Promise<void>
  setDeleteDepartments: (
    deleteDepartments: (ids: string[]) => Promise<void>
  ) => void

  // Filtering
  filters: DepartmentFilter
  setFilters: (filters: DepartmentFilter) => void
  clearFilters: () => void
}

export const useDepartmentsStore = create<DepartmentsStore>((set) => ({
  // Dialog state
  open: null,
  setOpen: (str) => set({ open: str }),
  currentRow: null,
  setCurrentRow: (department) => set({ currentRow: department }),

  // Data and loading states
  departments: [],
  setDepartments: (departments) => set({ departments }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  error: null,
  setError: (error) => set({ error }),

  // Pagination
  totalItems: 0,
  setTotalItems: (totalItems) => set({ totalItems }),
  currentPage: 1,
  setCurrentPage: (currentPage) => set({ currentPage }),
  perPage: 20,
  setPerPage: (perPage) => set({ perPage }),
  totalPages: 1,
  setTotalPages: (totalPages) => set({ totalPages }),

  // Actions
  refetch: () => {},
  setRefetch: (refetch) => set({ refetch }),
  createDepartment: async () => {},
  setCreateDepartment: (createDepartment) => set({ createDepartment }),
  updateDepartment: async () => {},
  setUpdateDepartment: (updateDepartment) => set({ updateDepartment }),
  deleteDepartment: async () => {},
  setDeleteDepartment: (deleteDepartment) => set({ deleteDepartment }),
  deleteDepartments: async () => {},
  setDeleteDepartments: (deleteDepartments) => set({ deleteDepartments }),

  // Filtering
  filters: {
    page: 1,
    perPage: 20,
    sort: 'name',
  },
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: { page: 1, perPage: 20, sort: 'name' } }),
}))
