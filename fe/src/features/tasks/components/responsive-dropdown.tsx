'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type Status = {
  value: string
  label: string
}

type ResponsiveDropdownProps = {
  onChange: (status: Status) => void
  items: Status[]
  defaultValue: string
}

type ItemListProps = ResponsiveDropdownProps & { selectedItem: Status | null }

export function ResponsiveDropdown({
  items,
  defaultValue,
  onChange,
}: ResponsiveDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [selectedStatus, setSelectedStatus] = React.useState<Status | null>(
    items.find((item) => item.value === defaultValue) || null
  )

  React.useEffect(() => {
    setSelectedStatus(items.find((item) => item.value === defaultValue) || null)
  }, [defaultValue])

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant='outline' className='w-[150px] justify-start'>
            {selectedStatus ? <>{selectedStatus.label}</> : <>+ Set status</>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[200px] p-0' align='start'>
          <StatusList
            setOpen={setOpen}
            setSelectedStatus={setSelectedStatus}
            selectedItem={selectedStatus}
            {...{ items, defaultValue, onChange }}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant='outline' className='w-[150px] justify-start'>
          {selectedStatus ? <>{selectedStatus.label}</> : <>+ Set status</>}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className='mt-4 border-t'>
          <StatusList
            setOpen={setOpen}
            setSelectedStatus={setSelectedStatus}
            selectedItem={selectedStatus}
            {...{ items, defaultValue, onChange }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function StatusList({
  onChange,
  setOpen,
  setSelectedStatus,
  items,
  selectedItem,
}: ItemListProps & {
  setOpen: (open: boolean) => void
  setSelectedStatus: (status: Status | null) => void
  items: Status[]
}) {
  return (
    <Command>
      <CommandInput placeholder='Filter status...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {items.map((status) => (
            <CommandItem
              key={status.value}
              value={status.value}
              onSelect={(value) => {
                setSelectedStatus(
                  items.find((status) => status.value === value) || null
                )
                onChange(status)
                setOpen(false)
              }}
            >
              <div>{status.label}</div>
              {selectedItem?.value === status.value && (
                <Check className='ml-auto h-4 w-4' />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
