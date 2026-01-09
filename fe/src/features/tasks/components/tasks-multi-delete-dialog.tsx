import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { tasksAPI } from '../api/tasks-api'
import { useTasksStore } from '../data/tasks-store'

type TaskMultiDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONFIRM_WORD = 'DELETE'

export function TasksMultiDeleteDialog({
  open,
  onOpenChange,
}: TaskMultiDeleteDialogProps) {
  const [value, setValue] = useState('')
  const { selectedTasks, clearSelection } = useTasksStore()

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`Please type "${CONFIRM_WORD}" to confirm.`)
      return
    }

    onOpenChange(false)

    try {
      toast.promise(tasksAPI.deleteTasks(selectedTasks), {
        loading: 'Deleting tasks...',
        success: () => {
          clearSelection()
          return `Deleted ${selectedTasks.length} ${
            selectedTasks.length > 1 ? 'tasks' : 'task'
          }`
        },
        error: () => 'Failed to delete tasks',
      })
    } catch (_error) {
      toast.error('Failed to delete tasks')
    } finally {
      setValue('')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='stroke-destructive me-1 inline-block'
            size={18}
          />{' '}
          Delete {selectedTasks.length}{' '}
          {selectedTasks.length > 1 ? 'tasks' : 'task'}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Are you sure you want to delete the selected tasks? <br />
            This action cannot be undone.
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>Confirm by typing "{CONFIRM_WORD}":</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Type "${CONFIRM_WORD}" to confirm.`}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation can not be rolled back.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Delete'
      destructive
    />
  )
}
