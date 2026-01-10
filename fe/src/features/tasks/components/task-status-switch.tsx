import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { statuses } from '../data/data'

type TaskStatusSwitchProps = {
  onSelect: (value: string) => void
  value?: string
}
const TaskStatusSwitch = ({ onSelect, value }: TaskStatusSwitchProps) => {
  return (
    <ButtonGroup className=''>
      {statuses.map((status) => (
        <Button
          key={status.value}
          variant={status.value === value ? 'default' : 'outline'}
          onClick={() => {
            onSelect(status.value)
          }}
          size='sm'
        >
          {<status.icon className={status.className} />} {status.label}
        </Button>
      ))}
    </ButtonGroup>
  )
}

export default TaskStatusSwitch
