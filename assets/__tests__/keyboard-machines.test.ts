import { describe, expect, it } from 'vitest'

import { interpret } from '../create-machine'
import { menuMachine } from '../machines/menu.machine'
import { navigationMachine } from '../machines/navigation.machine'
import { radioMachine } from '../machines/radio.machine'
import { selectMachine } from '../machines/select.machine'
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

  it('menu roves highlighted items across enabled menuitems', () => {
    const selectedValues: string[] = []
    const svc = interpret(menuMachine, {
      itemOrder: ['copy', 'paste', 'delete', 'archive'],
      disabledValues: ['paste'],
      itemLabels: {
        copy: 'Copy',
        paste: 'Paste',
        delete: 'Delete',
        archive: 'Archive',
      },
      onSelect: ({ value }) => selectedValues.push(value),
    }).start()

    svc.send({ type: 'OPEN_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'NAVIGATE_DOWN' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('delete')

    svc.send({ type: 'NAVIGATE_DOWN' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('archive')

    svc.send({ type: 'NAVIGATE_DOWN' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'NAVIGATE_UP' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('archive')

    svc.send({ type: 'NAVIGATE_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'NAVIGATE_LAST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('archive')

    svc.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(svc.getSnapshot().value).toBe('closed')
    expect(selectedValues).toEqual(['archive'])
    svc.stop()
  })

  it('menu typeahead highlights enabled items by label and resets on dismiss', () => {
    const svc = interpret(menuMachine, {
      itemOrder: ['copy', 'paste', 'preferences', 'delete'],
      disabledValues: ['paste'],
      itemLabels: {
        copy: 'Copy',
        paste: 'Paste',
        preferences: 'Preferences',
        delete: 'Delete',
      },
    }).start()

    svc.send({ type: 'OPEN_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'TYPEAHEAD', key: 'p', now: 100 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('preferences')

    svc.send({ type: 'TYPEAHEAD', key: 'd', now: 1000 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('delete')

    svc.send({ type: 'DISMISS' })
    expect(svc.getSnapshot().value).toBe('closed')
    expect(svc.getSnapshot().context.highlightedValue).toBeNull()
    expect(svc.getSnapshot().context.typeaheadQuery).toBe('')
    svc.stop()
  })

  it('menu typeahead keeps value fallback when label metadata is absent', () => {
    const svc = interpret(menuMachine, {
      itemOrder: ['copy', 'custom-action'],
      disabledValues: [],
    }).start()

    svc.send({ type: 'OPEN' })
    svc.send({ type: 'TYPEAHEAD', key: 'c', now: 100 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'TYPEAHEAD', key: 'c', now: 1000 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('custom-action')
    svc.stop()
  })

  it('select highlights enabled options in order and clears highlight on escape', () => {
    const svc = interpret(selectMachine, {
      optionOrder: ['alpha', 'beta', 'gamma', 'delta'],
      disabledValues: ['beta'],
    }).start()

    svc.send({ type: 'OPEN_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('alpha')

    svc.send({ type: 'HIGHLIGHT_NEXT' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('gamma')

    svc.send({ type: 'HIGHLIGHT_PREV' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('alpha')

    svc.send({ type: 'HIGHLIGHT_LAST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('delta')

    svc.send({ type: 'HIGHLIGHT_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('alpha')

    svc.send({ type: 'ESCAPE' })
    expect(svc.getSnapshot().value).toBe('closed')
    expect(svc.getSnapshot().context.highlightedValue).toBeNull()
    svc.stop()
  })

  it('select chooses highlighted values without closing multiselect', () => {
    const single = interpret(selectMachine, {
      optionOrder: ['alpha', 'beta', 'gamma'],
      disabledValues: ['beta'],
    }).start()

    single.send({ type: 'OPEN_FIRST' })
    single.send({ type: 'HIGHLIGHT_NEXT' })
    single.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(single.getSnapshot().value).toBe('closed')
    expect(single.getSnapshot().context.value).toBe('gamma')
    single.stop()

    const multi = interpret(selectMachine, {
      value: [],
      optionOrder: ['alpha', 'beta', 'gamma'],
      disabledValues: ['beta'],
    }).start()

    multi.send({ type: 'OPEN_FIRST' })
    multi.send({ type: 'HIGHLIGHT_NEXT' })
    multi.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(multi.getSnapshot().value).toBe('open')
    expect(multi.getSnapshot().context.value).toEqual(['gamma'])

    multi.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(multi.getSnapshot().value).toBe('open')
    expect(multi.getSnapshot().context.value).toEqual([])
    multi.stop()
  })
})
