import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TaskDetailDialog } from '@/features/tasks/components/task-detail-dialog'

export const Route = createFileRoute('/_authenticated/$taskId/')({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  return (
    <TaskDetailDialog
      open={open}
      taskId={taskId}
      onOpenChange={() => {
        navigate({ to: '/' })
        setOpen(false)
      }}
    />
  )
}
