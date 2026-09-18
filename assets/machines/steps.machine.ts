/** Ordered navigation; completion and form validation belong to the consumer. */
import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type {
  MachineSchema,
  MachineConfig,
  MachineSnapshot,
  SendFn,
} from '../types'

export const stepsAnatomy = createAnatomy('steps').parts(
  'root',
  'list',
  'item',
  'trigger',
  'content',
  'indicator',
)
interface StepsContext {
  [key: string]: unknown
  step: number
  total: number
  linear: boolean
  disabled: boolean
  onStepChange: ((details: { step: number }) => void) | null
}
type StepsEvent =
  | { type: 'SET_STEP'; step: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
export interface StepsSchema extends MachineSchema {
  context: StepsContext
  state: 'idle'
  event: StepsEvent
}
function getStep(ctx: StepsContext): number {
  const step = Number.isSafeInteger(ctx.step) ? ctx.step : 0
  return Math.max(0, Math.min(step, ctx.total - 1))
}
function canSetStep(ctx: StepsContext, target: number): boolean {
  return (
    !ctx.disabled &&
    Number.isSafeInteger(target) &&
    target >= 0 &&
    target < ctx.total &&
    (!ctx.linear || target <= getStep(ctx) + 1)
  )
}
function setStep(ctx: StepsContext, target: number): void {
  if (!canSetStep(ctx, target) || target === getStep(ctx)) return
  ctx.step = target
  ctx.onStepChange?.({ step: target })
}
export const stepsMachine: MachineConfig<StepsSchema> =
  createMachine<StepsSchema>({
    id: 'steps',
    initial: 'idle',
    context: {
      step: 0,
      total: 0,
      linear: true,
      disabled: false,
      onStepChange: null,
    },
    computed: {
      isFirst: (ctx) => ctx.total > 0 && getStep(ctx) === 0,
      isLast: (ctx) => ctx.total > 0 && getStep(ctx) === ctx.total - 1,
      canGoNext: (ctx) => canSetStep(ctx, getStep(ctx) + 1),
      canGoPrev: (ctx) => canSetStep(ctx, getStep(ctx) - 1),
    },
    states: {
      idle: {
        on: {
          SET_STEP: {
            actions: [
              (ctx, event) => {
                if (event.type === 'SET_STEP') setStep(ctx, event.step)
              },
            ],
          },
          NEXT: { actions: [(ctx) => setStep(ctx, getStep(ctx) + 1)] },
          PREV: { actions: [(ctx) => setStep(ctx, getStep(ctx) - 1)] },
        },
      },
    },
  })
export function connectSteps(
  state: MachineSnapshot<StepsSchema>,
  send: SendFn<StepsSchema>,
) {
  const ctx = state.context
  const step = getStep(ctx)
  const attrs = stepsAnatomy.getPartAttrs
  const getStepState = (index: number) =>
    index === step ? 'active' : index < step ? 'previous' : 'upcoming'
  return {
    step,
    isFirst: state.computed.isFirst as boolean,
    isLast: state.computed.isLast as boolean,
    canGoNext: state.computed.canGoNext as boolean,
    canGoPrev: state.computed.canGoPrev as boolean,
    getRootProps() {
      return { ...attrs('root'), role: 'group' as const, 'aria-label': 'Steps' }
    },
    getListProps() {
      return { ...attrs('list'), role: 'list' as const }
    },
    getItemProps(index: number) {
      return {
        ...attrs('item'),
        'data-state': getStepState(index),
        'data-index': index,
      }
    },
    getTriggerProps(index: number) {
      const disabled = !canSetStep(ctx, index)
      return {
        ...attrs('trigger'),
        type: 'button' as const,
        tabIndex: 0,
        'aria-current': index === step ? ('step' as const) : undefined,
        'data-state': getStepState(index),
        'data-index': index,
        'data-disabled': disabled ? '' : undefined,
        disabled,
        onClick(event: { defaultPrevented: boolean }) {
          if (!event.defaultPrevented && !disabled)
            send({ type: 'SET_STEP', step: index })
        },
      }
    },
    getContentProps(index: number) {
      return {
        ...attrs('content'),
        role: 'group' as const,
        tabIndex: -1,
        'data-state': getStepState(index),
        'data-index': index,
        hidden: step !== index,
      }
    },
    getIndicatorProps(index: number) {
      return {
        ...attrs('indicator'),
        'aria-hidden': true as const,
        'data-index': index,
      }
    },
  }
}
