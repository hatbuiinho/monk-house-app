import * as React from 'react'
import { CheckIcon } from '@radix-ui/react-icons'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import type { TaskFilter } from '@/features/tasks/data/schema'
import { useTasksStore } from '@/features/tasks/data/tasks-store'

type DataTableFacetedFilterProps = {
  columnId: keyof TaskFilter
  selectedValues: string[]
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export function DataTableFacetedFilter({
  title,
  options,
  selectedValues,
  columnId,
}: DataTableFacetedFilterProps) {
  const { setFilters } = useTasksStore()
  const uniqueSelectedValues = new Set(selectedValues)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='border-dashed'>
          <Filter className='size-4' />
          {title}
          {uniqueSelectedValues?.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal lg:hidden'
              >
                {uniqueSelectedValues.size}
              </Badge>
              <div className='hidden space-x-1 lg:flex'>
                {uniqueSelectedValues.size > 2 ? (
                  <Badge
                    variant='secondary'
                    className='rounded-sm px-1 font-normal'
                  >
                    {uniqueSelectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => uniqueSelectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant='secondary'
                        key={option.value}
                        className='rounded-sm px-1 font-normal'
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] p-0' align='start'>
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = uniqueSelectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        uniqueSelectedValues.delete(option.value)
                        const filterValues = [
                          ...selectedValues.filter((v) => v !== option.value),
                        ]
                        setFilters({ [columnId]: filterValues })
                      } else {
                        uniqueSelectedValues.add(option.value)
                        const filterValues = [...selectedValues, option.value]
                        setFilters({ [columnId]: filterValues })
                      }
                    }}
                  >
                    <div
                      className={cn(
                        'border-primary flex size-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className={cn('text-background h-4 w-4')} />
                    </div>
                    {option.icon && (
                      <option.icon className='text-muted-foreground size-4' />
                    )}
                    <span>{option.label}</span>
                    {/* {facets?.get(option.value) && (
                      <span className='ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs'>
                        {facets.get(option.value)}
                      </span>
                    )} */}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {uniqueSelectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setFilters({ [columnId]: [] })}
                    className='justify-center text-center'
                  >
                    Xóa lọc
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
