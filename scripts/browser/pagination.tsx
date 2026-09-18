import { version } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Pagination, type PaginationProps } from '../../Pagination/Pagination'
import { Button } from '../../Button/Button'
import '../../assets/styles/index.css'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '16px',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: unknown[] = []
let generation = 0
type Options = {
  reset?: boolean
  cancelClick?: boolean
  cancelKey?: boolean
  accept?: boolean
}
const renderPagination = (
  props: PaginationProps = {},
  options: Options = {},
) => {
  if (options.reset) {
    generation++
    events.length = 0
  }
  flushSync(() =>
    root.render(
      <main>
        <h1>Pagination verification</h1>
        <button id="before" tabIndex={0}>
          Before
        </button>
        <form
          id="form"
          onSubmit={(e) => {
            e.preventDefault()
            events.push('submit')
          }}
        >
          <Pagination
            key={generation}
            total={1000}
            {...props}
            {...({
              onClickCapture: options.cancelClick
                ? (e: Event) => e.preventDefault()
                : undefined,
              onKeyDownCapture: options.cancelKey
                ? (e: Event) => e.preventDefault()
                : undefined,
            } as {})}
            onPageChange={(details) => {
              events.push(details)
              if (options.accept)
                renderPagination({ ...props, page: details.page }, options)
            }}
          />
        </form>
        <button id="after" tabIndex={0}>
          After
        </button>
        <div id="reference">
          <Button variant="ghost" disabled={props.disabled}>
            Next
          </Button>
        </div>
        <div id="selected-reference">
          <Button variant="primary">1</Button>
        </div>
      </main>,
    ),
  )
}
Object.assign(window, {
  renderPagination,
  paginationEvents: events,
  paginationReactVersion: version,
})
renderPagination()
