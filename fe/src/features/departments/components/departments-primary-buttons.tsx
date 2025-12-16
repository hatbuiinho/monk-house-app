import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDepartments } from './departments-provider'

export function DepartmentsPrimaryButtons() {
  const { setOpen } = useDepartments()

  return (
    <div className='flex items-center gap-2'>
      <Button onClick={() => setOpen('create')} className='h-8 gap-1' size='sm'>
        <Plus className='h-3.5 w-3.5' />
        <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
          Add Department
        </span>
      </Button>
    </div>
  )
}
