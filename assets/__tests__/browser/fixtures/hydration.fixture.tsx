import { hydrateRoot } from 'react-dom/client'
import {
  Avatar,
  Input,
  Radio,
  Button,
  Checkbox,
  Switcher,
  Select,
  Tooltip,
  Popover,
  Modal,
} from '../../../../index'
export function HydrationFixture() {
  return (
    <div>
      <h1>Server rendered controls</h1>
      <Avatar name="𠮷田 太郎" />
      <Avatar name="áda Lovelace" />
      <Avatar name="👩🏽‍💻 Ada" />
      <Avatar name="🇷🇺 Иван" />
      <Avatar name="क्षमा शर्मा" />
      <Input label="Server name" defaultValue="Анна" description="Public name" required />
      <Input label="Server notes" multiline rows={3} defaultValue={"First line\nSecond line"} />
      <Radio aria-label="Server choice" name="server-choice" required defaultValue="" items={[{value:'',label:'Standard'},{value:'pro',label:'Professional'}]} />
      <Button>Save</Button>
      <Checkbox label="Terms" defaultChecked />
      <Checkbox label="Partial selection" checked="indeterminate" />
      <Switcher label="Notifications" defaultChecked />
      <Select
        label="Plan"
        options={[{ value: 'a', label: 'Standard' }]}
        defaultValue="a"
      />
      <Tooltip content="Help">
        <Button>Help trigger</Button>
      </Tooltip>
      <Popover content="Details" aria-label="Details">
        <Button>Details trigger</Button>
      </Popover>
      <Modal title="Dialog" trigger="Open dialog">
        Dialog content
      </Modal>
    </div>
  )
}
// serve.mjs server-renders HydrationFixture into /<react>/hydration; the
// browser then hydrates that markup.
if (typeof document !== 'undefined')
  hydrateRoot(document.getElementById('root')!, <HydrationFixture />)
