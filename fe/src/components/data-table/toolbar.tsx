import { startOfDay } from 'date-fns'
import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  selectMode?: boolean
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
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Filter...',
  searchKey,
  selectMode = false,
  onSelectModeChange,
  filters = [],
  dateFilters = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || table.getState().globalFilter

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        {searchKey ? (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className='h-8 w-[150px] lg:w-[250px]'
          />
        ) : (
          <Input
            placeholder={searchPlaceholder}
            value={table.getState().globalFilter ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className='h-8 w-[150px] lg:w-[250px]'
          />
        )}
        <div className='flex gap-x-2'>
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
          {dateFilters.map((dateFilter) => {
            const column = table.getColumn(dateFilter.columnId)
            if (!column) return null

            // Get current filter value or use default date (today)
            const currentDate = column.getFilterValue() as Date | undefined
            const defaultDate = dateFilter.defaultDate || startOfDay(new Date())

            return (
              <DatePicker
                key={dateFilter.columnId}
                date={currentDate || defaultDate}
                onDateChange={(date) => {
                  column.setFilterValue(date)
                }}
                placeholder={dateFilter.title || 'Select date'}
              />
            )
          })}
        </div>
        {(isFiltered ||
          dateFilters.some((dateFilter) => {
            const column = table.getColumn(dateFilter.columnId)
            return column?.getFilterValue()
          })) && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
              // Clear all date filters
              // dateFilters.forEach((dateFilter) => {
              //   const column = table.getColumn(dateFilter.columnId)
              //   if (column) {
              //     column.setFilterValue(undefined)
              //   }
              // })
            }}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <Cross2Icon className='ms-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
      {onSelectModeChange && (
        <Button
          variant={selectMode ? 'default' : 'outline'}
          size='sm'
          onClick={() => onSelectModeChange(!selectMode)}
          className='ml-2'
        >
          {selectMode ? 'Exit Select Mode' : 'Select Mode'}
        </Button>
      )}
    </div>
  )
}
