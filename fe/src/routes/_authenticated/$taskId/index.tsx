import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TaskDetailDialog } from '@/features/tasks/components/task-detail-dialog'

export const Route = createFileRoute('/_authenticated/$taskId/')({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = useNavigate()

  return (
    <TaskDetailDialog
      taskId={taskId}
      onOpenChange={() => {
        navigate({ to: '/' })
      }}
    />
  )
}
