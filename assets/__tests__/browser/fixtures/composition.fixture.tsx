import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button,
  Text,
  Input,
  Select,
  Checkbox,
  Switcher,
  Radio,
  Card,
  Tile,
  Modal,
  Tabs,
  Separator,
  Slider,
  Pagination,
  Accordion,
  Popover,
  Markdown,
  Navigation,
  Panel,
  Date as DatePicker,
  Rating,
  Carousel,
} from '../../../../index'
Object.assign(globalThis, { React })
Object.assign(document.body.style, {
  margin: '0',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
  fontFamily: 'var(--uf-font-family-base)',
})
const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]
function Fixture() {
  const [checked, setChecked] = useState(false)
  const [navAction, setNavAction] = useState(0)
  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <Text variant="h1" membrane={false} inset="none">
        Face UI quality fixture
      </Text>
      {[true, false].map((membrane) => (
        <section key={String(membrane)} data-fixture={`geometry-${membrane}`}>
          <Text variant="h2" inset="none" membrane={false}>
            Membrane {String(membrane)}
          </Text>
          <div
            style={{ display: 'flex', alignItems: 'start', flexWrap: 'wrap' }}
          >
            <Button membrane={membrane}>Button</Button>
            <Text membrane={membrane}>Text</Text>
            <Checkbox label="Checkbox" membrane={membrane} />
            <Radio
              aria-label="Options"
              items={options}
              orientation="horizontal"
              membrane={membrane}
            />
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}
          >
            <Input membrane={membrane} label="Input" />
            <Select
              aria-label="Choose option"
              membrane={membrane}
              items={options}
            />
            <Switcher membrane={membrane} label="Switcher" />
            <Button fullWidth membrane={membrane}>Full width</Button>
          </div>
        </section>
      ))}
      <section data-fixture="variants">
        <Text variant="h2" inset="none">
          Variants and focus
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {[
            'default',
            'primary',
            'secondary',
            'accent',
            'outline',
            'ghost',
            'destructive',
          ].map((variant) => (
            <Button key={variant} variant={variant as any}>{variant}</Button>
          ))}
        </div>
      </section>
      <form data-fixture="native-form">
        <Checkbox label="Terms" name="terms" required defaultChecked />
        <Switcher label="Notifications" name="notifications" defaultChecked />
        <Input label="Owner" name="owner" defaultValue="Ada" />
        <Radio
          aria-label="Frequency"
          name="frequency"
          defaultValue="a"
          items={options}
        />
        <Select
          label="Form choice"
          name="choice"
          required
          items={options}
          defaultValue="a"
        />
        <DatePicker
          label="Form date"
          name="date"
          required
          defaultValue="2026-09-11"
        />
        <button type="reset">Reset native form</button>
      </form>
      <form data-fixture="form">
        <Checkbox
          label="Controlled checkbox"
          checked={checked}
          onCheckedChange={({ checked }) => setChecked(checked === true)}
          name="choice"
        />
        <Switcher
          label="Controlled switch"
          checked={checked}
          onCheckedChange={({ checked }) => setChecked(checked)}
          name="switch"
        />
        <button type="reset">Reset form</button>
      </form>
      <Card title="Consumer styles" data-fixture="composition">
        <input
          aria-label="Native consumer input"
          style={{ border: '3px solid rebeccapurple' }}
        />
        <Text size="xl" variant="h3">
          Nested large heading
        </Text>
        <Button>Nested button</Button>
        <Separator orientation="vertical" />
      </Card>
      <Tile
        onClick={() => {}}
        actionVisibility="hover"
        actions={<Button>Action</Button>}
      >
        Keyboard actions
      </Tile>
      <Tabs
        aria-label="Sections"
        items={[
          { value: 'a', label: 'Alpha', content: 'Alpha content' },
          { value: 'b', label: 'Beta', content: 'Beta content' },
        ]}
      />
      <section data-fixture="sliders">
        <Slider showValue label="Range" defaultValue={[20, 70]} crop />
        <Slider
          showValue
          orientation="vertical"
          label="Vertical"
          defaultValue={[40]}
          crop
        />
        <Slider label="Simple" defaultValue={[20, 70]} />
        <Slider
          label="Vertical simple"
          orientation="vertical"
          defaultValue={[20, 70]}
        />
      </section>
      <section data-fixture="disclosures">
        <Accordion
          items={[
            {
              value: 'first',
              label: 'Accordion first',
              content: 'First content',
            },
            {
              value: 'disabled',
              label: 'Accordion disabled',
              disabled: true,
              content: 'Unavailable',
            },
            { value: 'last', label: 'Accordion last', content: 'Last content' },
          ]}
        />
        <Navigation
          surface="inline"
          aria-label="Composition"
          items={[
            {
              value: 'nav-action',
              label: 'Run navigation',
              onClick: () => setNavAction((n) => n + 1),
            },
            {
              value: 'nav-disabled',
              label: 'Disabled navigation',
              disabled: true,
              onClick: () => setNavAction(999),
            },
            {
              value: 'nav-group',
              label: 'Navigation group',
              items: [
                {
                  value: 'nav-child',
                  label: 'Child action',
                  onClick: () => setNavAction((n) => n + 1),
                },
              ],
            },
          ]}
        />
        <Panel
          surface="inline"
          aria-label="Composition panel"
          items={[
            {
              value: 'panel-action',
              label: 'Run panel',
              onClick: () => setNavAction((n) => n + 1),
            },
          ]}
        />
        <output aria-label="Navigation actions">{navAction}</output>
        <Panel
          surface="sheet"
          aria-label="Project panel"
          items={[{ value: 'project', label: 'Project' }]}
        />
        <Navigation
          surface="sheet"
          aria-label="Project navigation"
          items={[{ value: 'project', label: 'Project' }]}
        />
      </section>
      <section data-fixture="pagination">
        <Pagination total={10000000} pageSize={10} />
      </section>
      <section data-fixture="date-rating">
        <DatePicker
          label="Deadline"
          surface="popover"
          defaultValue="2026-09-11"
        />
        <DatePicker
          label="Stay open"
          surface="popover"
          defaultValue="2026-09-11"
          closeOnSelect={false}
        />
        <DatePicker
          label="Period"
          surface="popover"
          selection="range"
          defaultValue={{ start: '2026-09-11', end: null }}
          closeOnSelect
        />
        <Rating label="Quality" allowHalf defaultValue={2.5} />
      </section>
      <Carousel ariaLabel="Multiple slides" slidesPerView={2}>
        <Button>Slide one</Button>
        <Button>Slide two</Button>
        <Button>Slide three</Button>
      </Carousel>
      <Markdown
        content={
          '# Markdown heading\n\n- [x] Complete\n\n[Link](https://example.com)'
        }
      />
      <Modal trigger="Open parent" title="Parent">
        <Input label="Inside parent" />
        <Popover
          aria-label="Parent options"
          content={<Button>Popover action</Button>}
        >
          <Button>Open popover</Button>
        </Popover>
        <Select aria-label="Nested select" items={options} />
        <Modal trigger="Open child" title="Child">
          <Button>Inside child</Button>
        </Modal>
      </Modal>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
