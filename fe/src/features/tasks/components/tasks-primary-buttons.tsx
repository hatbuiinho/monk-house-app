import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTasksStore } from '../data/tasks-store'

export function TasksPrimaryButtons() {
  const { setOpen, tasks } = useTasksStore()
  return (
    <div className='flex w-full items-center justify-between gap-2'>
      {/* <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('import')}
      >
        <span>Import</span> <Download size={18} />
      </Button> */}
      <div>
        <p className='text-muted-foreground'>Total ({tasks.length} tasks)</p>
      </div>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>Create</span> <Plus size={18} />
      </Button>
    </div>
  )
}
