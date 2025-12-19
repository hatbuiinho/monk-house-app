import { useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { useUserQuery } from '@/features/users/hooks/useUserQuery'
import { statuses } from '../data/data'
import {
  type Task,
  type TaskForm,
  type TaskStatus,
  type TaskUpdate,
} from '../data/schema'
import { useTaskQuery } from '../hooks/useTaskQuery'
import { ResponsiveDropdown } from './responsive-dropdown'

type TaskDetailDialogProps = {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { users, isLoading: userLoading } = useUserQuery()
  const { updateTask } = useTaskQuery()
  const [updateValue, setUpdateValue] = useState<TaskUpdate>(task)

  useEffect(() => {
    setUpdateValue(task)
  }, [task])

  const memoizedUsers = useMemo(() => users, [users])

  const onSubmit = async (data: Partial<TaskForm>) => {
    try {
      const dueDate = data.due_date
        ? new Date(data.due_date).toISOString()
        : undefined
      if (task) {
        // Prepare update data
        const updateData: TaskUpdate = {
          status: data.status as TaskStatus,
          assignees: data.assignees,
          due_date: dueDate,
        }
        await updateTask(task.id, updateData)
      }
    } catch (error) {
      //TODO: Error handling is done in the provider
      // eslint-disable-next-line no-console
      console.error('Failed to submit task:', error)
    }
  }

  // const label = labels.find((label) => label.value === task.label)
  // const priority = priorities.find(
  //   (priority) => priority.value === task.priority
  // )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='text-left text-lg'>
            <div>Task Details</div>

            <div className='text-muted-foreground text-[12px]'>
              Task ID:{' '}
              <span className='text-foreground text-sx font-mono'>
                #{task.id}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3'>
          {/* Task ID and Status */}

          <div className='flex items-center justify-between'>
            {/* Task Title */}
            <div>
              <h3 className='text-lg leading-tight font-semibold'>
                {task.title}
              </h3>
            </div>

            {/* {status && (
              <Badge variant='outline' className='flex items-center gap-1'>
                {status.icon && <status.icon className='h-3 w-3' />}
                {status.label}
              </Badge>
            )} */}
          </div>

          <Separator />

          <div className='space-between flex flex-1 flex-col items-baseline justify-between space-y-6 overflow-y-auto p-2'>
            <div className='flex items-center gap-2'>
              {/* <Dropdown
                defaultValue={updateValue.status}
                onValueChange={(value) => {
                  setUpdateValue({ status: value as TaskStatus })
                  onSubmit({ status: value })
                }}
                placeholder='Select status'
                items={statuses}
                className='border-0 bg-gray-50 shadow-none outline-0'
              /> */}
              <ResponsiveDropdown
                defaultValue={updateValue.status as string}
                items={statuses}
                onChange={(value) => {
                  setUpdateValue({ status: value.value as TaskStatus })
                  onSubmit({ status: value.value })
                }}
              />
            </div>

            {/* Task Assignees */}

            <div className='flex items-center gap-2'>
              <div>
                <MultiSelect
                  options={memoizedUsers.map((user) => ({
                    label: `${user.name} ${user.username}`,
                    value: user.id,
                    icon: () => (
                      <Avatar>
                        <AvatarImage src={user.avatar_url} alt={user.name} />
                        <AvatarFallback>PQ</AvatarFallback>
                      </Avatar>
                    ),
                  }))}
                  defaultValue={updateValue.assignees}
                  onValueChange={(value) => {
                    setUpdateValue({ assignees: value })
                    onSubmit({ assignees: value })
                  }}
                  placeholder={
                    userLoading ? 'Loading users...' : 'Select assignees'
                  }
                  disabled={userLoading}
                  hideCaret
                  className='bg-white shadow-none outline-0 hover:bg-gray-100'
                />
              </div>
            </div>
          </div>

          {/* Task Description */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium'>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div
                  className='prose prose-sm max-w-none text-sm'
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <p className='text-muted-foreground text-sm'>
                  No description available for this task.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
