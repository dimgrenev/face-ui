import { act, StrictMode, type ReactElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FieldOptions } from '../../internal/field'
import { hydrate, mount, type View } from './index'

/** The props describeField renders a field with: Field's own and the naming attributes it forwards. */
export type FieldTestProps = Pick<
  FieldOptions,
  | 'label'
  | 'description'
  | 'error'
  | 'labelPosition'
  | 'id'
  | 'required'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
>

/** Roles aria-invalid is allowed on (RFC §4); searchbox and spinbutton are textbox kinds. */
const INVALID_ROLES = new Set([
  'textbox',
  'searchbox',
  'spinbutton',
  'combobox',
  'radiogroup',
  'slider',
])
const INPUT_ROLES: Record<string, string> = {
  search: 'searchbox',
  number: 'spinbutton',
  range: 'slider',
  radio: 'radio',
  checkbox: 'checkbox',
  button: 'button',
  submit: 'button',
  reset: 'button',
}
function roleOf(element: Element) {
  const explicit = element.getAttribute('role')
  if (explicit) return explicit
  if (element instanceof HTMLInputElement)
    return INPUT_ROLES[element.type] ?? 'textbox'
  if (element instanceof HTMLTextAreaElement) return 'textbox'
  if (element instanceof HTMLSelectElement)
    return element.multiple ? 'listbox' : 'combobox'
  return element.localName === 'button' ? 'button' : null
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
/** Text content without aria-hidden subtrees, as accessible names are computed. */
const textOf = (node: Node): string =>
  node instanceof Element
    ? node.getAttribute('aria-hidden') === 'true'
      ? ''
      : Array.from(node.childNodes, textOf).join('')
    : (node.textContent ?? '')
const tokens = (element: Element, attribute: string) =>
  (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)
const referenced = (element: Element, attribute: string) =>
  squash(
    tokens(element, attribute)
      .map((id) => {
        const target = document.getElementById(id)
        return target ? textOf(target) : ''
      })
      .join(' '),
  )
/** Accessible name from the sources a field uses: aria-labelledby, aria-label, then `<label>`. */
function nameOf(element: Element) {
  if (element.hasAttribute('aria-labelledby'))
    return referenced(element, 'aria-labelledby')
  const label = element.getAttribute('aria-label')?.trim()
  if (label) return label
  const labels = (element as HTMLInputElement).labels ?? []
  return squash(Array.from(labels, textOf).join(' '))
}

const FOCUSABLE = 'input, select, textarea, button, [tabindex]'
/** Elements a user can reach inside `root` (itself included), without hidden form proxies. */
const focusables = (root: Element) =>
  [root, ...root.querySelectorAll(FOCUSABLE)].filter(
    (element) =>
      element.matches(FOCUSABLE) &&
      (element as HTMLInputElement).type !== 'hidden' &&
      !element.closest('[hidden], [aria-hidden="true"]'),
  )

const EMPTY = ['', '   ', null, false, <></>, []] as const
/** The same elements in the same order: identity, not structural equality. */
function expectSame(actual: readonly Element[], expected: readonly Element[]) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((element, index) => expect(element).toBe(expected[index]))
}

/**
 * The Field contract (RFC §4) of one field component: name and its priority,
 * derived ids, the required marker, describedby order, where aria-invalid
 * goes, empty slots, stable control identity, and SSR hydration.
 * `render` spreads the props onto the component; it must forward `id`.
 */
export function describeField(
  name: string,
  render: (props: FieldTestProps) => ReactElement,
) {
  describe(`${name}: Field contract`, () => {
    let view: View
    beforeEach(() => {
      view = mount()
    })
    const show = (props: FieldTestProps) =>
      act(async () =>
        view.root.render(
          <StrictMode>
            <span id="outside-name">Outside name</span>
            <span id="outside-help">Outside help</span>
            {render(props)}
          </StrictMode>,
        ),
      )
    const root = () => {
      const roots = view.host.querySelectorAll('.uf-field')
      expect(roots).toHaveLength(1)
      return roots[0]
    }
    const part = (slot: string) =>
      root().querySelector(`[data-scope="field"][data-part="${slot}"]`)
    const parts = () =>
      root().querySelectorAll('[data-scope="field"][data-part]')
    /** Renders a labelled field and returns the one element the label names. */
    async function named(props: FieldTestProps = {}) {
      await show({ label: 'Name', ...props })
      const label = part('label')!
      const candidates = [root(), ...root().querySelectorAll('[aria-labelledby]')]
      const owners = candidates.filter((element) =>
        tokens(element, 'aria-labelledby').includes(label.id),
      )
      expect(owners, 'exactly one element is named by the label').toHaveLength(1)
      return owners[0]
    }
    /** The value element and every focusable one, each once. */
    const described = (element: Element) => [
      ...new Set([element, ...focusables(root())]),
    ]

    it('the visible label names the value element; aria-label, then aria-labelledby, win', async () => {
      const element = await named()
      const label = part('label')!
      expect(nameOf(element)).toBe('Name')
      if (label.localName === 'label')
        expect((label as HTMLLabelElement).htmlFor).toBe(element.id)
      else expect(label.localName).toBe('span')
      await show({ label: 'Name', 'aria-label': 'Direct' })
      expect(nameOf(element)).toBe('Direct')
      expect(part('label')).toHaveProperty('textContent', 'Name')
      await show({
        label: 'Name',
        'aria-label': 'Direct',
        'aria-labelledby': 'outside-name',
      })
      expect(nameOf(element)).toBe('Outside name')
      await show({ 'aria-label': 'Direct' })
      expect(part('label')).toBeNull()
      expect(nameOf(element)).toBe('Direct')
      await show({ label: 'Name', 'aria-label': '  ' })
      expect(nameOf(element)).toBe('Name')
    })

    it('part ids derive from id', async () => {
      const element = await named({
        id: 'probe',
        description: 'Help',
        error: 'Wrong',
      })
      expect(element.id).toBe('probe')
      expect(part('label')!.id).toBe('probe-label')
      expect(part('description')!.id).toBe('probe-description')
      expect(part('error')!.id).toBe('probe-error')
    })

    it('required adds an aria-hidden marker to the label, outside the name', async () => {
      const element = await named({ required: true })
      const marker = part('required')!
      expect(part('label')!.contains(marker)).toBe(true)
      expect(marker.getAttribute('aria-hidden')).toBe('true')
      expect(marker.textContent).toBe('*')
      expect(nameOf(element)).toBe('Name')
      await show({ label: 'Name' })
      expect(part('required')).toBeNull()
      await show({ 'aria-label': 'Direct', required: true })
      expect(part('required')).toBeNull()
    })

    it('describedby lists consumer ids, description, error, once each, on the root and every focusable', async () => {
      const element = await named({ id: 'probe' })
      await show({
        label: 'Name',
        id: 'probe',
        'aria-describedby': 'outside-help probe-description outside-help',
        description: 'Help',
        error: 'Wrong',
      })
      const targets = described(element)
      for (const target of targets) {
        expect(tokens(target, 'aria-describedby')).toEqual([
          'outside-help',
          'probe-description',
          'probe-error',
        ])
        expect(referenced(target, 'aria-describedby')).toBe(
          'Outside help Help Wrong',
        )
      }
      await show({ label: 'Name', id: 'probe' })
      for (const target of targets)
        expect(target.hasAttribute('aria-describedby')).toBe(false)
    })

    it('aria-invalid marks only roles that support it; explicit aria-invalid wins over error', async () => {
      const element = await named()
      const supported = described(element).filter((target) =>
        INVALID_ROLES.has(roleOf(target) ?? ''),
      )
      const marked = () =>
        [root(), ...root().querySelectorAll('[aria-invalid]')].filter(
          (target) => target.hasAttribute('aria-invalid'),
        )
      expectSame(marked(), [])
      expect(root().hasAttribute('data-invalid')).toBe(false)
      for (const props of [{ error: 'Wrong' }, { 'aria-invalid': true }] as const) {
        await show({ label: 'Name', ...props })
        expectSame(marked(), supported)
        for (const target of supported)
          expect(target.getAttribute('aria-invalid')).toBe('true')
        expect(root().hasAttribute('data-invalid')).toBe(true)
      }
      await show({ label: 'Name', error: 'Wrong', 'aria-invalid': false })
      expectSame(
        marked().filter((target) => target.getAttribute('aria-invalid') !== 'false'),
        [],
      )
      expect(root().hasAttribute('data-invalid')).toBe(false)
      expect(part('error')!.textContent).toBe('Wrong')
      // The error is described, never announced: no live region, no alert.
      const error = part('error')!
      expect(error.closest('[role="alert"], [aria-live]')).toBeNull()
      expect(error.querySelector('[role="alert"], [aria-live]')).toBeNull()
    })

    it('empty slots render nothing and reference nothing; 0 renders', async () => {
      const element = await named({ description: 'Help', error: 'Wrong' })
      for (const empty of EMPTY) {
        await show({
          label: empty,
          description: empty,
          error: empty,
          'aria-label': 'Direct',
        })
        expect(parts()).toHaveLength(0)
        expect(element.hasAttribute('aria-labelledby')).toBe(false)
        for (const target of described(element))
          expect(target.hasAttribute('aria-describedby')).toBe(false)
        expect(nameOf(element)).toBe('Direct')
      }
      await show({ label: 0, description: 0, error: 0 })
      expect(part('label')!.textContent).toBe('0')
      expect(part('description')!.textContent).toBe('0')
      expect(part('error')!.textContent).toBe('0')
      expect(nameOf(element)).toBe('0')
      expect(referenced(element, 'aria-describedby')).toBe('0 0')
    })

    it('labelPosition sets the root layout, top by default', async () => {
      await named()
      expect(root().getAttribute('data-label-position')).toBe('top')
      await show({ label: 'Name', labelPosition: 'start' })
      expect(root().getAttribute('data-label-position')).toBe('start')
    })

    it('changing label, description or error keeps the control and its focus', async () => {
      const element = await named()
      const before = described(element)
      const focus = before.find((target) => target !== root()) ?? element
      ;(focus as HTMLElement).focus()
      for (const props of [
        { label: 'Other', description: 'Help', error: 'Wrong' },
        { description: 'Help' },
        { label: 'Name', error: 'Wrong', required: true },
        { label: 'Name' },
      ] satisfies FieldTestProps[]) {
        await show(props)
        expectSame(described(element), before)
        expect(document.activeElement).toBe(focus)
      }
    })

    it('server markup hydrates without a mismatch', async () => {
      const host = document.body.appendChild(document.createElement('div'))
      const { recoverableErrors } = await hydrate(
        <StrictMode>
          {render({
            label: 'Name',
            description: 'Help',
            error: 'Wrong',
            required: true,
          })}
        </StrictMode>,
        host,
      )
      expect(recoverableErrors).toEqual([])
      const label = host.querySelector('[data-scope="field"][data-part="label"]')!
      const owners = [host, ...host.querySelectorAll('[aria-labelledby]')].filter(
        (element) => tokens(element, 'aria-labelledby').includes(label.id),
      )
      expect(owners).toHaveLength(1)
      expect(referenced(owners[0], 'aria-describedby')).toBe('Help Wrong')
    })
  })
}
