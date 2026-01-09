import { useState } from 'react'
import { Download, Filter, Plus } from 'lucide-react'
import { pb } from '@/lib/pocketbase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buildTasksFilter } from '../api/tasks-api'
import { useTasksStore } from '../data/tasks-store'

export function TasksPrimaryButtons() {
  const { setOpen, tasks, isLoading, error, filters } = useTasksStore()

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (exportAll: boolean) => {
    if (isExporting) return
    setIsExporting(true)

    try {
      const query = exportAll ? '' : buildTasksFilter(filters)
      const url = new URL(
        '/api/export/tasks',
        import.meta.env.VITE_POCKETBASE_URL
      )
      if (exportAll) {
        url.searchParams.set('exportAll', 'true')
      } else {
        url.searchParams.set('filter', query)
        if (filters.currentPage) {
          url.searchParams.set('page', String(filters.currentPage))
        }
        if (filters.perPage) {
          url.searchParams.set('perPage', String(filters.perPage))
        }
        if (filters.sort) {
          url.searchParams.set('sort', String(filters.sort))
        }
      }

      const headers: HeadersInit = {}
      if (pb.authStore.token) {
        headers.Authorization = pb.authStore.token
      }

      const response = await fetch(url.toString(), { headers })
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const filename = getFilenameFromDisposition(
        response.headers.get('content-disposition')
      )
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename || 'tasks.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className='flex w-full items-center justify-between gap-2'>
      <div>
        <div className={cn({ hidden: !isLoading || !error })}>
          <p className='text-muted-foreground'>Đang tải...</p>

          {error && <p className='text-muted-foreground'>Có lỗi xảy ra</p>}
        </div>

        <p className='text-muted-foreground'>Tổng {tasks.length}</p>
      </div>
      <div className='flex items-center gap-2'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='space-x-1'
              disabled={isExporting}
            >
              <span>Xuất excel</span> <Download size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => handleExport(false)}>
              <Filter size={16} /> Theo bộ lọc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(true)}>
              <Download size={16} /> Tất cả
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button className='space-x-1' onClick={() => setOpen('create')}>
          <span>Tạo</span> <Plus size={18} />
        </Button>
      </div>
    </div>
  )
}

function getFilenameFromDisposition(value: string | null) {
  if (!value) return ''
  const match = /filename="([^"]+)"/.exec(value)
  return match?.[1] || ''
}
