import { createRoot } from 'react-dom/client'
import { Button } from '../../../../Button/Button'
import { Checkbox } from '../../../../Checkbox/Checkbox'
import { Input } from '../../../../Input/Input'
import { Menu } from '../../../../Menu/Menu'
import { SegmentedControl } from '../../../../SegmentedControl/SegmentedControl'
import { Select } from '../../../../Select/Select'
import { Switcher } from '../../../../Switcher/Switcher'
import { Tile } from '../../../../Tile/Tile'

createRoot(document.getElementById('root')!).render(
  <section
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'start',
      gap: 8,
      padding: 20,
      width: 320,
    }}
  >
    <Button id="before">Before</Button>
    <Input id="field" aria-label="Field" defaultValue="Draft" clearable={false} />
    <Button id="action">Action</Button>
    <Select
      id="choice"
      aria-label="Choice"
      surface="popover"
      defaultValue="alpha"
      items={[
        { value: 'alpha', label: 'Alpha' },
        { value: 'beta', label: 'Beta' },
      ]}
    />
    <Checkbox id="check" label="Check" />
    <Switcher id="switch" label="Switch" />
    <SegmentedControl
      aria-label="Layout"
      defaultValue="row"
      items={[
        { value: 'row', label: 'Row' },
        { value: 'column', label: 'Column' },
      ]}
    />
    <Tile id="tile" onClick={() => {}}>Tile</Tile>
    <Input id="multiline" aria-label="Notes" defaultValue="Draft" multiline clearable={false} />
    <Menu
      surface="popover"
      items={[
        { value: 'alpha', label: 'Menu Alpha' },
        { value: 'beta', label: 'Menu Beta' },
      ]}
    >
      <Button id="menu-trigger">Actions</Button>
    </Menu>
    <Button id="after">After</Button>
    <iframe
      id="preview-frame"
      title="Unowned preview"
      srcDoc={'<!doctype html><button tabindex="0">Preview action</button>'}
    />
    <Button id="after-preview">After preview</Button>
  </section>,
)
