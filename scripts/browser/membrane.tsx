import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button,
  Tile,
  Text,
  Input,
  Checkbox,
  Switcher,
  Radio,
  SegmentedControl,
  Tabs,
  Select,
  Date as DateControl,
  Breadcrumb,
  Separator,
  Media,
  Markdown,
  Table,
} from '../../index'
import '../../assets/styles/index.css'
import { Membrane } from '../../assets/adapters/react/Membrane'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>Count {count}</button>
}
const events: string[] = []
const cases = {
  FullWidth: (membrane: boolean) => (
    <Membrane enabled={membrane} fullWidth interactive>
      <Button membrane={false} text="Save" />
    </Membrane>
  ),
  ComposedButton: (membrane: boolean) => (
    <Membrane enabled={membrane} interactive>
      <Button
        membrane={false}
        text="Save"
        onClick={() => events.push('save')}
      />
    </Membrane>
  ),
  Button: (membrane: boolean) => (
    <Button
      membrane={membrane}
      text="Save"
      onClick={() => events.push('save')}
    />
  ),
  Tile: (membrane: boolean) => (
    <Tile
      membrane={membrane}
      text="Project"
      onClick={() => events.push('project')}
    />
  ),
  Text: (membrane: boolean) => (
    <Text membrane={membrane} tabIndex={0}>
      Content
    </Text>
  ),
  Input: (membrane: boolean) => (
    <Input membrane={membrane} label="Name" defaultValue="Draft" />
  ),
  Checkbox: (membrane: boolean) => (
    <Checkbox membrane={membrane} label="Agree" />
  ),
  Switcher: (membrane: boolean) => (
    <Switcher membrane={membrane} label="Enabled" />
  ),
  Radio: (membrane: boolean) => (
    <Radio
      membrane={membrane}
      aria-label="Plan"
      options={[{ value: 'a', label: 'A' }]}
    />
  ),
  SegmentedControl: (membrane: boolean) => (
    <SegmentedControl
      membrane={membrane}
      aria-label="View"
      items={[{ value: 'a', label: 'A' }]}
    />
  ),
  Tabs: (membrane: boolean) => (
    <Tabs membrane={membrane} items={[{ value: 'a', label: 'A', content: null }]} />
  ),
  Select: (membrane: boolean) => (
    <Select
      membrane={membrane}
      label="Plan"
      options={[{ value: 'a', label: 'A' }]}
    />
  ),
  Date: (membrane: boolean) => <DateControl membrane={membrane} />,
  Breadcrumb: (membrane: boolean) => (
    <Breadcrumb
      membrane={membrane}
      items={[{ label: 'Home', href: '#home' }]}
    />
  ),
  Separator: (membrane: boolean) => (
    <Separator decorative={false} membrane={membrane} />
  ),
  Media: (membrane: boolean) => (
    <Media
      membrane={membrane}
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3C/svg%3E"
      width={80}
      height={80}
      tabIndex={0}
    />
  ),
  Markdown: (membrane: boolean) => (
    <Markdown membrane={membrane} content="[Help](#help)" />
  ),
  Table: (membrane: boolean) => (
    <Table
      membrane={membrane}
      columns={[
        { id: 'name', header: 'Name', accessor: 'name', sortable: true },
      ]}
      rows={[{ id: 'a', name: 'Ada' }]}
    />
  ),
  Children: (membrane: boolean) => (
    <Tile membrane={membrane} interactive={false}>
      <Counter />
    </Tile>
  ),
}
const root = createRoot(document.getElementById('root')!)
Object.assign(window, {
  membraneEvents: events,
  renderMembrane(name: keyof typeof cases, membrane: boolean) {
    root.render(
      <StrictMode>
        <section
          style={{ width: 400, padding: 20 }}
          data-membrane-value={String(membrane)}
          data-membrane-component={name}
        >
          {cases[name](membrane)}
        </section>
      </StrictMode>,
    )
  },
})
