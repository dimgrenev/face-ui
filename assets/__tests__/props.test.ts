import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { invalidProp, readCssSize, readNumber, resetInvalidPropReports } from '../runtime/props'

let errors: MockInstance<typeof console.error>
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errors.mockRestore()
  vi.unstubAllEnvs()
})
const reports = () => errors.mock.calls.map(([message]) => message)

describe('invalidProp', () => {
  it.each([
    ['50', '"50"'],
    [NaN, 'NaN'],
    [Infinity, 'Infinity'],
    [null, 'null'],
    [false, 'false'],
    [[1], 'array'],
    [{ a: 1 }, 'object'],
    [() => 1, 'function'],
  ])('shows %o as %s', (value, shown) => {
    invalidProp('Pagination', 'total', value, 'using 0')
    expect(reports()).toEqual([`Face UI Pagination: invalid total ${shown}; using 0.`])
  })

  it('elides a long string instead of printing the whole value', () => {
    const source = `${'a'.repeat(60)}TAIL${'b'.repeat(5_000)}`
    invalidProp('Markdown', 'children', source, 'showing it as text')
    const [message] = reports() as [string]
    expect(message).toBe(`Face UI Markdown: invalid children "${'a'.repeat(60)}…"; showing it as text.`)
    expect(message.length).toBeLessThan(120)
    expect(message).not.toContain('TAIL')
    expect(message).not.toContain('b')
  })

  it('reads undefined as a missing prop', () => {
    invalidProp('Select', 'label', undefined, 'the combobox has no name')
    expect(reports()).toEqual(['Face UI Select: missing label; the combobox has no name.'])
  })

  it('reports each distinct message once until reset', () => {
    invalidProp('Rating', 'max', 0, 'using 1')
    invalidProp('Rating', 'max', 0, 'using 1')
    invalidProp('Rating', 'max', 11, 'using 10')
    expect(reports()).toHaveLength(2)
    resetInvalidPropReports()
    invalidProp('Rating', 'max', 0, 'using 1')
    expect(reports()).toHaveLength(3)
  })

  it('remembers a bounded number of messages', () => {
    for (let index = 0; index <= 500; index += 1)
      invalidProp('Slider', 'step', index, 'using 1')
    invalidProp('Slider', 'step', 0, 'using 1')
    expect(reports()).toHaveLength(502)
  })

  it('is silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    invalidProp('Pagination', 'total', '50', 'using 0')
    expect(readNumber('Pagination', 'total', '50', 0)).toBe(0)
    expect(errors).not.toHaveBeenCalled()
    vi.stubEnv('NODE_ENV', 'development')
    invalidProp('Pagination', 'total', '50', 'using 0')
    expect(errors).toHaveBeenCalledTimes(1)
  })

  it('compiles for consumers without @types/node (types: [])', () => {
    const file = fileURLToPath(new URL('../runtime/props.ts', import.meta.url))
    const program = ts.createProgram([file], {
      noEmit: true,
      strict: true,
      types: [],
      lib: ['lib.es2017.d.ts', 'lib.dom.d.ts'],
    })
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map(({ messageText }) => ts.flattenDiagnosticMessageText(messageText, '\n'))
    expect(diagnostics).toEqual([])
  })
})

describe('readNumber', () => {
  it('passes finite numbers inside the range through silently', () => {
    expect(readNumber('Rating', 'max', 7, 5, { integer: true, min: 1, max: 10 })).toBe(7)
    expect(readNumber('Slider', 'step', 0.25, 1, { min: 0 })).toBe(0.25)
    expect(readNumber('Rating', 'max', undefined, 5, { min: 1 })).toBe(5)
    expect(errors).not.toHaveBeenCalled()
  })

  it('clamps into the range and truncates integers toward zero', () => {
    const rating = (value: number) =>
      readNumber('Rating', 'max', value, 5, { integer: true, min: 1, max: 10 })
    expect([0, 11, 1.5, 9.99, -3.7].map(rating)).toEqual([1, 10, 1, 9, 1])
    expect(readNumber('Steps', 'step', -2.7, 0, { integer: true })).toBe(-2)
    expect(reports()).toEqual([
      'Face UI Rating: invalid max 0; using 1.',
      'Face UI Rating: invalid max 11; using 10.',
      'Face UI Rating: invalid max 1.5; using 1.',
      'Face UI Rating: invalid max 9.99; using 9.',
      'Face UI Rating: invalid max -3.7; using 1.',
      'Face UI Steps: invalid step -2.7; using -2.',
    ])
  })

  it('keeps integer domains inside the safe integers', () => {
    const big = Number.MAX_SAFE_INTEGER + 2
    expect(readNumber('Steps', 'step', big, 0, { integer: true })).toBe(Number.MAX_SAFE_INTEGER)
    expect(readNumber('Steps', 'step', -big, 0, { integer: true })).toBe(-Number.MAX_SAFE_INTEGER)
    expect(readNumber('Slider', 'value', big, 0)).toBe(big)
  })

  it('replaces non-numbers with the fallback and never coerces', () => {
    const valueOf = vi.fn(() => 4)
    const values = [NaN, -Infinity, '50', null, true, { valueOf }]
    expect(values.map((value) => readNumber('Pagination', 'total', value, 0))).toEqual([
      0, 0, 0, 0, 0, 0,
    ])
    expect(valueOf).not.toHaveBeenCalled()
    expect(reports()).toEqual([
      'Face UI Pagination: invalid total NaN; using 0.',
      'Face UI Pagination: invalid total -Infinity; using 0.',
      'Face UI Pagination: invalid total "50"; using 0.',
      'Face UI Pagination: invalid total null; using 0.',
      'Face UI Pagination: invalid total true; using 0.',
      'Face UI Pagination: invalid total object; using 0.',
    ])
  })
})

describe('readCssSize', () => {
  it('keeps CSS lengths and normalizes unitless numeric strings to pixels', () => {
    expect(readCssSize('Media', 'width', 50)).toBe('50px')
    expect(readCssSize('Media', 'width', ' 50 ')).toBe('50px')
    expect(readCssSize('Media', 'width', '2.5rem')).toBe('2.5rem')
    expect(readCssSize('Media', 'width', 'calc(100% - 1rem)')).toBe('calc(100% - 1rem)')
    expect(readCssSize('Media', 'width', '')).toBeUndefined()
    expect(reports()).toEqual(['Face UI Media: invalid width " 50 "; using 50px.'])
  })

  it('rejects negative and nonfinite values without passing them to CSS', () => {
    expect(readCssSize('Scroll', 'height', -5)).toBeUndefined()
    expect(readCssSize('Scroll', 'height', '-5px')).toBeUndefined()
    expect(readCssSize('Scroll', 'height', Infinity)).toBeUndefined()
    expect(reports()).toEqual([
      'Face UI Scroll: invalid height -5; ignoring it: expected a nonnegative CSS length.',
      'Face UI Scroll: invalid height "-5px"; ignoring it: expected a nonnegative CSS length.',
      'Face UI Scroll: invalid height Infinity; ignoring it: expected a nonnegative CSS length.',
    ])
  })
})
