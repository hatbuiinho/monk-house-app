import { useEffect } from 'react'
import { startOfDay } from 'date-fns'
import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { ListCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  selectMode?: boolean
  navigate: NavigateFn
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
  dateFilters?: {
    columnId: string
    title?: string
    defaultDate?: Date
  }[]
  className?: string
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Filter...',
  searchKey,
  selectMode = false,
  onSelectModeChange,
  filters = [],
  dateFilters = [],
  className,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || table.getState().globalFilter

  useEffect(() => {
    table.getColumn('created')?.setFilterValue(startOfDay(new Date()))
  }, [])
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col items-start gap-2 overflow-y-scroll sm:flex-row sm:items-center sm:space-x-2'>
        <div className='w-full'>
          {searchKey ? (
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className='h-8'
            />
          ) : (
            <Input
              placeholder={searchPlaceholder}
              value={table.getState().globalFilter ?? ''}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className={cn('h-8 w-[150px] lg:w-[250px]', className)}
            />
          )}
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
          <div className='hidden md:block'>
            {filters.map((filter) => {
              const column = table.getColumn(filter.columnId)
              if (!column) return null
              return (
                <DataTableFacetedFilter
                  key={filter.columnId}
                  column={column}
                  title={filter.title}
                  options={filter.options}
                />
              )
            })}
          </div>

          {dateFilters.map((dateFilter) => {
            const column = table.getColumn(dateFilter.columnId)
            if (!column) return null

            // Get current filter value or use default date (today)
            const currentDate = column.getFilterValue() as Date
            return (
              <DatePicker
                key={dateFilter.columnId}
                date={currentDate}
                onDateChange={(date) => {
                  column.setFilterValue(date)
                }}
                placeholder={dateFilter.title || 'Select date'}
              />
            )
          })}
          {(isFiltered ||
            dateFilters.some((dateFilter) => {
              const column = table.getColumn(dateFilter.columnId)
              return column?.getFilterValue()
            })) && (
            <Button
              variant='ghost'
              onClick={() => {
                table.setGlobalFilter('')
                // Clear all date filters
                ;[...dateFilters, ...filters].forEach((dateFilter) => {
                  const column = table.getColumn(dateFilter.columnId)
                  if (column) {
                    setTimeout(() => {
                      column.setFilterValue(undefined)
                    }, 0)
                  }
                })
              }}
              className='h-8 px-2 lg:px-3'
            >
              Clear <Cross2Icon className='ms-2 h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
      {/* <DataTableViewOptions table={table} /> */}
    </div>
  )
}
