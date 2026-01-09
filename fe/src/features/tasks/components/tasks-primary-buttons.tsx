import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTasksStore } from '../data/tasks-store'

export function TasksPrimaryButtons() {
  const { setOpen, tasks, isLoading, error } = useTasksStore()

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
        <div className={cn({ hidden: !isLoading || !error })}>
          <p className='text-muted-foreground'>Đang tải...</p>

          {error && <p className='text-muted-foreground'>Có lỗi xảy ra</p>}
        </div>

        <p className='text-muted-foreground'>Tổng {tasks.length}</p>
      </div>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>Create</span> <Plus size={18} />
      </Button>
    </div>
  )
}
