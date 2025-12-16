import { DepartmentsPage } from '@/features/departments'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/departments/')({
  component: DepartmentsPage,
})
