import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle,
  Circle,
  Timer,
} from 'lucide-react'
import { type Department } from '@/features/departments/data/schema'
import { type Task } from './schema'

export const labels = [
  {
    value: 'bug',
    label: 'Bug',
  },
  {
    value: 'feature',
    label: 'Feature',
  },
  {
    value: 'documentation',
    label: 'Documentation',
  },
]

export const statuses = [
  // {
  //   label: 'Backlog',
  //   value: 'backlog' as const,
  //   icon: HelpCircle,
  // },
  {
    label: 'Chưa làm',
    value: 'todo' as const,
    icon: Circle,
    className: '',
  },
  {
    label: 'Đang làm',
    value: 'in_progress' as const,
    icon: Timer,
    className: 'text-amber-500',
  },
  {
    label: 'Đã xong',
    value: 'done' as const,
    icon: CheckCircle,
    className: 'text-green-500',
  },
  // {
  //   label: 'Canceled',
  //   value: 'canceled' as const,
  //   icon: CircleOff,
  // },
]

export const priorities = [
  {
    label: 'Low',
    value: 'low' as const,
    icon: ArrowDown,
  },
  {
    label: 'Medium',
    value: 'medium' as const,
    icon: ArrowRight,
  },
  {
    label: 'High',
    value: 'high' as const,
    icon: ArrowUp,
  },
  {
    label: 'Critical',
    value: 'critical' as const,
    icon: AlertCircle,
  },
]

export const departmentPalette = [
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-900 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
]

export const getDepartmentBadges = (
  taskDepartments: Task['departments'],
  allDepartments: Department[]
) => {
  const resolved = (taskDepartments ?? [])
    .map((dept) => resolveDepartment(dept, allDepartments))
    .filter((dept): dept is Department => !!dept)

  const unique = new Map(resolved.map((dept) => [dept.id, dept]))

  return Array.from(unique.values()).map((dept) => ({
    id: dept.id,
    name: dept.name,
    className:
      departmentPalette[hashString(dept.id) % departmentPalette.length],
  }))
}

const resolveDepartment = (
  dept: string | Department,
  allDepartments: Department[]
) => {
  if (typeof dept !== 'string') return dept
  return allDepartments.find(
    (item) => item.id === dept || item.code === dept || item.name === dept
  )
}

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
