import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TaskDetailDialog } from '@/features/tasks/components/task-detail-dialog'

export const Route = createFileRoute('/_authenticated/$taskId/')({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()

  return (
    <TaskDetailDialog
      taskId={taskId}
      open={open}
      onOpenChange={() => {
        setOpen(false)
        navigate({ to: '/' })
      }}
    />
  )
}
