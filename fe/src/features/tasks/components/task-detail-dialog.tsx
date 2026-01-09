/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { Logs, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
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
import { useTasksStore } from '../data/tasks-store'
import { useTaskQuery } from '../hooks/use-task-query'

type TaskDetailDialogProps = {
  task?: Task
  taskId?: string
  // open: boolean
  onOpenChange?: (open: boolean) => void
}

export function TaskDetailDialog({
  taskId,
  // open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { users, isLoading: userLoading } = useUserQuery()
  const { currentTask, setCurrentTask } = useTasksStore()
  const { updateTask } = useTaskQuery()
  const [fetchedTask, setFetchedTask] = useState<Task | null>(null)
  const [_isLoading, setIsLoading] = useState(false)
  // const [currentTask, setCurrentTask] = useState(task)
  const [contentTab, setContentTab] = useState('details')
  const [nonNullTask, setNonNullTask] = useState(currentTask! || {})

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
  }, [])

  useEffect(() => {
    if (fetchedTask) {
      setCurrentTask({ ...currentTask, ...fetchedTask })
    }
  }, [fetchedTask])

  useEffect(() => {
    if (currentTask) {
      setNonNullTask(currentTask)
    }
  }, [currentTask])

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
          assignees: data.assignees as string[],
          due_date: dueDate,
        }
        setIsLoading(true)
        await updateTask(taskId, updateData).then(() => {
          setIsLoading(false)
        })
      }
    } catch (error) {
      //TODO: Error handling is done in the provider
      // eslint-disable-next-line no-console
      console.error('Failed to submit task:', error)
    }
  }

  if (!currentTask) {
    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className='flex gap-2'>
                <div>Đang tải</div> <Spinner />{' '}
              </div>
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      modal={false}
      open={!!currentTask}
      onOpenChange={(open) => {
        setCurrentTask(null)
        onOpenChange?.(open)
      }}
    >
      {
        <DialogContent
          className={cn(
            'flex h-dvh max-w-[900px] rounded-none px-0 pt-0 pb-0 md:h-2/3 md:rounded-md lg:max-h-[80dvh] lg:rounded'
          )}
        >
          <div className='grid h-full w-full grid-cols-[1fr_4.5rem]'>
            <div className='no-scrollbar relative h-full overflow-y-scroll'>
              <DialogHeader className='sticky top-0 z-50 bg-white pt-3'>
                <DialogTitle className='flex flex-col gap-1 px-4 text-left text-lg'>
                  <div className='text-muted-foreground text-sm'>
                    Task:{' '}
                    <span className='text-foreground font-mono'>
                      #{nonNullTask.id}
                    </span>
                  </div>
                  {/* add department name with badge component */}
                  <div className='text-muted-foreground py-2 text-[12px]'>
                    <span className='text-muted-foreground text-sx font-mono'>
                      {nonNullTask.departments?.map((department) => {
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
              <div className='flex h-[78dvh] grow px-4 lg:h-[49dvh]'>
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
                            {nonNullTask.title}
                          </h3>
                        </div>
                      </div>

                      <div className='space-between flex flex-1 flex-col items-baseline justify-between space-y-6 overflow-y-auto p-2'>
                        <div className='flex w-full items-center gap-2'>
                          <ButtonGroup className=''>
                            {statuses.map((status) => (
                              <Button
                                key={status.value}
                                variant={
                                  status.value === nonNullTask.status
                                    ? 'default'
                                    : 'outline'
                                }
                                onClick={() => {
                                  onSubmit({ status: status.value })
                                }}
                              >
                                {<status.icon className={status.className} />}{' '}
                                {status.label}
                              </Button>
                            ))}
                          </ButtonGroup>
                          {_isLoading && <Spinner className='size-5' />}
                        </div>

                        {/* Task Assignees */}

                        <div className='flex w-full items-center gap-2'>
                          <MultiSelect
                            options={memoizedUsers.map((user) => ({
                              label: `${user.name.trim() || user.username}`,
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
                            defaultValue={nonNullTask.assignees as string[]}
                            onValueChange={(value) => {
                              onSubmit({ assignees: value })
                            }}
                            placeholder={userLoading ? 'Đang tải' : 'Phân công'}
                            disabled={userLoading}
                            hideCaret
                            className='bg-white shadow-none outline-0 hover:bg-gray-100'
                          />
                        </div>
                      </div>

                      {/* Task Description */}
                      <div className='p-2'>
                        <Separator className='my-2' />

                        <div className='text-sm font-medium'>Mô tả</div>
                        <div>
                          {nonNullTask.description ? (
                            <div
                              className='prose prose-sm max-w-none text-sm'
                              dangerouslySetInnerHTML={{
                                __html: nonNullTask.description,
                              }}
                            />
                          ) : (
                            <p className='text-muted-foreground text-sm'>
                              Chưa có mô tả
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
                    <FeedbackConversation taskId={nonNullTask.id} />
                  </div>
                </div>

                {/* <Separator orientation='vertical' /> */}
              </div>
            </div>
            {/* sidebar */}
            <div className='flex flex-col gap-2 border-l px-2 pt-16'>
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
          </div>
        </DialogContent>
      }
    </Dialog>
  )
}
