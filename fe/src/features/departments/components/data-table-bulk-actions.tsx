import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDepartments } from './departments-provider'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { deleteDepartments } = useDepartments()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return

    setIsLoading(true)
    try {
      const selectedIds = selectedRows.map((row) => row.id)
      await deleteDepartments(selectedIds)
      setIsDeleteDialogOpen(false)
      table.resetRowSelection()
    } catch (error) {
      // Error handling is done in the provider
      // eslint-disable-next-line no-console
      console.error('Failed to delete departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className='fixed right-4 bottom-4 left-4 z-50'>
      <div className='bg-background flex items-center gap-2 rounded-md border p-2 shadow-lg'>
        <div className='flex-1 text-sm'>{selectedCount} row(s) selected</div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => table.resetRowSelection()}
        >
          Cancel
        </Button>
        <Button
          variant='destructive'
          size='sm'
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </Button>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {selectedCount} departments?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected departments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isLoading}
              className='bg-destructive hover:bg-destructive/90'
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
