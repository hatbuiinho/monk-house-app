import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { TasksCardGrid } from './components/tasks-card-grid'
import { TasksDialogs } from './components/tasks-dialogs'
import { TasksPrimaryButtons } from './components/tasks-primary-buttons'
import { useTasksStore } from './data/tasks-store'

function TasksContent() {
  const { isLoading, tasks, error } = useTasksStore()

  if (isLoading) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Tasks</h2>
            <p className='text-muted-foreground'>Loading tasks...</p>
          </div>
          <TasksPrimaryButtons />
        </div>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-muted-foreground'>Loading...</div>
        </div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Tasks</h2>
            <p className='text-muted-foreground'>Error loading tasks</p>
          </div>
          <TasksPrimaryButtons />
        </div>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-destructive'>Error: {error.message}</div>
        </div>
      </Main>
    )
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Tasks</h2>
        </div>
        <TasksPrimaryButtons />
      </div>
      <TasksCardGrid data={tasks || []} />
    </Main>
  )
}

export function Tasks() {
  return (
    <>
      <Header fixed>
        {/* <Search /> */}
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <TasksContent />

      <TasksDialogs />
    </>
  )
}
