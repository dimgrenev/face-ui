import { version } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Accordion, type AccordionProps } from '../../Accordion/Accordion'
import { Select } from '../../Select/Select'
import { Button } from '../../Button/Button'
import '../../assets/styles/index.css'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '16px',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
type Options = {
  scenario?: 'fields' | 'nested' | 'keys' | 'foreign' | 'action'
  disableFirst?: boolean
  reverse?: boolean
  cancelClick?: boolean
  cancelKey?: boolean
  reset?: boolean
}
let generation = 0
const events: unknown[] = []
Object.assign(window, {
  accordionEvents: events,
  accordionReactVersion: version,
})
const field = (name: string) => (
  <input key={name} name={name} aria-label={name} defaultValue={name} />
)
const renderAccordion = (props: AccordionProps = {}, options: Options = {}) => {
  if (options.reset) {
    generation++
    events.length = 0
  }
  const content =
    options.scenario === 'nested' ? (
      <Accordion
        headingLevel={4}
        items={[
          {
            value: 'child',
            label: 'Child section',
            content: field('Child input'),
          },
        ]}
      />
    ) : options.scenario === 'keys' ? (
      (options.reverse
        ? ['Second input', 'First input']
        : ['First input', 'Second input']
      ).map(field)
    ) : options.scenario === 'foreign' ? (
      <div data-testid="foreign">
        <Select
          label="Project"
          defaultValue="a"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
        />
        <Button>Save</Button>
      </div>
    ) : options.scenario === 'action' ? (
      <Button onClick={() => events.push('panel-action')}>Panel action</Button>
    ) : (
      field('Panel input')
    )
  flushSync(() =>
    root.render(
      <div key={generation}>
        <button id="before">Before</button>
        <form
          id="form"
          onSubmit={(event) => {
            event.preventDefault()
            events.push('submit')
          }}
        >
          <Accordion
            items={[
              {
                value: 'first',
                label: 'First section',
                content,
                disabled: options.disableFirst,
              },
              {
                value: 'disabled',
                label: 'Disabled section',
                content: 'Disabled content',
                disabled: true,
              },
              { value: 'last', label: 'Last section', content: 'Last content' },
            ]}
            onExpandedChange={(details) => events.push(details)}
            onClickCapture={(event) => {
              if (options.cancelClick) event.preventDefault()
            }}
            onKeyDownCapture={(event) => {
              if (options.cancelKey) event.preventDefault()
            }}
            {...props}
            ref={(node) => {
              ;(window as any).accordionRoot = node
            }}
          />
          <button type="reset" id="reset">
            Reset fields
          </button>
        </form>
        <button id="after">After</button>
        {options.scenario === 'foreign' && (
          <div data-testid="reference">
            <Select
              label="Reference"
              defaultValue="a"
              options={[
                { value: 'a', label: 'Alpha' },
                { value: 'b', label: 'Beta' },
              ]}
            />
            <Button>Save reference</Button>
          </div>
        )}
      </div>,
    ),
  )
}
Object.assign(window, { renderAccordion })
renderAccordion()
