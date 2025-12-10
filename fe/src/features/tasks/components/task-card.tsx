import { type Row } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { labels, priorities, statuses } from '../data/data'
import { type Task } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

type TaskCardProps = {
  row: Row<Task>
  onSelectChange?: (selected: boolean) => void
}

export function TaskCard({ row, onSelectChange }: TaskCardProps) {
  const task = row.original
  const label = labels.find((label) => label.value === task.label)
  const status = statuses.find((status) => status.value === task.status)
  const priority = priorities.find(
    (priority) => priority.value === task.priority
  )

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        row.getIsSelected() && 'ring-primary ring-2 ring-offset-2'
      )}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                row.toggleSelected(!!value)
                onSelectChange?.(!!value)
              }}
              aria-label='Select task'
              className='translate-y-[2px]'
            />
            <div className='text-muted-foreground text-sm'>#{task.id}</div>
          </div>
          <DataTableRowActions row={row} />
        </div>
      </CardHeader>

      <CardContent className='space-y-3 pt-0'>
        <div className='space-y-2'>
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
                <status.icon className='text-muted-foreground size-3.5' />
              )}
              <span>{status.label}</span>
            </div>
          )}

          {priority && (
            <div className='flex items-center gap-1 text-sm'>
              {priority.icon && (
                <priority.icon className='text-muted-foreground size-3.5' />
              )}
              <span>{priority.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
