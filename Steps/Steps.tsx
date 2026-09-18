/** Steps — ordered wizard navigation with persistent content panels. */
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { stepsMachine, connectSteps } from '../assets/machines/steps.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'
import { hasSlotContent } from '../assets/slot-content'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'

export interface StepItem {
  /** Nonempty, noninteractive content naming the step. */
  label: ReactNode
  /** Panel content. Inactive panels stay mounted but hidden, preserving local state. */
  content?: ReactNode
  /** Stable unique identity for dynamic items; defaults to the original array index. */
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
  /** Ordered step definitions. An omitted or empty list renders no navigation. */
  items?: readonly StepItem[]
  /** Controlled nonnegative integer index; displayed within the current item bounds. */
  step?: number
  /** Initial uncontrolled index; later changes are ignored. Defaults to 0. */
  defaultStep?: number
  /** Allow only the current, earlier or immediately next step. Does not validate forms. */
  linear?: boolean
  /** Disable step navigation; the visible panel remains usable. */
  disabled?: boolean
  /** One proposal for a user change to a different step; external updates are quiet. */
  onStepChange?: (details: { step: number }) => void
  /** Membrane spacing around each step control. Defaults to true. */
  membrane?: boolean
  /** Additional class name on the root group. */
  className?: string
}
function readItems(value: StepsProps['items']): readonly StepItem[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new TypeError('Steps items must be an array')
  const keys = new Set<string>()
  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      !hasSlotContent(item.label) ||
      (typeof item.label === 'string' && !item.label.trim())
    )
      throw new TypeError('Steps item labels must contain content')
    if (item.key !== undefined) {
      if (
        typeof item.key !== 'string' &&
        (typeof item.key !== 'number' || !Number.isFinite(item.key))
      )
        throw new TypeError('Steps item key must be a string or finite number')
      const key = String(item.key)
      if (keys.has(key)) throw new TypeError('Steps item keys must be unique')
      keys.add(key)
    }
  }
  return value
}
function readStep(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`Steps ${name} must be a nonnegative safe integer`)
  return value
}
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
const itemKey = (item: StepItem, index: number) =>
  item.key === undefined ? `index:${index}` : `key:${item.key}`

export const Steps = forwardRef<HTMLDivElement, StepsProps>(
  function Steps(props, ref) {
    const {
      items: rawItems,
      step: rawStep,
      defaultStep: rawDefaultStep = 0,
      linear = true,
      disabled = false,
      onStepChange,
      membrane = true,
      className,
      hidden,
      ...rest
    } = props
    const items = readItems(rawItems)
    const step = rawStep === undefined ? undefined : readStep(rawStep, 'step')
    const [defaultStep] = useState(() =>
      step === undefined ? readStep(rawDefaultStep, 'defaultStep') : 0,
    )
    const machineStep = useControllableMachineProp(step, defaultStep)
    const { state, send, syncContext } = useMachine(stepsMachine, {
      step: machineStep,
      total: items.length,
      linear,
      disabled,
      onStepChange: onStepChange ?? null,
    })
    const api = connectSteps(state, send)
    const id = useId()
    const rootRef = useRef<HTMLDivElement | null>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const focused = useRef<HTMLElement | null>(null)
    useCommitEffect(() => {
      if (step === undefined && state.context.step !== api.step)
        syncContext({ step: api.step })
    }, [step, api.step, state.context.step, syncContext])
    useCommitEffect(() => {
      // useMachine commits a changed collection before paint; wait for that view
      // before choosing a focus target after a removal.
      if (state.context.total !== items.length) return
      const previous = focused.current
      const root = rootRef.current
      if (hidden || !root || root.closest('[hidden], [inert]')) {
        focused.current = null
        return
      }
      if (
        !previous ||
        (previous.isConnected &&
          !previous.closest('[hidden]') &&
          !(previous instanceof HTMLButtonElement && previous.disabled))
      )
        return
      const active = root.ownerDocument.activeElement
      if (
        active !== root.ownerDocument.body &&
        active !== previous &&
        !previous.contains(active)
      )
        return
      focused.current = null
      const target =
        root.querySelector<HTMLElement>(
          '[aria-current="step"]:not(:disabled)',
        ) ??
        root.querySelector<HTMLElement>(
          '[data-part="content"]:not([hidden])',
        ) ??
        root
      target.focus({ preventScroll: true })
    })
    return (
      <div
        {...api.getRootProps()}
        {...rest}
        hidden={hidden}
        ref={composedRef}
        tabIndex={rest.tabIndex ?? -1}
        onFocusCapture={(event) => {
          focused.current = event.target as HTMLElement
          rest.onFocusCapture?.(event)
        }}
        onBlurCapture={(event) => {
          if (
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget as Node)
          )
            focused.current = null
          rest.onBlurCapture?.(event)
        }}
        className={cn('uf-steps', className)}
      >
        {items.length > 0 && (
          <ol {...api.getListProps()} className="uf-steps-list">
            {items.map((item, index) => (
              <li
                key={itemKey(item, index)}
                {...api.getItemProps(index)}
                className="uf-steps-item"
              >
                <Membrane enabled={membrane} interactive>
                  <button
                    {...api.getTriggerProps(index)}
                    id={`${id}-trigger-${index}`}
                    aria-controls={
                      hasSlotContent(item.content)
                        ? `${id}-content-${index}`
                        : undefined
                    }
                    className="uf-steps-trigger uf-option uf-control"
                  >
                    <span
                      {...api.getIndicatorProps(index)}
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
            ))}
          </ol>
        )}
        {items.map((item, index) =>
          hasSlotContent(item.content) ? (
            <div
              key={itemKey(item, index)}
              {...api.getContentProps(index)}
              id={`${id}-content-${index}`}
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
