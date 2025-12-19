import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TasksCardGrid } from './components/tasks-card-grid'
import { TasksDialogs } from './components/tasks-dialogs'
import { TasksPrimaryButtons } from './components/tasks-primary-buttons'
import { useTasksStore } from './data/tasks-store'

// import { useTasksStore } from './data/tasks-store'

function TasksContent() {
  const { isLoading, tasks, error } = useTasksStore()
  // const {} = useTaskQuery()
  // const {
  //   data: tasks,
  //   isLoading,
  //   error,
  //   // refetch,
  // } = useQuery({
  //   queryKey: ['tasks', filters],
  //   queryFn: () => tasksAPI.getTasks(filters).then((res) => res.items),
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  //   gcTime: 10 * 60 * 1000, // 10 minutes
  // })
  // const [tasks, setTasks] = useState<Task[]>([])
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState<Error | null>(null)

  // useEffect(() => {
  //   async function fetchTasks() {
  //     try {
  //       const res = await tasksAPI.getTasks(filters)
  //       setTasks(res.items)
  //     } catch (error) {
  //       setError(error as Error)
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }
  //   fetchTasks()
  // }, [filters])

  console.log('rerender task content')

  // const { tasks, isLoading, error } = useTaskQuery() //TODO: add task stats

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
          <p className='text-muted-foreground'>
            Here's a list of your tasks for this month! ({tasks.length} tasks)
          </p>
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
        <Search />
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
