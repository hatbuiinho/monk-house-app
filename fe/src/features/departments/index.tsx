import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { DepartmentCardGrid } from './components'
import { DepartmentsDialogs } from './components/departments-dialogs'
import { DepartmentsPrimaryButtons } from './components/departments-primary-buttons'

export function DepartmentsPage() {
  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <div className='flex flex-1 flex-col gap-4 p-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Departments</h1>
          <DepartmentsPrimaryButtons />
        </div>
        <DepartmentCardGrid />
        <DepartmentsDialogs />
      </div>
    </>
  )
}
