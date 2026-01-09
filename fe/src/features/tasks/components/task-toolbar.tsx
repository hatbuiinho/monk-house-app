/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { ListCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import {
  useTableUrlState,
  type NavigateFn,
  type SearchRecord,
} from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDepartmentsStore } from '@/features/departments/data/departments-store'
import { useDepartmentQuery } from '@/features/departments/hooks/use-department-query'
import { type TaskFilter } from '@/features/tasks/data/schema'
import { useTasksStore } from '@/features/tasks/data/tasks-store'
import { DataTableFacetedFilter } from '../../../components/data-table/faceted-filter'
import { DateRangePicker } from '../../../components/ui/date-range-picker'

export type DataTableToolbarProps = {
  // table: Table<TData>
  searchPlaceholder?: string
  selectMode?: boolean
  navigate: NavigateFn
  search: SearchRecord
  onSelectModeChange?: (selectMode: boolean) => void
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  className?: string
}

type FilterField = keyof TaskFilter

const filterFields: FilterField[] = ['search', 'endDate', 'startDate', 'status']

export function TaskToolbar({
  // table,
  searchPlaceholder = 'Tìm kiếm...',
  selectMode = false,
  onSelectModeChange,
  className,
  search,
  navigate,
}: DataTableToolbarProps) {
  useDepartmentQuery()
  const { departments } = useDepartmentsStore()
  const { filters: tasksFilters, setFilters, clearFilters } = useTasksStore()
  const { onFiltersChange } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'string' },
      { columnId: 'startDate', searchKey: 'startDate', type: 'date' },
      { columnId: 'endDate', searchKey: 'endDate', type: 'date' },
      { columnId: 'search', searchKey: 'search', type: 'string' },
    ],
  })

  const isFiltered = filterFields.some(
    (key) => tasksFilters[key as keyof TaskFilter]
  )

  const [searchValue, setSearchValue] = useState('')
  const debouncedSearchValue = useDebounce(searchValue, 300)

  useEffect(() => {
    setFilters({ search: debouncedSearchValue })
  }, [debouncedSearchValue])

  useEffect(() => {
    const value = tasksFilters.search || ''
    setSearchValue(value)
  }, [tasksFilters.search])

  useEffect(() => {
    onFiltersChange({
      ...tasksFilters,
      search: encodeURIComponent(tasksFilters.search || ''),
    })
  }, [tasksFilters])

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col items-start gap-2 overflow-y-scroll p-1 sm:flex-row sm:items-center sm:space-x-2'>
        <div className='w-full'>
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => {
              const { value } = event.target
              setSearchValue(value)
            }}
            className={cn('h-8', className)}
          />
        </div>
        <div className='flex gap-x-2'>
          {onSelectModeChange && (
            <Button
              variant={selectMode ? 'outline' : 'outline'}
              size='sm'
              onClick={() => onSelectModeChange(!selectMode)}
            >
              {selectMode ? (
                <X className='size-4' />
              ) : (
                <ListCheck className='size-4' />
              )}
            </Button>
          )}
          <DataTableFacetedFilter
            key='department'
            columnId='departments'
            title='Ban'
            options={departments.map((d) => ({
              label: d.name,
              value: d.id,
            }))}
            selectedValues={tasksFilters.departments ?? []}
          />

          <DateRangePicker
            range={{ from: tasksFilters.startDate, to: tasksFilters.endDate }}
            onRangeChange={(range) => {
              const updated = {
                startDate: range?.from,
                endDate: range?.to,
              }
              setFilters(updated)
            }}
          />

          {isFiltered && (
            <Button
              variant='ghost'
              onClick={() => {
                clearFilters()
                // onFiltersChange?.({})
              }}
              className='h-8 px-2 lg:px-3'
            >
              Xóa <Cross2Icon className='ms-2 h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
