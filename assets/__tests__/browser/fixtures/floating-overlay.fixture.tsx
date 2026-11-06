import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Popover, type PopoverProps } from '../../../../Popover/Popover'
import { Tooltip, type TooltipProps } from '../../../../Tooltip/Tooltip'
import { Button } from '../../../../Button/Button'
import { Text } from '../../../../Text/Text'
import { Overlay, type OverlayProps } from '../../../../Overlay/Overlay'
import type { Flat } from '../helpers'
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
    props?: Flat<TooltipProps | PopoverProps | OverlayProps>
    top?: number
    left?: number
    direction?: 'ltr' | 'rtl'
    empty?: boolean
    width?: number
    height?: number
    reset?: boolean
    triggerKind?: 'native-disabled' | 'face-disabled' | 'span'
    optionRows?: readonly number[]
    attachment?: { width: number; height: number; gap?: string; triggerLeft?: number }
    underlay?: boolean
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
      <div dir={options.direction}>
        <h1>Floating overlay verification</h1>
        <p id="existing">Existing description</p>
        <button id="outside">Outside</button>
        <div
          id="attachment"
          data-uf-dropdown-attachment={options.attachment ? '' : undefined}
          style={{
            position: 'absolute',
            top: options.top ?? 180,
            left: options.left ?? 240,
            ...(options.attachment ? {
              width: options.attachment.width,
              height: options.attachment.height,
              '--uf-dropdown-panel-gap': options.attachment.gap,
            } : {}),
          }}
        >
          {options.underlay && <button
            id="underlay"
            style={{ position: 'absolute', top: 24, left: 0, width: 180, height: 80 }}
            onClick={() => events.push({ type: 'underlay' })}
          >Underlying action</button>}
          <div style={options.attachment ? { marginLeft: options.attachment.triggerLeft ?? 24 } : undefined}>
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
                  {options.optionRows ? options.optionRows.map((height, index) =>
                    <div role="menuitem" key={index} style={{ height, display: 'flex', alignItems: 'center' }}>
                      Row {index}<button aria-label={`Nested action ${index}`}>Action</button>
                    </div>,
                  ) : <>{options.underlay ? <><Text>Additional information</Text><Button id="nested-disabled" disabled>Unavailable action</Button></> : 'Additional information'}
                    {options.kind !== 'tooltip' && options.kind && <button onClick={() => events.push({ type: 'action' })}>Action</button>}</>}
                </div>
              )
            }
            {...(options.props as TooltipProps)}
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
        </div>
      </div>,
    ),
  )
}
Object.assign(window, { renderFloating, floatingEvents: events })
export type Hooks = { renderFloating: typeof renderFloating }
renderFloating()
