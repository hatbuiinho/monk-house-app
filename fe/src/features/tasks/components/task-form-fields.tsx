import { type Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentsStore } from '@/features/departments/data/departments-store'
import { useDepartmentQuery } from '@/features/departments/hooks/use-department-query'
import { useUsersStore } from '@/features/users/data/users-store'
import { useUserQuery } from '@/features/users/hooks/useUserQuery'
import type { TaskForm } from '../data/schema'
import TaskStatusSwitch from './task-status-switch'

interface FormFieldsProps {
  control: Control<TaskForm>
  isUpdate: boolean
}

// Common form fields component - moved outside to prevent recreation on each render
const TaskFormFields = ({ control, isUpdate }: FormFieldsProps) => {
  useDepartmentQuery()
  useUserQuery()
  const { departments, isLoading } = useDepartmentsStore()
  const { users } = useUsersStore()
  return (
    <>
      <FormField
        control={control}
        name='title'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tiêu đề</FormLabel>
            <FormControl>
              <Input {...field} placeholder='Hãy nhập tiêu đề' />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name='description'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nội dung</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                {...field}
                placeholder='Hãy nhập nội dung công việc'
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {isUpdate && (
        <FormField
          control={control}
          name='status'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trạng thái</FormLabel>
              <FormControl>
                <TaskStatusSwitch
                  key={field.value}
                  value={field.value}
                  onSelect={(value) => {
                    field.onChange(value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name='departments'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ban</FormLabel>
            <FormControl>
              <MultiSelect
                options={departments.map((department) => ({
                  label: `${department.name} ${department.code}`,
                  value: department.id,
                }))}
                defaultValue={
                  Array.isArray(field.value)
                    ? field.value.map((dept) =>
                        typeof dept === 'string' ? dept : dept.id
                      )
                    : []
                }
                onValueChange={field.onChange}
                placeholder={isLoading ? 'Đang tải...' : 'Chọn ban'}
                disabled={isLoading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name='assignees'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phân công</FormLabel>
            <FormControl>
              <MultiSelect
                options={users.map((user) => ({
                  label: `${user.name} ${user.username}`,
                  value: user.id,
                }))}
                defaultValue={field.value as string[]}
                onValueChange={field.onChange}
                placeholder={isLoading ? 'Đang tải' : 'Chọn nhân sự'}
                disabled={isLoading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name='due_date'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hạn cuối</FormLabel>
            <FormControl>
              <Input {...field} type='datetime-local' />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export default TaskFormFields
