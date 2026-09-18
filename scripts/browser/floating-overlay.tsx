import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Popover } from '../../Popover/Popover'
import { Tooltip } from '../../Tooltip/Tooltip'
import { Button } from '../../Button/Button'
import { Overlay } from '../../Overlay/Overlay'
import '../../assets/styles/index.css'
const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '0',
  color: 'var(--uf-color-fg)',
  background: 'var(--uf-color-bg)',
})
const events: unknown[] = []
const renderFloating = (
  options: {
    kind?: 'tooltip' | 'popover' | 'hovercard'
    props?: Record<string, unknown>
    top?: number
    left?: number
    direction?: 'ltr' | 'rtl'
    empty?: boolean
    width?: number
    height?: number
    reset?: boolean
    triggerKind?: 'native-disabled' | 'face-disabled' | 'span'
  } = {},
) => {
  if (options.reset) events.length = 0
  const Component =
    options.kind === 'popover'
      ? Popover
      : options.kind === 'hovercard'
        ? Overlay
        : Tooltip
  flushSync(() =>
    root.render(
      <main dir={options.direction}>
        <h1>Floating overlay verification</h1>
        <p id="existing">Existing description</p>
        <button id="outside">Outside</button>
        <div
          style={{
            position: 'absolute',
            top: options.top ?? 180,
            left: options.left ?? 240,
          }}
        >
          <Component
            {...(options.kind === 'hovercard' ? { interactive: true } : {})}
            content={
              options.empty ? null : (
                <div
                  id="payload"
                  style={{
                    width: options.width ?? 160,
                    minHeight: options.height ?? 36,
                  }}
                >
                  Additional information
                  {options.kind === 'popover' && <button>Action</button>}
                </div>
              )
            }
            {...options.props}
            ref={(node) => {
              ;(window as any).floatingNode = node
            }}
            onOpenChange={(detail) => events.push(detail)}
          >
            {options.triggerKind === 'face-disabled' ? (
              <Button id="trigger" disabled>
                Trigger
              </Button>
            ) : options.triggerKind === 'span' ? (
              <span id="trigger">Trigger</span>
            ) : (
              <button
                id="trigger"
                disabled={options.triggerKind === 'native-disabled'}
                aria-describedby="existing"
                tabIndex={0}
              >
                Trigger
              </button>
            )}
          </Component>
        </div>
      </main>,
    ),
  )
}
Object.assign(window, { renderFloating, floatingEvents: events })
renderFloating()
