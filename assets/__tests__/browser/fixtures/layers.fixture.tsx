import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Modal, Popover, Tooltip } from '../../../../index'
// Deprecated, so not exported from the index: the interactive hover card.
import { Overlay } from '../../../../Overlay/Overlay'

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
        scrollLock
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

// The layer stack across components: Escape, outside presses, focus return,
// scroll lock and touch. `tall` makes the document scroll.
type StackOptions = {
  scene: 'popover' | 'modal' | 'hover-card'
  dir?: 'ltr' | 'rtl'
  tall?: boolean
}
function Stack({ scene, tall }: StackOptions) {
  const nested = (
    <Popover content={<button>Nested action</button>}>
      <button>More</button>
    </Popover>
  )
  const hinted = (
    <Tooltip content="Copy link" openDelay={0}>
      <button>Copy</button>
    </Tooltip>
  )
  return (
    <>
      <style>{'.stack-edge { height: 20px; background: currentColor; }'}</style>
      <div className="stack-edge" />
      <input aria-label="Outside field" />
      <p>Page text</p>
      {scene === 'popover' && (
        <Popover
          content={
            <>
              <p>Popover text</p>
              {hinted}
              {nested}
            </>
          }
        >
          <button>Share</button>
        </Popover>
      )}
      {scene === 'modal' && (
        <Modal title="Parent" scrollLock trigger={<button>Open modal</button>}>
          <p>Modal text</p>
          {hinted}
          {nested}
          <Modal title="Child" scrollLock trigger={<button>Open child</button>}>
            <p>Child text</p>
          </Modal>
        </Modal>
      )}
      {scene === 'hover-card' && (
        <Overlay interactive openDelay={0} content={<button>Card action</button>}>
          <button>Profile</button>
        </Overlay>
      )}
      {tall && <div style={{ height: 3000 }} />}
    </>
  )
}
function renderStack(options: StackOptions) {
  document.documentElement.dir = options.dir ?? 'ltr'
  flushSync(() =>
    root.render(
      <StrictMode>
        <Stack {...options} />
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderLayers, renderStack })
export type Hooks = {
  renderLayers: typeof renderLayers
  renderStack: typeof renderStack
}
