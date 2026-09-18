import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Modal, Popover } from '../../../../index'

const root = createRoot(document.getElementById('root')!)
function Actions({
  state = '',
  prefix = '',
  autoFocus = false,
}: {
  state?: ActionState
  prefix?: string
  autoFocus?: boolean
}) {
  return (
    <>
      <h2 tabIndex={-1} data-heading={prefix}>
        {prefix} Heading
      </h2>
      <fieldset
        disabled={state === 'fieldset'}
        hidden={state === 'hidden'}
        aria-hidden={state === 'aria-hidden' || undefined}
        className={state === 'class' ? 'invisible-action' : undefined}
        style={state === 'style' ? { display: 'none' } : undefined}
      >
        {state !== 'removed' && (
          <button autoFocus={autoFocus} disabled={state === 'disabled'}>
            {prefix} Target
          </button>
        )}
      </fieldset>
      <button>{prefix} Survivor</button>
    </>
  )
}
type ActionState =
  | ''
  | 'removed'
  | 'disabled'
  | 'fieldset'
  | 'hidden'
  | 'aria-hidden'
  | 'class'
  | 'style'
type Options = {
  open?: boolean
  autoFocus?: boolean
  empty?: boolean
  state?: ActionState
  childAutoFocus?: boolean
  childState?: ActionState
  popoverState?: ActionState
}
function Fixture(props: Options) {
  return (
    <>
      <style>{'.invisible-action { visibility: hidden; }'}</style>
      <button id="outside">Outside</button>
      <Modal
        open={props.open}
        autoFocusOnOpen={props.autoFocus !== false}
        title="Parent"
        closable={!props.empty}
        trigger={<button>Open parent</button>}
      >
        {!props.empty && (
          <>
            <Actions state={props.state} autoFocus={props.childAutoFocus} />
            <Modal title="Child" trigger={<button>Open child</button>}>
              <Actions state={props.childState} prefix="Child" />
            </Modal>
            <Popover
              content={<Actions state={props.popoverState} prefix="Popover" />}
            >
              <button>Open popover</button>
            </Popover>
          </>
        )}
      </Modal>
    </>
  )
}
function renderLayers(options: Options = {}) {
  flushSync(() =>
    root.render(
      <StrictMode>
        <Fixture {...options} />
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderLayers })
export type Hooks = { renderLayers: typeof renderLayers }
