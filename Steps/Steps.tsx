/** Steps — ordered wizard navigation with persistent content panels. */
import {
  forwardRef,
  useId,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { readCollection } from '../assets/runtime/collection'
import { readNumber } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'

export interface StepItem {
  /** Noninteractive content naming the step inside its button. */
  label: ReactNode
  /** Panel content; inactive panels stay mounted but hidden, keeping their local state. */
  content?: ReactNode
  /** Stable identity that keeps the step's DOM and panel state across reorders; defaults to its position. */
  key?: string | number
}
export interface StepsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
  | 'role'
  | 'aria-disabled'
> {
  /** Ordered steps; an omitted or empty list renders no navigation. */
  items?: readonly StepItem[]
  /** Controlled index of the current step, from 0; an index past the last step shows the last one. */
  step?: number
  /** Uncontrolled step index on mount, from 0; read once. */
  defaultStep?: number
  /** Allows only the current, an earlier or the immediately next step; does not validate forms. */
  linear?: boolean
  /** Disables step navigation; the visible panel stays usable. */
  disabled?: boolean
  /** Called once per user selection of a different step; `step` updates from the parent never call it. */
  onStepChange?: (details: { step: number }) => void
  /** Membrane spacing around each step button. */
  membrane?: boolean
  /** Additional class name on the root group. */
  className?: string
}

const INDEX = { integer: true, min: 0 } as const
/** Keys are strings; a finite number stands for its decimal text. */
const keyOf = ({ key }: StepItem) =>
  typeof key === 'number' && Number.isFinite(key) ? String(key) : key

/** Ordered wizard navigation: one button per step and a persistent panel for each step with content. */
export const Steps = forwardRef<HTMLDivElement, StepsProps>(
  function Steps(props, ref) {
    const {
      items,
      step,
      defaultStep = 0,
      linear = true,
      disabled = false,
      onStepChange,
      membrane = true,
      className,
      onClick,
      ...rest
    } = props
    const { entries } = readCollection<StepItem>(items, {
      component: 'Steps',
      positional: true,
      key: keyOf,
    })
    const count = entries.length
    const [stored, setStep, replaceStep] = useControllableState<number>({
      value:
        step === undefined
          ? undefined
          : readNumber('Steps', 'step', step, 0, INDEX),
      defaultValue: () =>
        readNumber('Steps', 'defaultStep', defaultStep, 0, INDEX),
      onChange: (next) => onStepChange?.({ step: next }),
      name: ['Steps', 'step'],
    })
    const current = Math.min(stored, Math.max(count - 1, 0))
    // Only a removal moves an uncontrolled step, to the last one left; an index the items do not
    // reach yet (async or momentarily empty items) keeps waiting for them.
    const previous = useRef(count)
    const removed = count > 0 && Math.min(stored, previous.current - 1) >= count
    useIsomorphicLayoutEffect(() => {
      if (removed) replaceStep(count - 1)
      previous.current = count
    })

    const reachable = (index: number) =>
      !disabled && (!linear || index <= current + 1)
    const select = (event: MouseEvent<HTMLDivElement>) => {
      const trigger = (event.target as Element).closest?.(
        '[data-scope="steps"][data-part="trigger"]',
      )
      if (
        !trigger ||
        event.defaultPrevented ||
        trigger.closest('[data-scope="steps"][data-part="root"]') !==
          event.currentTarget
      )
        return
      const index = Number(trigger.getAttribute('data-index'))
      if (index !== current && reachable(index)) setStep(index)
    }

    const rootRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    // Focus lost with a removed, hidden or disabled element goes to the current step's button,
    // else the visible panel, else the root.
    useFocusRecovery(rootRef, () => {
      const root = rootRef.current!
      return (
        root.querySelector<HTMLElement>(
          '[aria-current="step"]:not(:disabled)',
        ) ??
        root.querySelector<HTMLElement>(
          ':scope > [data-part="content"]:not([hidden])',
        ) ??
        root
      )
    })
    const id = useId()
    const stateOf = (index: number) =>
      index === current ? 'active' : index < current ? 'previous' : 'upcoming'
    return (
      <div
        {...rest}
        ref={composedRef}
        data-scope="steps"
        data-part="root"
        role="group"
        tabIndex={rest.tabIndex ?? -1}
        className={cn('uf-steps', className)}
        onClick={composeHandlers(onClick, select)}
      >
        {count > 0 && (
          <ol
            data-scope="steps"
            data-part="list"
            role="list"
            className="uf-steps-list"
          >
            {entries.map(({ key, item }, index) => {
              const off = !reachable(index)
              return (
                <li
                  key={key}
                  data-scope="steps"
                  data-part="item"
                  data-state={stateOf(index)}
                  data-index={index}
                  className="uf-steps-item"
                >
                  <Membrane enabled={membrane} interactive>
                    <button
                      type="button"
                      // WebKit leaves buttons without an explicit tabIndex out of the Tab order.
                      tabIndex={0}
                      id={`${id}-trigger-${index}`}
                      data-scope="steps"
                      data-part="trigger"
                      data-state={stateOf(index)}
                      data-index={index}
                      data-disabled={off ? '' : undefined}
                      disabled={off}
                      aria-current={index === current ? 'step' : undefined}
                      aria-controls={
                        hasSlotContent(item.content)
                          ? `${id}-content-${index}`
                          : undefined
                      }
                      className="uf-steps-trigger uf-option uf-control"
                    >
                      <span
                        data-scope="steps"
                        data-part="indicator"
                        data-index={index}
                        aria-hidden
                        className="uf-steps-indicator"
                      >
                        {index + 1}
                      </span>
                      <Text
                        as="span"
                        inset="none"
                        membrane={false}
                        className="uf-steps-label"
                      >
                        {item.label}
                      </Text>
                    </button>
                  </Membrane>
                </li>
              )
            })}
          </ol>
        )}
        {entries.map(({ key, item }, index) =>
          hasSlotContent(item.content) ? (
            <div
              key={key}
              id={`${id}-content-${index}`}
              data-scope="steps"
              data-part="content"
              data-state={stateOf(index)}
              data-index={index}
              role="group"
              tabIndex={-1}
              hidden={index !== current}
              aria-labelledby={`${id}-trigger-${index}`}
            >
              {typeof item.content === 'string' ||
              typeof item.content === 'number' ? (
                <Text as="div" fullWidth style={{ textAlign: 'inherit' }}>
                  {item.content}
                </Text>
              ) : (
                item.content
              )}
            </div>
          ) : null,
        )}
      </div>
    )
  },
)
