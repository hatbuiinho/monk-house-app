import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { labels, statuses } from '../data/data'
import { type Task } from '../data/schema'
import { useTasksStore } from '../data/tasks-store'
import { DataTableRowActions } from './data-table-row-actions'

type TaskCardProps = {
  row: Task
  selectMode?: boolean
  onTaskClick?: (task: Task) => void
}

export function TaskCard({
  row,
  selectMode = false,
  onTaskClick,
}: TaskCardProps) {
  const task = row
  const label = labels.find((label) => label.value === task.label)
  const status = statuses.find((status) => status.value === task.status)
  const [selected, setSelected] = useState(false)

  const { toggleTaskSelection, selectedTasks } = useTasksStore()

  useEffect(() => {
    setSelected(selectedTasks.includes(task.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTasks])

  return (
    <Card
      onClick={() => {
        if (selectMode) {
          toggleTaskSelection(task.id)
        } else {
          onTaskClick?.(task)
        }
      }}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        selected && 'ring-primary ring-2 ring-offset-2'
      )}
    >
      <CardHeader className=''>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-2'>
            {selectMode && (
              <Checkbox
                checked={selected}
                onCheckedChange={(_) => {
                  toggleTaskSelection(task.id)
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label='Select task'
                className='translate-y-[2px]'
              />
            )}
            <div className='text-muted-foreground text-sm'>
              {task.created && format(new Date(task.created), 'dd/MM/y')}
            </div>
          </div>
          <DataTableRowActions task={row} />
        </div>
      </CardHeader>

      <CardContent className='space-y-3 pt-0'>
        <div className='cursor-pointer space-y-2'>
          <div className='flex items-center space-x-2'>
            {label && <Badge variant='outline'>{label.label}</Badge>}
          </div>
          <CardTitle className='line-clamp-2 text-base leading-tight'>
            {task.title}
          </CardTitle>
        </div>

        <div className='flex flex-wrap gap-2'>
          {status && (
            <div className='flex items-center gap-1 text-sm'>
              {status.icon && (
                <status.icon
                  className={cn(
                    'text-muted-foreground size-3.5',
                    status.className
                  )}
                />
              )}
              <span>{status.label}</span>
            </div>
          )}

          {/* {priority && (
            <div className='flex items-center gap-1 text-sm'>
              {priority.icon && (
                <priority.icon className='text-muted-foreground size-3.5' />
              )}
              <span>{priority.label}</span>
            </div>
          )} */}
        </div>
      </CardContent>
    </Card>
  )
}
