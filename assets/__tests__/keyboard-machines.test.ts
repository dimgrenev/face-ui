import { describe, expect, it } from 'vitest'

import { interpret } from '../create-machine'
import { navigationMachine } from '../machines/navigation.machine'
import { radioMachine } from '../machines/radio.machine'
import { tabsMachine } from '../machines/tabs.machine'
import { treeMachine } from '../machines/tree.machine'

describe('keyboard machine fidelity', () => {
  it('tabs rove focus across enabled items and auto-select on focus', () => {
    const svc = interpret(tabsMachine, {
      value: 'overview',
      itemOrder: ['overview', 'details', 'billing'],
      disabledValues: ['details'],
      activationMode: 'automatic',
    }).start()

    svc.send({ type: 'FOCUS', value: 'overview' })
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.focusedValue).toBe('billing')
    expect(svc.getSnapshot().context.value).toBe('billing')

    svc.send({ type: 'FOCUS_PREV' })
    expect(svc.getSnapshot().context.focusedValue).toBe('overview')
    expect(svc.getSnapshot().context.value).toBe('overview')
    svc.stop()
  })

  it('radio roves focus and selection together', () => {
    const svc = interpret(radioMachine, {
      value: 'a',
      itemOrder: ['a', 'b', 'c'],
      disabledValues: ['b'],
    }).start()

    svc.send({ type: 'FOCUS', value: 'a' })
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.focusedValue).toBe('c')
    expect(svc.getSnapshot().context.value).toBe('c')

    svc.send({ type: 'FOCUS_PREV' })
    expect(svc.getSnapshot().context.focusedValue).toBe('a')
    expect(svc.getSnapshot().context.value).toBe('a')
    svc.stop()
  })

  it('navigation roves top-level focus with arrow keys', () => {
    const svc = interpret(navigationMachine, {
      itemOrder: ['home', 'docs', 'pricing'],
      disabledIds: ['docs'],
      activeId: 'home',
    }).start()

    svc.send({ type: 'NAVIGATE_NEXT' })
    expect(svc.getSnapshot().context.focusedId).toBe('pricing')

    svc.send({ type: 'NAVIGATE_PREV' })
    expect(svc.getSnapshot().context.focusedId).toBe('home')
    svc.stop()
  })

  it('tree uses visible order for home/end/arrow navigation', () => {
    const svc = interpret(treeMachine, {
      visibleIds: ['root', 'child-a', 'child-b', 'leaf'],
      selectedId: 'root',
    }).start()

    svc.send({ type: 'FOCUS', id: 'root' })
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.focusedId).toBe('child-a')

    svc.send({ type: 'FOCUS_LAST' })
    expect(svc.getSnapshot().context.focusedId).toBe('leaf')

    svc.send({ type: 'FOCUS_FIRST' })
    expect(svc.getSnapshot().context.focusedId).toBe('root')
    svc.stop()
  })
})
