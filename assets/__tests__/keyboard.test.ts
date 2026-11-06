// @vitest-environment jsdom
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  keyToMove,
  readDirection,
  stepIntent,
  type Direction,
  type KeyLike,
  type Orientation,
} from '../runtime/keyboard'

const arrows = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'] as const
const blocked: [string, Omit<KeyLike, 'key'>][] = [
  ['Alt', { altKey: true }],
  ['Ctrl', { ctrlKey: true }],
  ['Meta', { metaKey: true }],
  ['native IME composition', { isComposing: true }],
  ['React IME composition', { nativeEvent: { isComposing: true } }],
  ['Safari IME keyCode 229', { keyCode: 229 }],
]

describe('readDirection', () => {
  const html = (markup: string) => {
    document.body.innerHTML = markup
    return (id: string) => document.getElementById(id)
  }

  it('reads ltr without a node or any direction', () => {
    expect(readDirection(null)).toBe('ltr')
    expect(readDirection(undefined)).toBe('ltr')
    expect(readDirection(html('<p id="p"></p>')('p'))).toBe('ltr')
  })

  it('follows the closest dir where no direction is computed', () => {
    const get = html(
      '<div dir="rtl" id="rtl"><span id="inner"></span><div dir="ltr"><b id="back"></b></div></div><div dir="RTL"><i id="upper"></i></div>',
    )
    expect(readDirection(get('rtl'))).toBe('rtl')
    expect(readDirection(get('inner'))).toBe('rtl')
    expect(readDirection(get('back'))).toBe('ltr')
    expect(readDirection(get('upper'))).toBe('rtl')
  })

  it('prefers the computed direction over the dir attribute', () => {
    const get = html('<div dir="ltr" id="styled" style="direction: rtl"></div>')
    expect(readDirection(get('styled'))).toBe('rtl')
  })

  it('reads at call time', () => {
    const get = html('<div id="host"><button id="button"></button></div>')
    expect(readDirection(get('button'))).toBe('ltr')
    get('host')!.dir = 'rtl'
    expect(readDirection(get('button'))).toBe('rtl')
  })

  it('works in a document without a window', () => {
    const doc = document.implementation.createHTMLDocument()
    doc.body.innerHTML = '<div dir="rtl"><span></span></div>'
    expect(readDirection(doc.querySelector('span'))).toBe('rtl')
  })
})

describe('keyToMove', () => {
  const table: [Orientation, Direction, (string | null)[]][] = [
    ['horizontal', 'ltr', ['next', 'prev', null, null, 'first', 'last']],
    ['horizontal', 'rtl', ['prev', 'next', null, null, 'first', 'last']],
    ['vertical', 'ltr', [null, null, 'next', 'prev', 'first', 'last']],
    ['vertical', 'rtl', [null, null, 'next', 'prev', 'first', 'last']],
    ['both', 'ltr', ['next', 'prev', 'next', 'prev', 'first', 'last']],
    ['both', 'rtl', ['prev', 'next', 'next', 'prev', 'first', 'last']],
  ]

  it.each(table)('%s %s maps Right, Left, Down, Up, Home, End', (orientation, dir, expected) => {
    expect(arrows.map((key) => keyToMove({ key }, orientation, dir))).toEqual(expected)
    // Shift is not a shortcut: Shift+Arrow still moves (range selection).
    expect(arrows.map((key) => keyToMove({ key, shiftKey: true } as KeyLike, orientation, dir))).toEqual(expected)
  })

  it.each(blocked)('ignores every key with %s', (_, modifiers) => {
    for (const orientation of ['horizontal', 'vertical', 'both'] as const)
      for (const dir of ['ltr', 'rtl'] as const)
        for (const key of arrows) expect(keyToMove({ key, ...modifiers }, orientation, dir)).toBeNull()
  })

  it('ignores keys that are not moves', () => {
    for (const key of ['a', ' ', 'Enter', 'Tab', 'Escape', 'PageUp', 'PageDown'])
      expect(keyToMove({ key }, 'both', 'ltr')).toBeNull()
  })

  it('reads native and React keyboard events', () => {
    expect(keyToMove(new KeyboardEvent('keydown', { key: 'ArrowLeft' }), 'horizontal', 'rtl')).toBe('next')
    expect(keyToMove(new KeyboardEvent('keydown', { key: 'ArrowLeft', isComposing: true }), 'horizontal', 'rtl')).toBeNull()
    expectTypeOf<KeyboardEvent>().toExtend<KeyLike>()
    expectTypeOf<ReactKeyboardEvent<HTMLElement>>().toExtend<KeyLike>()
  })
})

describe('stepIntent', () => {
  const steps = (orientation: 'horizontal' | 'vertical', dir: Direction) =>
    ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].map((key) =>
      stepIntent({ key }, orientation, dir),
    )

  it.each([
    ['horizontal', 'ltr', 1],
    ['horizontal', 'rtl', -1],
    ['vertical', 'ltr', 1],
    ['vertical', 'rtl', 1],
  ] as const)('%s %s: Right steps %i, Up increases, pages are ten steps, Home/End reach the bounds', (orientation, dir, right) => {
    expect(steps(orientation, dir)).toEqual([
      { step: right },
      { step: -right },
      { step: 1 },
      { step: -1 },
      { step: 10 },
      { step: -10 },
      { to: 'min' },
      { to: 'max' },
    ])
  })

  it.each(blocked)('ignores every key with %s', (_, modifiers) => {
    for (const key of [...arrows, 'PageUp', 'PageDown']) {
      expect(stepIntent({ key, ...modifiers }, 'horizontal', 'ltr')).toBeNull()
      expect(stepIntent({ key, ...modifiers }, 'vertical', 'rtl')).toBeNull()
    }
  })

  it('ignores other keys', () => {
    for (const key of ['a', ' ', 'Enter', 'Tab']) expect(stepIntent({ key }, 'horizontal', 'ltr')).toBeNull()
  })
})
