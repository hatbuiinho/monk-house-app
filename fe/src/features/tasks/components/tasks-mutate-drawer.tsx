import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  formSchema,
  type Task,
  type TaskCreate,
  type TaskForm,
  type TaskStatus,
  type TaskUpdate,
} from '../data/schema'
import { useTaskQuery } from '../hooks/use-task-query'
import TaskFormFields from './task-form-fields'

type TaskMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Task
}

export function TasksMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: TaskMutateDrawerProps) {
  const isUpdate = !!currentRow
  const isMobile = useIsMobile()
  const { createTask, updateTask } = useTaskQuery()
  const isLoading = false

  const form = useForm<TaskForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      title: '',
      description: '',
      status: 'todo',
      label: '',
      assignees: [],
      due_date: '',
      departments: [],
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset(currentRow)
      return
    }

    form.reset({
      title: '',
      description: '',
      status: 'todo',
      label: '',
      assignees: [],
      due_date: '',
      departments: [],
    })
  }, [currentRow, form])

  const onSubmit = async (data: TaskForm) => {
    try {
      const dueDate = data.due_date
        ? new Date(data.due_date).toISOString()
        : undefined

      if (isUpdate && currentRow) {
        // Prepare update data
        const updateData: TaskUpdate = {
          title: data.title,
          description: data.description,
          status: data.status as TaskStatus,
          label: data.label,
          // priority: data.priority as TaskPriority,
          assignees: data.assignees as string[],
          due_date: dueDate,
          departments: data.departments as string[],
        }
        await updateTask(currentRow.id, updateData)
      } else {
        // Prepare create data
        const createData: TaskCreate = {
          title: data.title,
          description: data.description,
          status: data.status as TaskStatus,
          label: data.label,
          // priority: data.priority as TaskPriority,
          assignees: data.assignees as string[],
          due_date: dueDate,
          departments: data.departments as string[],
        }
        await createTask(createData)
      }

      // Reset form and close dialog on success
      form.reset()
      onOpenChange(false)
    } catch (error) {
      //TODO: Error handling is done in the provider
      // eslint-disable-next-line no-console
      console.error('Failed to submit task:', error)
    }
  }

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v)
    if (!v) {
      form.reset()
    }
  }

  const title = `${isUpdate ? 'Cập nhật' : 'Tạo mới'} công việc`
  // const description = isUpdate
  //   ? 'Update the task by providing necessary info.'
  //   : 'Add a new task by providing necessary info.'
  // const descriptionSuffix = "Click save when you're done."

  if (isMobile) {
    // Mobile: Use right sheet
    return (
      <Sheet modal={true} open={open} onOpenChange={handleOpenChange}>
        <SheetContent side='right' className='flex w-full flex-col md:w-3/4'>
          <SheetHeader className='text-start'>
            <SheetTitle>{title}</SheetTitle>
            {/* <SheetDescription>
              {description} {descriptionSuffix}
            </SheetDescription> */}
          </SheetHeader>
          <Form {...form}>
            <form
              id='tasks-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='flex-1 space-y-6 overflow-y-auto p-2'
            >
              <TaskFormFields isUpdate={isUpdate} control={form.control} />
            </form>
          </Form>
          <SheetFooter className='gap-2'>
            <Button
              variant='outline'
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className='w-full'
            >
              Đóng
            </Button>
            <Button
              form='tasks-form'
              type='submit'
              disabled={isLoading}
              className='w-full'
            >
              {isLoading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Use dialog
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex flex-col sm:max-w-[500px]'>
        <DialogHeader className='text-start'>
          <DialogTitle>{title}</DialogTitle>
          {/* <DialogDescription>
            {description} {descriptionSuffix}
          </DialogDescription> */}
        </DialogHeader>
        <Form {...form}>
          <form
            id='tasks-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <TaskFormFields isUpdate={isUpdate} control={form.control} />
          </form>
        </Form>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline' disabled={isLoading}>
              Đóng
            </Button>
          </DialogClose>
          <Button form='tasks-form' type='submit' disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
