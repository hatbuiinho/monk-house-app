import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SelectDropdown } from '@/components/select-dropdown'
import type {
  TaskPriority,
  TaskStatus,
  Task,
  TaskCreate,
  TaskUpdate,
} from '../data/schema'
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
  priority: z.string().min(1, 'Please choose a priority.'),
  assignee: z.string().optional(),
  due_date: z.string().optional(),
})
type TaskForm = z.infer<typeof formSchema>

export function TasksMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: TaskMutateDrawerProps) {
  const isUpdate = !!currentRow
  const { createTask, updateTask, isLoading } = useTasks()

  const form = useForm<TaskForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      title: '',
      description: '',
      status: 'todo',
      label: '',
      priority: 'medium',
      assignee: '',
      due_date: '',
    },
  })

  const onSubmit = async (data: TaskForm) => {
    try {
      if (isUpdate && currentRow) {
        // Prepare update data
        const updateData: TaskUpdate = {
          title: data.title,
          description: data.description,
          status: data.status as TaskStatus,
          label: data.label,
          priority: data.priority as TaskPriority,
          assignee: data.assignee,
          due_date: data.due_date,
        }
        await updateTask(currentRow.id, updateData)
      } else {
        // Prepare create data
        const createData: TaskCreate = {
          title: data.title,
          description: data.description,
          status: data.status as TaskStatus,
          label: data.label,
          priority: data.priority as TaskPriority,
          assignee: data.assignee,
          due_date: data.due_date,
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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          form.reset()
        }
      }}
    >
      <DialogContent className='flex flex-col sm:max-w-[500px]'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isUpdate ? 'Update' : 'Create'} Task</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Update the task by providing necessary info.'
              : 'Add a new task by providing necessary info.'}
            Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='tasks-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormField
              control={form.control}
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
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Enter a description (optional)'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Select label (optional)'
                    items={[
                      { label: 'Bug', value: 'bug' },
                      { label: 'Feature', value: 'feature' },
                      { label: 'Documentation', value: 'documentation' },
                    ]}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='priority'
              render={({ field }) => (
                <FormItem className='relative'>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex flex-col space-y-1'
                    >
                      <FormItem className='flex items-center'>
                        <FormControl>
                          <RadioGroupItem value='high' />
                        </FormControl>
                        <FormLabel className='font-normal'>High</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center'>
                        <FormControl>
                          <RadioGroupItem value='medium' />
                        </FormControl>
                        <FormLabel className='font-normal'>Medium</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center'>
                        <FormControl>
                          <RadioGroupItem value='low' />
                        </FormControl>
                        <FormLabel className='font-normal'>Low</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='assignee'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Enter assignee name (optional)'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
