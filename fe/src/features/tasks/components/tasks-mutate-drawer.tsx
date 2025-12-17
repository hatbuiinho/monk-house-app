import { z } from 'zod'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { useUserQuery } from '@/features/users/hooks/useUserQuery'
import type { Task, TaskCreate, TaskStatus, TaskUpdate } from '../data/schema'
import { useTasks } from './tasks-provider'

type TaskMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Task
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  status: z.string().min(1, 'Please select a status.'),
  label: z.string().optional(),
  // priority: z.string().min(1, 'Please choose a priority.'),
  assignees: z.array(z.string()),
  due_date: z.string().optional(),
})
type TaskForm = z.infer<typeof formSchema>

interface FormFieldsProps {
  control: Control<TaskForm>
  isUpdate: boolean
}

// Common form fields component - moved outside to prevent recreation on each render
const FormFields = ({ control, isUpdate }: FormFieldsProps) => {
  const { users, isLoading } = useUserQuery()
  return (
    <>
      <FormField
        control={control}
        name='title'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder='Enter a title' />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name='description'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                {...field}
                placeholder='Enter a description (optional)'
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {isUpdate && (
        <FormField
          control={control}
          name='status'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <SelectDropdown
                defaultValue={field.value}
                onValueChange={field.onChange}
                placeholder='Select status'
                items={[
                  { label: 'Todo', value: 'todo' },
                  { label: 'In Progress', value: 'in_progress' },
                  { label: 'Done', value: 'done' },
                  { label: 'Canceled', value: 'canceled' },
                  { label: 'Backlog', value: 'backlog' },
                ]}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={control}
        name='assignees'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assignee</FormLabel>
            <FormControl>
              <MultiSelect
                options={users.map((user) => ({
                  label: `${user.name} ${user.username}`,
                  value: user.id,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={
                  isLoading ? 'Loading users...' : 'Select assignees'
                }
                disabled={isLoading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name='due_date'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date</FormLabel>
            <FormControl>
              <Input {...field} type='datetime-local' />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export function TasksMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: TaskMutateDrawerProps) {
  const isUpdate = !!currentRow
  const isMobile = useIsMobile()
  const { createTask, updateTask, isLoading } = useTasks()

  const form = useForm<TaskForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      title: '',
      description: '',
      status: 'todo',
      label: '',
      assignees: [],
      due_date: '',
    },
  })

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
          assignees: data.assignees,
          due_date: dueDate,
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
          assignees: data.assignees,
          due_date: dueDate,
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

  const title = `${isUpdate ? 'Update' : 'Create'} Task`
  const description = isUpdate
    ? 'Update the task by providing necessary info.'
    : 'Add a new task by providing necessary info.'
  const descriptionSuffix = "Click save when you're done."

  if (isMobile) {
    // Mobile: Use right sheet
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side='right' className='flex flex-col'>
          <SheetHeader className='text-start'>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {description} {descriptionSuffix}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form
              id='tasks-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='flex-1 space-y-6 overflow-y-auto p-2'
            >
              <FormFields isUpdate={isUpdate} control={form.control} />
            </form>
          </Form>
          <SheetFooter className='gap-2'>
            <Button
              variant='outline'
              disabled={isLoading}
              onClick={() => handleOpenChange(false)}
              className='w-full'
            >
              Close
            </Button>
            <Button
              form='tasks-form'
              type='submit'
              disabled={isLoading}
              className='w-full'
            >
              {isLoading ? 'Saving...' : 'Save changes'}
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
          <DialogDescription>
            {description} {descriptionSuffix}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='tasks-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormFields isUpdate={isUpdate} control={form.control} />
          </form>
        </Form>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline' disabled={isLoading}>
              Close
            </Button>
          </DialogClose>
          <Button form='tasks-form' type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
