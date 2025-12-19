import { useEffect, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { Loader2, Search } from 'lucide-react'
import { cn, getPageNumbers } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartmentsStore } from '../data/departments-store'
import { type Department } from '../data/schema'
import { useDepartmentQuery } from '../hooks/use-department-query'

// Inline debounce function to avoid import issues
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

type DepartmentCardGridProps = {
  onDepartmentClick?: (department: Department) => void
}

export function DepartmentCardGrid({
  onDepartmentClick,
}: DepartmentCardGridProps) {
  useDepartmentQuery()
  const {
    departments: initialDepartments,
    error,
    isLoading,
    setFilters,
    searchTerm,
    setSearchTerm,

    setPerPage,
    perPage,
    setCurrentPage,
    currentPage,
  } = useDepartmentsStore()
  // const [page, setPage] = useState(1)
  // const [pageSize, setPageSize] = useState(10)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    setFilters({
      page: currentPage,
      perPage,
      name: debouncedSearchTerm,
      code: debouncedSearchTerm,
    })
  }, [debouncedSearchTerm, currentPage, perPage])

  // Use useQuery for data fetching with proper caching and state management

  // const {
  //   data: searchResults,
  //   isLoading,
  //   isError,
  //   error,
  //   refetch,
  // } = useQuery<{
  //   items: Department[]
  //   totalItems: number
  //   totalPages: number
  // }>({
  //   queryKey: ['departments', 'search', debouncedSearchTerm, page, pageSize],
  //   queryFn: async () => {
  //     if (!debouncedSearchTerm.trim()) {
  //       // For initial load or when search is cleared, get paginated departments
  //       const result = await departmentsAPI.getDepartments({
  //         page: page,
  //         perPage: pageSize,
  //       })
  //       return result
  //     }

  //     // Search using PocketBase API
  //     const result = await departmentsAPI.getDepartments({
  //       page: page,
  //       perPage: pageSize,
  //       name: debouncedSearchTerm,
  //       code: debouncedSearchTerm,
  //     })
  //     return result
  //   },
  //   enabled: false, // We'll manually trigger refetch
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  // })

  // Display data - use search results if available, otherwise use initial departments
  const displayData = initialDepartments || []
  const totalItems = initialDepartments?.length || 0
  const totalPages = Math.ceil(totalItems / perPage) || 1

  // Auto-refetch when debounced search term, page, or pageSize changes

  const goToPage = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)))
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      {/* Search Bar */}
      <div className='flex flex-col gap-2'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Search by name or code...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
            }}
            className='pl-10'
          />
        </div>
        {!!error && (
          <div className='text-sm text-red-500'>
            {error instanceof Error
              ? error.message
              : 'Failed to search departments. Please try again.'}
          </div>
        )}
        {searchTerm.trim() && isLoading && (
          <div className='text-muted-foreground text-sm'>
            <Loader2 className='mr-2 inline h-3 w-3 animate-spin' />
            Searching departments...
          </div>
        )}
      </div>

      <div>
        {/* Card Grid Layout */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {isLoading && !displayData.length ? (
            <div className='text-muted-foreground col-span-full flex h-32 items-center justify-center'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Loading departments...
            </div>
          ) : displayData?.length ? (
            displayData.map((department) => (
              <Card
                key={department.id}
                onClick={() => onDepartmentClick?.(department)}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md'
                )}
              >
                <CardHeader className=''>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='line-clamp-2 text-base leading-tight'>
                      {department.name}
                    </CardTitle>
                    {/* Icon placeholder - replace with actual icon component */}
                    <div className='text-muted-foreground'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='24'
                        height='24'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                        <circle cx='9' cy='7' r='4' />
                        <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
                        <path d='M16 3.13a4 4 0 0 1 0 7.75' />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='space-y-3 pt-0'>
                  <div className='flex flex-wrap gap-2'>
                    <div className='flex items-center gap-1 text-sm'>
                      <span className='text-muted-foreground'>Code:</span>
                      <span>{department.code}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className='text-muted-foreground col-span-full flex h-32 items-center justify-center'>
              {searchTerm.trim()
                ? 'No results found.'
                : 'No departments available.'}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className='mt-auto flex items-center justify-between overflow-clip px-2'>
          <div className='flex w-full items-center justify-between'>
            <div className='flex w-[100px] items-center justify-center text-sm font-medium'>
              Page {currentPage} of {totalPages}
            </div>
            <div className='flex items-center gap-2'>
              <Select
                value={`${perPage}`}
                onValueChange={(value) => {
                  setPerPage(Number(value))
                  setCurrentPage(1)
                  // setPage(1) // Reset to first page when changing page size
                }}
              >
                <SelectTrigger className='h-8 w-[70px]'>
                  <SelectValue placeholder={perPage} />
                </SelectTrigger>
                <SelectContent side='top'>
                  {[20, 30, 40, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='hidden text-sm font-medium sm:block'>
                Rows per page
              </p>
            </div>
          </div>

          <div className='flex items-center sm:space-x-6 lg:space-x-8'>
            <div className='flex hidden w-[100px] items-center justify-center text-sm font-medium sm:flex'>
              Page {currentPage} of {totalPages}
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                className='size-8 p-0'
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <span className='sr-only'>Go to first page</span>
                <DoubleArrowLeftIcon className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='size-8 p-0'
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className='sr-only'>Go to previous page</span>
                <ChevronLeftIcon className='h-4 w-4' />
              </Button>

              {/* Page number buttons */}
              {pageNumbers.map((pageNumber, index) => (
                <div
                  key={`${pageNumber}-${index}`}
                  className='flex items-center'
                >
                  {pageNumber === '...' ? (
                    <span className='text-muted-foreground px-1 text-sm'>
                      ...
                    </span>
                  ) : (
                    <Button
                      variant={
                        currentPage === pageNumber ? 'default' : 'outline'
                      }
                      className='h-8 min-w-8 px-2'
                      onClick={() => goToPage(pageNumber as number)}
                    >
                      <span className='sr-only'>Go to page {pageNumber}</span>
                      {pageNumber}
                    </Button>
                  )}
                </div>
              ))}

              <Button
                variant='outline'
                className='size-8 p-0'
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className='sr-only'>Go to next page</span>
                <ChevronRightIcon className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='size-8 p-0'
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className='sr-only'>Go to last page</span>
                <DoubleArrowRightIcon className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
