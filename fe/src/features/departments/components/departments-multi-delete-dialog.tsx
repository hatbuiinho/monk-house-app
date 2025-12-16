import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDepartments } from './departments-provider'

export function DepartmentsMultiDeleteDialog() {
  const { deleteDepartments } = useDepartments()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedIds, _setSelectedIds] = useState<string[]>([])

  const handleDelete = async () => {
    if (selectedIds.length === 0) return

    setIsLoading(true)
    try {
      await deleteDepartments(selectedIds)
      setOpen(false)
    } catch (error) {
      // Error handling is done in the provider
      // eslint-disable-next-line no-console
      console.error('Failed to delete departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 gap-1'
          onClick={() => {
            // Get selected row IDs from table
            // This would be set by the parent component
          }}
        >
          Delete Selected
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Delete Departments</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedIds.length} departments?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline' disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant='destructive'
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
