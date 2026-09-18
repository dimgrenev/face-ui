import { describe, expect, it, vi } from 'vitest'
import {
  normalizeISOValue,
  parseDateLike,
  formatTriggerValue,
  toExternalValue,
} from '../runtime/date-utils'
import { interpret } from '../create-machine'
import { dateMachine } from '../machines/date.machine'

describe('Date value integrity', () => {
  it('rejects impossible dates and retains explicit offsets', () => {
    expect(parseDateLike('2026-02-30')).toBeNull()
    expect(parseDateLike('2026-02-30T12:00Z')).toBeNull()
    expect(parseDateLike('2026-09-11T15:30+03:00')?.toISOString()).toBe(
      '2026-09-11T12:30:00.000Z',
    )
    expect(normalizeISOValue('2026-09-11T23:30Z', 'Asia/Tokyo')).toBe(
      '2026-09-12T08:30',
    )
    expect(normalizeISOValue('2026-09-11', 'America/New_York')).toBe(
      '2026-09-11',
    )
  })
  it('converts civil time into an instant with explicit DST disambiguation', () => {
    expect(
      (
        toExternalValue('2026-03-08T02:30', 'date', 'America/New_York') as Date
      ).toISOString(),
    ).toBe('2026-03-08T07:30:00.000Z')
    expect(
      (
        toExternalValue('2026-11-01T01:30', 'date', 'America/New_York') as Date
      ).toISOString(),
    ).toBe('2026-11-01T05:30:00.000Z')
    expect(
      formatTriggerValue('2026-09-11', {
        mode: 'date',
        selection: 'single',
        timezone: 'America/Los_Angeles',
        locale: 'en-US',
        placeholder: '',
        format: 'yyyy-MM-dd',
      }),
    ).toBe('2026-09-11')
  })
  it('selects, closes and opens again without divergent state; rejects disabled presets', () => {
    const change = vi.fn()
    const service = interpret(dateMachine, {
      disabledDates: ['2026-09-15'],
      onValueChange: change,
    }).start()
    service.send('OPEN')
    service.send({ type: 'APPLY_PRESET', value: '2026-09-15' })
    expect(change).not.toHaveBeenCalled()
    expect(service.getSnapshot().context.open).toBe(true)
    service.send({ type: 'SELECT_DAY', date: '2026-09-16' })
    expect(service.getSnapshot().value).toBe('closed')
    expect(service.getSnapshot().context.open).toBe(false)
    service.send('TOGGLE')
    expect(service.getSnapshot().value).toBe('open')
    service.stop()
  })
  it('constrains month navigation without changing selection and accepts a normalized reverse range', () => {
    const service = interpret(dateMachine, {
      value: '2026-01-31',
      min: '2026-02-15',
      max: '2026-03-20',
    }).start()
    service.send('OPEN')
    service.send({ type: 'SELECT_MONTH', month: 2 })
    expect(service.getSnapshot().context.viewDate).toBe('2026-02-01')
    expect(service.getSnapshot().context.value).toBe('2026-01-31')
    service.send({ type: 'SELECT_MONTH', month: 3 })
    expect(service.getSnapshot().context.viewDate).toBe('2026-03-01')
    expect(service.getSnapshot().context.value).toBe('2026-01-31')
    service.send({ type: 'SELECT_MONTH', month: 4 })
    expect(service.getSnapshot().context.viewDate).toBe('2026-03-01')
    expect(service.getSnapshot().context.value).toBe('2026-01-31')
    service.syncContext({ selection: 'range', min: null, max: null })
    service.send({
      type: 'SELECT_RANGE',
      value: { start: '2026-09-08', end: '2026-09-11' },
    })
    expect(service.getSnapshot().context.value).toEqual({
      start: '2026-09-08',
      end: '2026-09-11',
    })
    expect(service.getSnapshot().value).toBe('closed')
    service.stop()
  })
})
