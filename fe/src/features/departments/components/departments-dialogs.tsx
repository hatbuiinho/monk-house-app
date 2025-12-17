import { useDepartmentsStore } from '../data/departments-store'
import { useDepartmentQuery } from '../hooks/use-department-query'
import { DepartmentsMutateDrawer } from './departments-mutate-drawer'

export function DepartmentsDialogs() {
  const { deleteDepartment } = useDepartmentQuery()
  const { open, setOpen, currentRow, setCurrentRow } = useDepartmentsStore()

  const handleDelete = async () => {
    if (currentRow) {
      try {
        await deleteDepartment(currentRow.id)
      } catch (error) {
        // Error handling is done in the provider
        // eslint-disable-next-line no-console
        console.error('Failed to delete department:', error)
      }
    }
  }

  return (
    <>
      <DepartmentsMutateDrawer
        key='department-create'
        open={open === 'create'}
        onOpenChange={() => setOpen(null)}
      />

      {currentRow && (
        <>
          <DepartmentsMutateDrawer
            key={`department-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <div
            key='department-delete'
            className={`fixed inset-0 z-50 ${open === 'delete' ? 'block' : 'hidden'}`}
          >
            <div className='fixed inset-0 z-50 bg-black/80' />
            <div className='bg-background fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border p-6 shadow-lg duration-200'>
              <div className='flex flex-col space-y-2 text-center sm:text-left'>
                <h2 className='text-lg font-semibold'>
                  Delete this department: {currentRow.id}?
                </h2>
                <p className='text-muted-foreground text-sm'>
                  You are about to delete a department with the ID{' '}
                  <strong>{currentRow.id}</strong>. <br />
                  This action cannot be undone.
                </p>
              </div>
              <div className='mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2'>
                <button
                  className='ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'
                  onClick={() => {
                    setOpen('delete')
                    setTimeout(() => {
                      setCurrentRow(null)
                    }, 500)
                  }}
                >
                  Cancel
                </button>
                <button
                  className='ring-offset-background focus-visible:ring-ring bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
