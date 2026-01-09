import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { type Task } from '../data/schema'
import { useTasksStore } from '../data/tasks-store'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { TaskCard } from './task-card'
import { TaskDetailDialog } from './task-detail-dialog'
import TaskStatusButtonGroup from './task-status-button-group'

const route = getRouteApi('/_authenticated/')

type DataTableProps = {
  data?: Task[]
  className?: string
}

export function TasksCardGrid({ className }: DataTableProps) {
  // Local UI-only states
  const {
    tasks,
    isLoading,
    error,
    currentTask,
    setCurrentTask,
    setFilters,
    totalPages,
    filters,
  } = useTasksStore()

  const [selectMode, setSelectMode] = useState(false)

  return (
    <>
      <div
        className={cn(
          'max-sm:has-[div[role="toolbar"]]:mb-16', // Add margin bottom to the table on mobile when the toolbar is visible
          'flex flex-1 flex-col gap-4',
          className
        )}
      >
        <DataTableToolbar
          className='w-full'
          searchPlaceholder='Tìm kiếm...'
          selectMode={selectMode}
          onSelectModeChange={setSelectMode}
          navigate={route.useNavigate()}
          search={route.useSearch()}
        />
        <div
          className={cn('flex h-64 items-center justify-center', {
            hidden: !isLoading && !error,
          })}
        >
          <div className='text-muted-foreground'>Loading...</div>
          {error && (
            <div className='text-destructive'>Error: {error.message}</div>
          )}
        </div>
        <div className={cn({ 'opacity-0': isLoading || error })}>
          {/* Card Grid Layout */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {tasks.length ? (
              tasks.map((row) => (
                <TaskCard
                  key={row.id}
                  row={row}
                  selectMode={selectMode}
                  onTaskClick={(task) => {
                    setCurrentTask(task)
                  }}
                />
              ))
            ) : (
              <div className='text-muted-foreground col-span-full flex h-60 flex-col items-center justify-center'>
                <Leaf size={100} />
                <div>Trống</div>
              </div>
            )}
          </div>
        </div>

        <DataTablePagination
          totalPages={totalPages}
          currentPage={filters.currentPage}
          perPage={filters.perPage}
          setFilters={setFilters}
          className='mt-auto'
        />
        <div className='p-3'></div>
        <TaskStatusButtonGroup />
        <DataTableBulkActions />
        {currentTask && <TaskDetailDialog taskId={currentTask?.id} />}
      </div>
    </>
  )
}
