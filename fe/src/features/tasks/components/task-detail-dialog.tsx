import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { labels, priorities, statuses } from '../data/data'
import { type Task } from '../data/schema'

type TaskDetailDialogProps = {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  if (!task) return null

  const label = labels.find((label) => label.value === task.label)
  const status = statuses.find((status) => status.value === task.status)
  const priority = priorities.find(
    (priority) => priority.value === task.priority
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='text-left text-lg'>Task Details</DialogTitle>
        </DialogHeader>

        <div className='mt-6 space-y-6'>
          {/* Task ID and Status */}
          <div className='flex items-center justify-between'>
            <div className='text-muted-foreground text-sm'>
              Task ID:{' '}
              <span className='text-foreground font-mono'>#{task.id}</span>
            </div>
            {status && (
              <Badge variant='outline' className='flex items-center gap-1'>
                {status.icon && <status.icon className='h-3 w-3' />}
                {status.label}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Task Title */}
          <div>
            <h3 className='text-lg leading-tight font-semibold'>
              {task.title}
            </h3>
          </div>

          {/* Task Metadata */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {/* Labels */}

            {label ? (
              <Badge variant='outline'>{label.label}</Badge>
            ) : (
              <span className='text-muted-foreground text-sm'>No label</span>
            )}

            {/* Priority */}

            {priority ? (
              <div className='flex items-center gap-2'>
                {priority.icon && (
                  <priority.icon className='text-muted-foreground h-4 w-4' />
                )}
                <span className='text-sm'>{priority.label}</span>
              </div>
            ) : (
              <span className='text-muted-foreground text-sm'>No priority</span>
            )}
          </div>

          {/* Task Description Placeholder */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium'>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-sm'>
                No description available for this task.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
