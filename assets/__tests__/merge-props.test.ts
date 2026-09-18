import { describe, expect, it, vi } from 'vitest'
import { composeHandlers, mergeProps } from '../adapters/react/merge-props'

const event = () => ({
  defaultPrevented: false,
  preventDefault() {
    this.defaultPrevented = true
  },
})

describe('composeHandlers', () => {
  it('runs the consumer before the built-in handler', () => {
    const order: string[] = []
    const handler = composeHandlers(
      () => order.push('consumer'),
      () => order.push('internal'),
    )
    handler(event())
    expect(order).toEqual(['consumer', 'internal'])
  })

  it("skips the built-in handler when the consumer prevents the event's default", () => {
    const internal = vi.fn()
    const prevent = (e: ReturnType<typeof event>) => e.preventDefault()
    composeHandlers(prevent, internal)(event())
    expect(internal).not.toHaveBeenCalled()
  })

  it('is the built-in handler itself without a consumer', () => {
    const internal = vi.fn()
    expect(composeHandlers(undefined, internal)).toBe(internal)
  })
})

describe('mergeProps', () => {
  it('chains handlers until one prevents the default, joins classes, merges styles', () => {
    const later = vi.fn()
    const prevent = (e: ReturnType<typeof event>) => e.preventDefault()
    const merged = mergeProps<Record<string, unknown>>(
      { id: 'x', className: 'a', style: { color: 'red' }, onClick: prevent },
      { id: undefined, className: 'b', style: { margin: 0 }, onClick: later },
    )
    ;(merged.onClick as typeof prevent)(event())
    expect(later).not.toHaveBeenCalled()
    expect(merged).toMatchObject({
      id: 'x',
      className: 'a b',
      style: { color: 'red', margin: 0 },
    })
  })
})
