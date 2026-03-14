import { describe, it, expect, vi } from 'vitest'
import { createMachine, interpret, and, or, not, areContextValuesEqual } from '../create-machine'
import type { MachineSchema } from '../types'

// ---------------------------------------------------------------------------
// Test schema
// ---------------------------------------------------------------------------

interface TestSchema extends MachineSchema {
  context: { count: number; disabled: boolean }
  state: 'idle' | 'active'
  event:
    | { type: 'ACTIVATE' }
    | { type: 'DEACTIVATE' }
    | { type: 'INCREMENT' }
    | { type: 'SET'; value: number }
}

const testMachine = createMachine<TestSchema>({
  id: 'test',
  initial: 'idle',
  context: { count: 0, disabled: false },
  states: {
    idle: {
      on: {
        ACTIVATE: [{ target: 'active', guard: (ctx) => !ctx.disabled }],
        INCREMENT: { actions: ['increment'] },
        SET: { actions: ['setValue'] },
      },
    },
    active: {
      tags: ['active'],
      entry: ['onEnterActive'],
      exit: ['onExitActive'],
      on: {
        DEACTIVATE: 'idle',
        INCREMENT: { actions: ['increment'] },
      },
    },
  },
  computed: {
    isActive: (_, { matches }) => matches('active'),
    doubleCount: (ctx) => ctx.count * 2,
  },
  watch: {
    count(ctx, prev) {
      // watched externally in tests
    },
  },
  implementations: {
    actions: {
      increment: (ctx) => { ctx.count++ },
      setValue: (ctx, e) => { ctx.count = (e as { type: 'SET'; value: number }).value },
      onEnterActive: () => {},
      onExitActive: () => {},
    },
  },
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createMachine', () => {
  it('returns a config object', () => {
    expect(testMachine.id).toBe('test')
    expect(testMachine.initial).toBe('idle')
  })
})

describe('interpret', () => {
  it('starts in initial state', () => {
    const svc = interpret(testMachine).start()
    const snap = svc.getSnapshot()
    expect(snap.value).toBe('idle')
    expect(snap.context.count).toBe(0)
    svc.stop()
  })

  it('accepts context overrides', () => {
    const svc = interpret(testMachine, { count: 10 }).start()
    expect(svc.getSnapshot().context.count).toBe(10)
    svc.stop()
  })

  it('transitions between states', () => {
    const svc = interpret(testMachine).start()
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().value).toBe('active')
    svc.send('DEACTIVATE')
    expect(svc.getSnapshot().value).toBe('idle')
    svc.stop()
  })

  it('guards prevent transitions', () => {
    const svc = interpret(testMachine, { disabled: true }).start()
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().value).toBe('idle')
    svc.stop()
  })

  it('runs actions', () => {
    const svc = interpret(testMachine).start()
    svc.send('INCREMENT')
    expect(svc.getSnapshot().context.count).toBe(1)
    svc.send('INCREMENT')
    expect(svc.getSnapshot().context.count).toBe(2)
    svc.stop()
  })

  it('handles event objects with payload', () => {
    const svc = interpret(testMachine).start()
    svc.send({ type: 'SET', value: 42 })
    expect(svc.getSnapshot().context.count).toBe(42)
    svc.stop()
  })

  it('computes derived values', () => {
    const svc = interpret(testMachine, { count: 5 }).start()
    expect(svc.getSnapshot().computed.doubleCount).toBe(10)
    expect(svc.getSnapshot().computed.isActive).toBe(false)
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().computed.isActive).toBe(true)
    svc.stop()
  })

  it('matches helper works', () => {
    const svc = interpret(testMachine).start()
    expect(svc.getSnapshot().matches('idle')).toBe(true)
    expect(svc.getSnapshot().matches('active')).toBe(false)
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().matches('active')).toBe(true)
    svc.stop()
  })

  it('hasTag helper works', () => {
    const svc = interpret(testMachine).start()
    expect(svc.getSnapshot().hasTag('active')).toBe(false)
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().hasTag('active')).toBe(true)
    svc.stop()
  })

  it('notifies subscribers on transitions', () => {
    const svc = interpret(testMachine).start()
    const listener = vi.fn()
    svc.subscribe(listener)
    svc.send('ACTIVATE')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].value).toBe('active')
    svc.stop()
  })

  it('unsubscribe works', () => {
    const svc = interpret(testMachine).start()
    const listener = vi.fn()
    const unsub = svc.subscribe(listener)
    unsub()
    svc.send('ACTIVATE')
    expect(listener).not.toHaveBeenCalled()
    svc.stop()
  })

  it('does not process events after stop', () => {
    const svc = interpret(testMachine).start()
    svc.stop()
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().value).toBe('idle')
  })

  it('string events work', () => {
    const svc = interpret(testMachine).start()
    svc.send('ACTIVATE')
    expect(svc.getSnapshot().value).toBe('active')
    svc.stop()
  })

  it('syncs external context updates without fake events', () => {
    const svc = interpret(testMachine).start()
    const listener = vi.fn()
    svc.subscribe(listener)

    svc.syncContext({ count: 12, disabled: true })

    expect(svc.getSnapshot().context.count).toBe(12)
    expect(svc.getSnapshot().context.disabled).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    svc.stop()
  })

  it('does not notify when syncContext receives structurally equal values', () => {
    interface EqualSchema extends MachineSchema {
      context: { items: string[]; range: { start: string | null; end: string | null } }
      state: 'idle'
      event: { type: 'NOOP' }
    }

    const machine = createMachine<EqualSchema>({
      id: 'equal-test',
      initial: 'idle',
      context: {
        items: ['a', 'b'],
        range: { start: '2026-03-06', end: null },
      },
      states: {
        idle: {},
      },
    })

    const svc = interpret(machine).start()
    const listener = vi.fn()
    svc.subscribe(listener)

    svc.syncContext({
      items: ['a', 'b'],
      range: { start: '2026-03-06', end: null },
    })

    expect(listener).not.toHaveBeenCalled()
    expect(svc.getSnapshot().context.items).toEqual(['a', 'b'])
    expect(svc.getSnapshot().context.range).toEqual({ start: '2026-03-06', end: null })
    svc.stop()
  })

  it('updates callback refs without notifying subscribers', () => {
    interface CallbackSchema extends MachineSchema {
      context: { onValueChange: null | ((details: { value: string }) => void) }
      state: 'idle'
      event: { type: 'NOOP' }
    }

    const first = vi.fn()
    const second = vi.fn()
    const machine = createMachine<CallbackSchema>({
      id: 'callback-test',
      initial: 'idle',
      context: {
        onValueChange: first,
      },
      states: {
        idle: {},
      },
    })

    const svc = interpret(machine).start()
    const listener = vi.fn()
    svc.subscribe(listener)

    svc.syncContext({ onValueChange: second })

    expect(listener).not.toHaveBeenCalled()
    expect(svc.getSnapshot().context.onValueChange).toBe(second)
    svc.stop()
  })
})

describe('areContextValuesEqual', () => {
  it('matches arrays and plain objects structurally', () => {
    expect(areContextValuesEqual(['a', { value: 1 }], ['a', { value: 1 }])).toBe(true)
    expect(areContextValuesEqual({ start: null, end: 'x' }, { start: null, end: 'x' })).toBe(true)
    expect(areContextValuesEqual(['a'], ['b'])).toBe(false)
    expect(areContextValuesEqual({ start: null }, { start: 'x' })).toBe(false)
  })
})

describe('effects', () => {
  interface EffectSchema extends MachineSchema {
    context: { value: number; cleanup: boolean }
    state: 'off' | 'on'
    event: { type: 'TOGGLE' } | { type: 'TICK' }
  }

  it('runs and cleans up effects', () => {
    const cleanupSpy = vi.fn()
    const machine = createMachine<EffectSchema>({
      id: 'effect-test',
      initial: 'off',
      context: { value: 0, cleanup: false },
      states: {
        off: { on: { TOGGLE: 'on' } },
        on: {
          effects: ['timer'],
          on: { TOGGLE: 'off', TICK: { actions: ['tick'] } },
        },
      },
      implementations: {
        actions: {
          tick: (ctx) => { ctx.value++ },
        },
        effects: {
          timer: (_ctx, send) => {
            const id = setInterval(() => send('TICK'), 10)
            return () => {
              clearInterval(id)
              cleanupSpy()
            }
          },
        },
      },
    })

    const svc = interpret(machine).start()
    svc.send('TOGGLE') // → on, starts effect
    svc.send('TOGGLE') // → off, cleanups effect
    expect(cleanupSpy).toHaveBeenCalledTimes(1)
    svc.stop()
  })
})

describe('guard combinators', () => {
  const isEnabled = (ctx: { disabled: boolean }) => !ctx.disabled
  const hasValue = (ctx: { count: number }) => ctx.count > 0

  it('and() combines guards', () => {
    type Ctx = { disabled: boolean; count: number }
    const combined = and<{ context: Ctx; state: string; event: { type: string } }>(
      isEnabled as (ctx: Ctx) => boolean,
      hasValue as (ctx: Ctx) => boolean,
    )
    expect(combined({ disabled: false, count: 5 } as Ctx, { type: 'X' })).toBe(true)
    expect(combined({ disabled: true, count: 5 } as Ctx, { type: 'X' })).toBe(false)
    expect(combined({ disabled: false, count: 0 } as Ctx, { type: 'X' })).toBe(false)
  })

  it('or() combines guards', () => {
    type Ctx = { disabled: boolean; count: number }
    const combined = or<{ context: Ctx; state: string; event: { type: string } }>(
      isEnabled as (ctx: Ctx) => boolean,
      hasValue as (ctx: Ctx) => boolean,
    )
    expect(combined({ disabled: true, count: 5 } as Ctx, { type: 'X' })).toBe(true)
    expect(combined({ disabled: true, count: 0 } as Ctx, { type: 'X' })).toBe(false)
  })

  it('not() inverts guard', () => {
    type Ctx = { disabled: boolean }
    const notDisabled = not<{ context: Ctx; state: string; event: { type: string } }>(
      (ctx: Ctx) => ctx.disabled,
    )
    expect(notDisabled({ disabled: false } as Ctx, { type: 'X' })).toBe(true)
    expect(notDisabled({ disabled: true } as Ctx, { type: 'X' })).toBe(false)
  })
})
