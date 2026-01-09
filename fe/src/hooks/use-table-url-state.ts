import { useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { type TaskFilter } from '@/features/tasks/data/schema'
import { useTasksStore } from '@/features/tasks/data/tasks-store'

export type SearchRecord = Record<string, unknown>

type Factory<T> = T | (() => T)

export type NavigateFn = (opts: {
  search:
    | true
    | SearchRecord
    | ((prev: SearchRecord) => Partial<SearchRecord> | SearchRecord)
  replace?: boolean
}) => void

type UseTableUrlStateParams = {
  search: SearchRecord
  navigate: NavigateFn
  pagination?: {
    pageKey?: string
    pageSizeKey?: string
    defaultPage?: number
    defaultPageSize?: number
  }
  columnFilters?: Array<
    | {
        columnId: keyof TaskFilter
        searchKey: string
        type?: 'string'
        // Optional transformers for custom types
        serialize?: (value: unknown) => unknown
        deserialize?: (value: unknown) => unknown
      }
    | {
        columnId: keyof TaskFilter
        searchKey: string
        type: 'array'
        serialize?: (value: unknown) => unknown
        deserialize?: (value: unknown) => unknown
      }
    | {
        columnId: keyof TaskFilter
        searchKey: string
        type: 'date'
        serialize?: (value: unknown) => unknown
        deserialize?: (value: unknown) => unknown
      }
    | {
        columnId: keyof TaskFilter
        searchKey: string
        type: 'date_range'
        serialize?: (value: unknown) => unknown
        deserialize?: (value: unknown) => unknown
      }
  >
}

type UseTableUrlStateReturn = {
  // columnFilters: ColumnFiltersState
  onFiltersChange: (updater: Factory<Partial<TaskFilter>>) => void
  // Pagination
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  // Helpers
  ensurePageInRange: (
    pageCount: number,
    opts?: { resetTo?: 'first' | 'last' }
  ) => void
}

export function useTableUrlState(
  params: UseTableUrlStateParams
): UseTableUrlStateReturn {
  const {
    search,
    navigate,
    pagination: paginationCfg,
    columnFilters: columnFiltersCfg = [],
  } = params
  // console.log('search', search)
  const { setFilters } = useTasksStore()

  const pageKey = paginationCfg?.pageKey ?? ('page' as string)
  const pageSizeKey = paginationCfg?.pageSizeKey ?? ('pageSize' as string)
  const defaultPage = paginationCfg?.defaultPage ?? 1
  const defaultPageSize = paginationCfg?.defaultPageSize ?? 10

  const onFiltersChange: (updater: Factory<Partial<TaskFilter>>) => void = (
    updater
  ) => {
    const next = typeof updater === 'function' ? updater() : updater

    const patch: Record<string, unknown> = {}

    for (const cfg of columnFiltersCfg) {
      const found = next[cfg.columnId]
      const serialize = cfg.serialize ?? ((v: unknown) => v)
      if (cfg.type === 'string') {
        const value = typeof found === 'string' ? (found as string) : ''
        patch[cfg.searchKey] =
          value.trim() !== '' ? serialize(value) : undefined
      } else if (cfg.type === 'date') {
        const rawValue = found
        const value =
          typeof rawValue === 'object'
            ? format(rawValue as Date, 'y-MM-dd')
            : undefined
        patch[cfg.searchKey] = value
      } else {
        const value = Array.isArray(found) ? (found as unknown[]) : []
        patch[cfg.searchKey] = value.length > 0 ? serialize(value) : undefined
      }
    }
    navigate({
      search: (prev) => ({
        ...(prev as SearchRecord),
        [pageKey]: undefined,
        ...patch,
      }),
    })
  }

  // Build initial column filters from the current search params
  useEffect(() => {
    let convertedSearch = {} as TaskFilter
    for (const cfg of columnFiltersCfg) {
      const raw = (search as SearchRecord)[cfg.searchKey]
      const deserialize = cfg.deserialize ?? ((v: unknown) => v)
      if (cfg.type === 'string') {
        const value = (deserialize(raw) as string) ?? ''
        if (typeof value === 'string' && value.trim() !== '') {
          convertedSearch = { ...convertedSearch, [cfg.columnId]: value }
        }
      } else if (cfg.type === 'date') {
        const value = raw ? (new Date(raw as string) as Date) : undefined
        if (value) {
          convertedSearch = { ...convertedSearch, [cfg.columnId]: value }
        }
      } else {
        // default to array type
        const value = (deserialize(raw) as unknown[]) ?? []
        if (Array.isArray(value) && value.length > 0) {
          convertedSearch = { ...convertedSearch, [cfg.columnId]: value }
        }
      }
    }
    setTimeout(() => {
      setFilters({ ...convertedSearch })
    }, 0)
  }, []) //TODO: recheck

  // const [columnFilters, setColumnFilters] =
  //   useState<ColumnFiltersState>(initialColumnFilters)

  const pagination: PaginationState = useMemo(() => {
    const rawPage = (search as SearchRecord)[pageKey]
    const rawPageSize = (search as SearchRecord)[pageSizeKey]
    const pageNum = typeof rawPage === 'number' ? rawPage : defaultPage
    const pageSizeNum =
      typeof rawPageSize === 'number' ? rawPageSize : defaultPageSize
    return { pageIndex: Math.max(0, pageNum - 1), pageSize: pageSizeNum }
  }, [search, pageKey, pageSizeKey, defaultPage, defaultPageSize])

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater
    const nextPage = next.pageIndex + 1
    const nextPageSize = next.pageSize
    navigate({
      search: (prev) => ({
        ...(prev as SearchRecord),
        [pageKey]: nextPage <= defaultPage ? undefined : nextPage,
        [pageSizeKey]:
          nextPageSize === defaultPageSize ? undefined : nextPageSize,
      }),
    })
  }

  const ensurePageInRange = (
    pageCount: number,
    opts: { resetTo?: 'first' | 'last' } = { resetTo: 'first' }
  ) => {
    const currentPage = (search as SearchRecord)[pageKey]
    const pageNum = typeof currentPage === 'number' ? currentPage : defaultPage
    if (pageCount > 0 && pageNum > pageCount) {
      navigate({
        replace: true,
        search: (prev) => ({
          ...(prev as SearchRecord),
          [pageKey]: opts.resetTo === 'last' ? pageCount : undefined,
        }),
      })
    }
  }

  return {
    onFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  }
}
