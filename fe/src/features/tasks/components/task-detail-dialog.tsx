/* eslint-disable react-hooks/exhaustive-deps */
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
import { Spinner } from '@/components/ui/spinner'
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'
import { useDepartmentsStore } from '@/features/departments/data/departments-store'
import { FeedbackConversation } from '@/features/feedbacks/components/feedback-conversation'
import { useUserQuery } from '@/features/users/hooks/useUserQuery'
import { tasksAPI } from '../api/tasks-api'
import { getDepartmentBadges } from '../data/data'
import {
  type Task,
  type TaskForm,
  type TaskStatus,
  type TaskUpdate,
} from '../data/schema'
import { useTasksStore } from '../data/tasks-store'
import { useTaskQuery } from '../hooks/use-task-query'
import TaskStatusSwitch from './task-status-switch'

type TaskDetailDialogProps = {
  task?: Task
  taskId?: string
  open: boolean
  onOpenChange?: (open: boolean) => void
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { users, isLoading: userLoading } = useUserQuery()
  const { currentTask, setCurrentTask } = useTasksStore()
  const { updateTask } = useTaskQuery()
  const [fetchedTask, setFetchedTask] = useState<Task | null>(null)
  const [_isLoading, setIsLoading] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
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

  useEffect(() => {
    if (nonNullTask?.id) {
      setIsEditingDescription(false)
      setDescriptionDraft(nonNullTask.description ?? '')
    }
  }, [nonNullTask?.id, nonNullTask?.description])

  const memoizedUsers = useMemo(() => users, [users])

  const { departments } = useDepartmentsStore()
  const departmentBadges = useMemo(
    () => getDepartmentBadges(nonNullTask.departments, departments),
    [nonNullTask]
  )

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

  const onSaveDescription = async () => {
    if (!taskId) {
      return
    }
    try {
      setIsSavingDescription(true)
      await updateTask(taskId, { description: descriptionDraft })
      setIsEditingDescription(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update description:', error)
    } finally {
      setIsSavingDescription(false)
    }
  }

  const onCancelDescription = () => {
    setDescriptionDraft(nonNullTask.description ?? '')
    setIsEditingDescription(false)
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
      open={open}
      onOpenChange={(open) => {
        // setCurrentTask(null)
        onOpenChange?.(open)
      }}
    >
      {
        <DialogContent
          className={cn(
            'flex h-dvh max-w-[900px] rounded-none px-0 pt-0 pb-0 md:h-2/3 md:rounded-md lg:h-[80dvh] lg:w-[80vw] lg:max-w-[80vw] lg:rounded'
          )}
        >
          <div className='grid h-full w-full grid-cols-[1fr_4.5rem] lg:grid-cols-[1fr]'>
            <div className='no-scrollbar flex h-full flex-col overflow-y-hidden'>
              <DialogHeader className='sticky top-0 z-40 bg-white pt-3'>
                <DialogTitle className='flex flex-col gap-1 px-4 text-left text-lg'>
                  <div className='text-muted-foreground text-sm'>
                    Công việc:{' '}
                    <span className='text-foreground font-mono'>
                      #{nonNullTask.id}
                    </span>
                  </div>
                  {/* add department name with badge component */}
                  <div className='text-muted-foreground py-2 text-[12px]'>
                    <span className='text-muted-foreground text-sx font-mono'>
                      {departmentBadges.length > 0 && (
                        <div className='flex flex-wrap gap-1.5'>
                          {departmentBadges.map((dept) => (
                            <Badge
                              key={dept.id}
                              variant='outline'
                              className={cn('border', dept.className)}
                            >
                              {dept.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                </DialogTitle>
                <Separator />
              </DialogHeader>
              {/* Content */}
              <div className='flex min-h-0 grow flex-col lg:flex-row lg:gap-4'>
                <div
                  className={cn(
                    'no-scrollbar hidden grow pl-1 lg:block lg:flex-2 lg:pl-4',
                    {
                      'overflow-y-hidden': contentTab === 'details',
                      'overflow-y-auto': contentTab !== 'details',
                      block: contentTab === 'details',
                    }
                  )}
                >
                  <div className='grid h-full grid-cols-1'>
                    {/* Left column - Task Details */}
                    <div className='flex min-h-0 flex-col gap-3'>
                      {/* Task ID and Status */}

                      <div className='sticky top-0 flex items-center justify-between bg-white p-2'>
                        {/* Task Title */}
                        <div>
                          <h3 className='text-lg leading-tight font-semibold'>
                            {nonNullTask.title}
                          </h3>
                        </div>
                      </div>

                      {/* Task Status */}
                      <div className='space-between flex flex-col items-baseline justify-between gap-6 p-2'>
                        <div className='flex w-full items-center gap-2'>
                          <TaskStatusSwitch
                            key={`task-status-switch-detail`}
                            onSelect={(status) => {
                              onSubmit({ status })
                            }}
                            value={nonNullTask.status}
                          />
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
                      <div className='flex min-h-0 flex-1 flex-col p-2'>
                        <Separator className='my-2' />

                        <div className='flex items-center justify-between gap-2'>
                          <div className='text-sm font-medium'>Nội dung</div>
                          {isEditingDescription && (
                            <div className='flex gap-2'>
                              <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                onClick={onCancelDescription}
                                disabled={isSavingDescription}
                              >
                                Hủy
                              </Button>
                              <Button
                                type='button'
                                size='sm'
                                onClick={onSaveDescription}
                                disabled={isSavingDescription}
                              >
                                {isSavingDescription ? 'Đang lưu' : 'Lưu'}
                              </Button>
                            </div>
                          )}
                        </div>
                        {isEditingDescription ? (
                          <div className='mt-2 min-h-0 flex-1'>
                            <SimpleEditor
                              value={descriptionDraft}
                              editable
                              onChange={setDescriptionDraft}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            role='button'
                            tabIndex={0}
                            onClick={() => setIsEditingDescription(true)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                setIsEditingDescription(true)
                              }
                            }}
                            className='mt-2 min-h-0 flex-1 cursor-text overflow-y-auto rounded-md border border-transparent p-2 text-sm hover:border-gray-200'
                          >
                            {nonNullTask.description ? (
                              <div
                                className='tiptap ProseMirror simple-editor'
                                dangerouslySetInnerHTML={{
                                  __html: nonNullTask.description,
                                }}
                              />
                            ) : (
                              <p className='text-muted-foreground text-sm'>
                                Hãy nhấn vào đây để thêm nội dung.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    'hidden min-h-0 grow lg:block lg:flex-1 lg:border-l',
                    {
                      block: contentTab === 'conversation',
                    }
                  )}
                >
                  {/* Right column - Feedback Conversation */}
                  <div className='relative h-full'>
                    <FeedbackConversation taskId={nonNullTask.id} />
                  </div>
                </div>

                {/* <Separator orientation='vertical' /> */}
              </div>
            </div>
            {/* sidebar */}
            <div className='flex flex-col gap-2 border-l px-2 pt-16 lg:hidden'>
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
                <span className='text-xs'>Chi tiết</span>
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
