import { cn } from '@/lib/utils'
import { statuses } from '../data/data'
import { useTasksStore } from '../data/tasks-store'

const TaskStatusButtonGroup = () => {
  const { filters, setFilters } = useTasksStore()
  return (
    <div className='fixed right-0 bottom-0 left-0 h-14 w-full rounded-t-xl bg-gray-200 md:hidden'>
      <div className='flex h-full w-full items-center p-2'>
        {statuses.map((status) => (
          <button
            className={cn(
              'flex grow items-center justify-center gap-2 rounded-xl px-3 py-2 transition-all duration-500',
              { 'bg-white': filters.status === status.value }
            )}
            key={status.value}
            value={status.value}
            onClick={() => {
              setFilters({ status: status.value })
            }}
          >
            {status.icon && (
              <status.icon className={cn('size-4', status.className)} />
            )}
            {status.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TaskStatusButtonGroup
