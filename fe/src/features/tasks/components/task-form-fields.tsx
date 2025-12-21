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
import { SelectDropdown } from '@/components/select-dropdown'
import { useDepartmentsStore } from '@/features/departments/data/departments-store'
import { useDepartmentQuery } from '@/features/departments/hooks/use-department-query'
import { statuses } from '../data/data'
import type { TaskForm } from '../data/schema'

interface FormFieldsProps {
  control: Control<TaskForm>
  isUpdate: boolean
}

// Common form fields component - moved outside to prevent recreation on each render
const TaskFormFields = ({ control, isUpdate }: FormFieldsProps) => {
  useDepartmentQuery()
  const { departments, isLoading } = useDepartmentsStore()
  return (
    <>
      <FormField
        control={control}
        name='title'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder='Enter a title' />
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
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                {...field}
                placeholder='Enter a description (optional)'
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
              <FormLabel>Status</FormLabel>
              <SelectDropdown
                defaultValue={field.value}
                onValueChange={field.onChange}
                placeholder='Select status'
                items={statuses}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {/* <FormField
        control={control}
        name='assignees'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assignee</FormLabel>
            <FormControl>
              <MultiSelect
                options={users.map((user) => ({
                  label: `${user.name} ${user.username}`,
                  value: user.id,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={
                  isLoading ? 'Loading users...' : 'Select assignees'
                }
                disabled={isLoading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      /> */}
      <FormField
        control={control}
        name='departments'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Departments</FormLabel>
            <FormControl>
              <MultiSelect
                options={departments.map((department) => ({
                  label: `${department.name} ${department.code}`,
                  value: department.id,
                }))}
                value={
                  Array.isArray(field.value)
                    ? field.value.map((dept) =>
                        typeof dept === 'string' ? dept : dept.id
                      )
                    : []
                }
                onValueChange={field.onChange}
                placeholder={
                  isLoading ? 'Loading departments...' : 'Select departments'
                }
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
            <FormLabel>Due Date</FormLabel>
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
