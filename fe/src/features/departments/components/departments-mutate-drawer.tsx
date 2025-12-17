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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type {
  Department,
  DepartmentCreate,
  DepartmentUpdate,
} from '../data/schema'
import { useDepartmentQuery } from '../hooks/use-department-query'

type DepartmentMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Department
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  //   code: z.string().min(1, 'Code is required.'),
})
type DepartmentForm = z.infer<typeof formSchema>

interface FormFieldsProps {
  control: Control<DepartmentForm>
}

// Common form fields component - moved outside to prevent recreation on each render
const FormFields = ({ control }: FormFieldsProps) => (
  <>
    <FormField
      control={control}
      name='name'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} placeholder='Enter department name' />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    {/* <FormField
      control={control}
      name='code'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Code</FormLabel>
          <FormControl>
            <Input {...field} placeholder='Enter department code' />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    /> */}
  </>
)

export function DepartmentsMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: DepartmentMutateDrawerProps) {
  const isUpdate = !!currentRow
  const isMobile = useIsMobile()
  const { createDepartment, updateDepartment, isLoading } = useDepartmentQuery()

  const form = useForm<DepartmentForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      name: '',
    },
  })

  const onSubmit = async (data: DepartmentForm) => {
    const code = data.name
      .normalize('NFD') // tách dấu ra khỏi chữ
      .replace(/[\u0300-\u036f]/g, '') // xóa dấu
      .replace(/\s+/g, '-') // đổi khoảng trắng thành _
      .toLowerCase()
    try {
      if (isUpdate && currentRow) {
        // Prepare update data
        const updateData: DepartmentUpdate = {
          name: data.name,
          code,
        }
        await updateDepartment(currentRow.id, updateData)
      } else {
        // Prepare create data
        const createData: DepartmentCreate = {
          name: data.name,
          code,
        }
        await createDepartment(createData)
      }

      // Reset form and close dialog on success
      form.reset()
      onOpenChange(false)
    } catch (error) {
      //TODO: Error handling is done in the provider
      // eslint-disable-next-line no-console
      console.error('Failed to submit department:', error)
    }
  }

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v)
    if (!v) {
      form.reset()
    }
  }

  const title = `${isUpdate ? 'Update' : 'Create'} Department`
  const description = isUpdate
    ? 'Update the department by providing necessary info.'
    : 'Add a new department by providing necessary info.'
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
              id='departments-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='flex-1 space-y-6 overflow-y-auto p-2'
            >
              <FormFields control={form.control} />
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
              form='departments-form'
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
            id='departments-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormFields control={form.control} />
          </form>
        </Form>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline' disabled={isLoading}>
              Close
            </Button>
          </DialogClose>
          <Button form='departments-form' type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
