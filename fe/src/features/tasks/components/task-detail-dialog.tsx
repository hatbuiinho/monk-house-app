import { useEffect, useMemo, useState } from 'react'
import { Logs, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { FeedbackConversation } from '@/features/feedbacks/components/feedback-conversation'
import { useUserQuery } from '@/features/users/hooks/useUserQuery'
import { tasksAPI } from '../api/tasks-api'
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
  task?: Task
  taskId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailDialog({
  task,
  taskId,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { users, isLoading: userLoading } = useUserQuery()
  const { updateTask } = useTaskQuery()
  const [fetchedTask, setFetchedTask] = useState<Task | null>(null)
  const [_isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState(task)
  const [contentTab, setContentTab] = useState('details')

  // Determine which task to use - either the prop or the fetched one

  useEffect(() => {
    if (taskId) {
      const fetchTask = async () => {
        setIsLoading(true)
        try {
          const fetchedTask = await tasksAPI.getTask(taskId)
          setFetchedTask(fetchedTask)
        } catch (_error) {
          // console.error('Failed to fetch task:', error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchTask()
    }
  }, [taskId])

  useEffect(() => {
    if (fetchedTask) {
      setCurrentTask({ ...task, ...fetchedTask })
    }
  }, [fetchedTask, task])

  const memoizedUsers = useMemo(() => users, [users])

  const onSubmit = async (data: Partial<TaskForm>) => {
    try {
      const dueDate = data.due_date
        ? new Date(data.due_date).toISOString()
        : undefined
      if (taskId) {
        // Prepare update data
        const updateData: TaskUpdate = {
          status: data.status as TaskStatus,
          assignees: data.assignees,
          due_date: dueDate,
        }
        await updateTask(taskId, updateData)
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

  if (!currentTask) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading task...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-screen max-w-[900px] flex-col rounded-none px-0 pt-0 md:h-2/3 md:rounded-md lg:max-h-[80dvh] lg:rounded'>
        <div className='no-scrollbar h-full overflow-y-scroll'>
          <DialogHeader className='sticky top-0 bg-white pt-3'>
            <DialogTitle className='flex flex-col gap-1 px-4 text-left text-lg'>
              <div className='text-muted-foreground text-sm'>
                Task:{' '}
                <span className='text-foreground font-mono'>
                  #{currentTask.id}
                </span>
              </div>
              {/* add department name with badge component */}
              <div className='text-muted-foreground py-2 text-[12px]'>
                <span className='text-muted-foreground text-sx font-mono'>
                  {currentTask.departments?.map((department) => {
                    return typeof department === 'string' ? (
                      ''
                    ) : (
                      <Badge
                        variant='default'
                        className='flex items-center gap-1'
                      >
                        {department.name}
                      </Badge>
                    )
                  })}
                </span>
              </div>
            </DialogTitle>
            <Separator />
          </DialogHeader>
          {/* Content */}
          <div className='me-14 flex h-[78dvh] grow px-4 lg:h-[49dvh]'>
            <div
              className={cn('no-scrollbar hidden grow overflow-y-scroll', {
                block: contentTab === 'details',
              })}
            >
              <div className='grid grid-cols-1'>
                {/* Left column - Task Details */}
                <div className='space-y-3'>
                  {/* Task ID and Status */}

                  <div className='sticky top-0 flex items-center justify-between bg-white py-2'>
                    {/* Task Title */}
                    <div>
                      <h3 className='text-lg leading-tight font-semibold'>
                        {currentTask.title}
                      </h3>
                    </div>
                  </div>

                  <div className='space-between flex flex-1 flex-col items-baseline justify-between space-y-6 overflow-y-auto p-2'>
                    <div className='flex items-center gap-2'>
                      <ResponsiveDropdown
                        defaultValue={currentTask.status as string}
                        items={statuses}
                        onChange={(value) => {
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
                                <AvatarImage
                                  src={user.avatar_url}
                                  alt={user.name}
                                />
                                <AvatarFallback>PQ</AvatarFallback>
                              </Avatar>
                            ),
                          }))}
                          defaultValue={currentTask.assignees as string[]}
                          onValueChange={(value) => {
                            onSubmit({ assignees: value })
                          }}
                          placeholder={
                            userLoading
                              ? 'Loading users...'
                              : 'Select assignees'
                          }
                          disabled={userLoading}
                          hideCaret
                          className='bg-white shadow-none outline-0 hover:bg-gray-100'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task Description */}
                  <div className='p-2'>
                    <Separator className='my-2' />

                    <div className='text-sm font-medium'>Description</div>
                    <div>
                      {currentTask.description ? (
                        <div
                          className='prose prose-sm max-w-none text-sm'
                          dangerouslySetInnerHTML={{
                            __html: currentTask.description,
                          }}
                        />
                      ) : (
                        <p className='text-muted-foreground text-sm'>
                          No description available for this task.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn('hidden h-full grow', {
                block: contentTab === 'conversation',
              })}
            >
              {/* Right column - Feedback Conversation */}
              <div className='h-full'>
                <h3 className='mb-2 text-lg font-medium'>Conversation</h3>
                <FeedbackConversation taskId={currentTask.id} />
              </div>
            </div>

            {/* <Separator orientation='vertical' /> */}
          </div>
        </div>
        <div className='absolute top-0 right-0 bottom-0 mt-22 flex w-16 flex-col gap-2 border-l px-2 pt-4'>
          <Button
            onClick={() => {
              setContentTab('details')
            }}
            variant='outline'
            className='flex flex-col px-6 py-8'
          >
            <div
              className={cn('rounded p-1', {
                'bg-gray-200': contentTab === 'details',
              })}
            >
              <Logs />
            </div>{' '}
            <span className='text-xs'>Details</span>
          </Button>
          <Button
            onClick={() => {
              setContentTab('conversation')
            }}
            variant='outline'
            className='flex flex-col px-6 py-8'
          >
            <div
              className={cn('rounded p-1', {
                'bg-gray-200': contentTab === 'conversation',
              })}
            >
              <MessageSquare />
            </div>{' '}
            <span className='text-xs'>Chats</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
  // <DialogHeader className='sticky top-0 bg-white pt-6'>
  //   <DialogTitle className='text-left text-lg'>
  //     <div>Task Details</div>

  //     <div className='text-muted-foreground text-[12px]'>
  //       Task ID:{' '}
  //       <span className='text-foreground text-sx font-mono'>
  //         #{task.id}
  //       </span>
  //     </div>
  //   </DialogTitle>
  // </DialogHeader>
  // {
  /* {status && (
          <Badge variant='outline' className='flex items-center gap-1'>
            {status.icon && <status.icon className='h-3 w-3' />}
            {status.label}
          </Badge>
        )} */
  // }
}
