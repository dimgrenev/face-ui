import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import { idList } from '../internal/field'
import { stylesDir } from './harness/css'
import { describeField } from './harness/field'
import { FieldProbe, type FieldProbeProps } from './harness/field-probe'
import { libraryCss, mount } from './harness/index'
import { Text } from '../../Text/Text'

describeField('Field (input)', (props) => <FieldProbe {...props} />)
describeField('Field (group)', (props) => <FieldProbe group {...props} />)

async function show(props: FieldProbeProps) {
  const view = mount()
  await act(async () => view.root.render(<FieldProbe {...props} />))
  const root = view.host.querySelector('.uf-field')!
  const part = (slot: string) =>
    root.querySelector(`[data-scope="field"][data-part="${slot}"]`)
  return { root, part, view }
}

describe('Field', () => {
  it('renders field copy, fragment leaves, required marker and native errors through Text', async () => {
    const { root, part } = await show({
      label: <Fragment>{'Mail '}<Text as="span" inset="none" membrane={false}>address</Text></Fragment>,
      description: ['Use ', <Fragment key="description">{'work mail'}</Fragment>],
      nativeError: 'Fill out this field.',
      required: true,
    })
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const leaf = walker.currentNode
      if (leaf.textContent?.trim()) expect(leaf.parentElement?.closest('.uf-text'), leaf.textContent).not.toBeNull()
    }
    expect(part('label')?.textContent).toBe('Mail address*')
    expect(part('description')?.textContent).toBe('Use work mail')
    expect(part('error')?.textContent).toBe('Fill out this field.')
    expect(root.querySelector('.uf-text .uf-text')).toBeNull()
    expect(root.querySelector('.uf-text[data-membrane]')).toBeNull()
  })

  it('idList keeps order and drops empties and repeats', () => {
    expect(idList('a  b', undefined, '', 'b c', ' a ')).toBe('a b c')
    expect(idList(undefined, ' ', '')).toBeUndefined()
  })

  it('a labelable control gets <label for>; a group root gets a <span> label', async () => {
    const input = await show({ id: 'plan', label: 'Plan' })
    const inputLabel = input.part('label') as HTMLLabelElement
    expect(inputLabel.localName).toBe('label')
    expect(inputLabel.htmlFor).toBe('plan')
    expect(inputLabel.className).toBe('uf-field__label')
    expect(input.root.querySelector('input')!.id).toBe('plan')
    const group = await show({ id: 'plan-group', label: 'Plan', group: true })
    expect(group.part('label')!.localName).toBe('span')
    expect(group.root.id).toBe('plan-group')
    expect(group.root.getAttribute('aria-labelledby')).toBe('plan-group-label')
  })

  it('nativeError fills the error slot only while error is empty', async () => {
    const { part, root, view } = await show({
      id: 'mail',
      label: 'Mail',
      nativeError: 'Fill out this field.',
    })
    const control = root.querySelector('input')!
    expect(part('error')!.textContent).toBe('Fill out this field.')
    expect(part('error')!.className).toBe('uf-field__error')
    expect(control.getAttribute('aria-describedby')).toBe('mail-error')
    expect(control.getAttribute('aria-invalid')).toBe('true')
    const render = (props: FieldProbeProps) =>
      act(async () =>
        view.root.render(<FieldProbe id="mail" label="Mail" {...props} />),
      )
    await render({ error: 'Use your work address', nativeError: 'Fill out this field.' })
    expect(part('error')!.textContent).toBe('Use your work address')
    for (const nativeError of [null, '', '  ']) {
      await render({ nativeError })
      expect(part('error')).toBeNull()
      expect(control.hasAttribute('aria-invalid')).toBe(false)
      expect(root.hasAttribute('data-invalid')).toBe(false)
    }
  })

  it('labelPosition other than start lays out as top, without a report', async () => {
    const { root } = await show({
      label: 'Plan',
      labelPosition: 'side' as unknown as 'top',
    })
    expect(root.getAttribute('data-label-position')).toBe('top')
  })

  it('field.css styles only .uf-field and its parts, and ships in the library', () => {
    const css = readFileSync(join(stylesDir, 'components/field.css'), 'utf8')
    const selectors = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .flatMap((block) => (block.includes('{') ? block.split('{')[0].split(',') : []))
      .map((selector) => selector.trim())
    expect(selectors.length).toBeGreaterThan(0)
    expect(selectors.filter((selector) => !selector.startsWith('.uf-field'))).toEqual([])
    expect(libraryCss()).toContain('.uf-field[data-label-position="start"]')
  })
})
