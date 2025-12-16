import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import {
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { statuses } from '../data/data'
import { type Task } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { TaskCard } from './task-card'
import { TaskDetailDialog } from './task-detail-dialog'
import { tasksColumns as columns } from './tasks-columns'

const route = getRouteApi('/_authenticated/tasks/')

type DataTableProps = {
  data: Task[]
}

export function TasksCardGrid({ data }: DataTableProps) {
  // Local UI-only states
  const [selectMode, setSelectMode] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Local state management for table (uncomment to use local-only state, not synced with URL)
  // const [globalFilter, onGlobalFilterChange] = useState('')
  // const [columnFilters, onColumnFiltersChange] = useState<ColumnFiltersState>([])
  // const [pagination, onPaginationChange] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  // Synced with URL states (updated to match route search schema defaults)
  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: route.useSearch(),
    navigate: route.useNavigate(),
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: true, key: 'filter' },
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'priority', searchKey: 'priority', type: 'array' },
      { columnId: 'created', searchKey: 'created', type: 'date' },
    ],
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const id = String(row.getValue('id')).toLowerCase()
      const title = String(row.getValue('title')).toLowerCase()
      const searchValue = String(filterValue).toLowerCase()

      return id.includes(searchValue) || title.includes(searchValue)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
  })

  const pageCount = table.getPageCount()
  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16', // Add margin bottom to the table on mobile when the toolbar is visible
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Filter by title or ID...'
        selectMode={selectMode}
        onSelectModeChange={setSelectMode}
        navigate={route.useNavigate()}
        filters={[
          {
            columnId: 'status',
            title: 'Status',
            options: statuses,
          },
          // {
          //   columnId: 'priority',
          //   title: 'Priority',
          //   options: priorities,
          // },
        ]}
        dateFilters={[
          {
            columnId: 'created',
            title: 'Created Date',
            // defaultDate: new Date(),
          },
        ]}
      />
      <div>
        {/* Card Grid Layout */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TaskCard
                key={row.id}
                row={row}
                selectMode={selectMode}
                onTaskClick={(task) => {
                  setSelectedTask(task)
                  setIsDetailSheetOpen(true)
                }}
              />
            ))
          ) : (
            <div className='text-muted-foreground col-span-full flex h-32 items-center justify-center'>
              No results.
            </div>
          )}
        </div>
      </div>

      <DataTablePagination table={table} className='mt-auto' />
      <div className='p-3'></div>
      <Tabs
        onValueChange={(value) => {
          const column = table.getColumn('status')
          column?.setFilterValue(value)
        }}
        defaultValue='todo'
        className='fixed right-2 bottom-2 left-2 w-full md:hidden'
      >
        <TabsList className='h-full w-full'>
          {statuses.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.icon && (
                <status.icon className='text-muted-foreground size-4' />
              )}
              {status.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTableBulkActions table={table} />
      <TaskDetailDialog
        task={selectedTask}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
      />
    </div>
  )
}
