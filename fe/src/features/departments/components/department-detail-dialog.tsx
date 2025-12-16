import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Department } from '../data/schema'

type DepartmentDetailDialogProps = {
  department: Department | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DepartmentDetailDialog({
  department,
  open,
  onOpenChange,
}: DepartmentDetailDialogProps) {
  if (!department) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col sm:max-w-[500px]'>
        <DialogHeader className='text-start'>
          <DialogTitle>Department Details</DialogTitle>
          <DialogDescription>
            View detailed information about this department
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-muted-foreground text-sm'>ID</p>
              <p className='font-medium'>{department.id}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Code</p>
              <p className='font-medium'>{department.code}</p>
            </div>
          </div>

          <div>
            <p className='text-muted-foreground text-sm'>Name</p>
            <p className='font-medium'>{department.name}</p>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-muted-foreground text-sm'>Created</p>
              <p className='font-medium'>{department.created}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Updated</p>
              <p className='font-medium'>{department.updated}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
