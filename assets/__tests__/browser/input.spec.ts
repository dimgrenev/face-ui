import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/input.fixture'
import type { InputType } from '../../../Input/Input'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { renderInput } = hooks<Hooks>()
async function render(
  page: Page,
  props: Parameters<typeof renderInput>[1] = {},
  controlled = false,
  key = 'field',
) {
  await renderInput(page, props, controlled, key)
  await expect(page.locator('.uf-input')).toBeAttached()
}
const errors = new WeakMap<Page, string[]>()
test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([])
})
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  await open(page, 'input')
})
for (const fallback of [false, true]) {
  test(`multiline sizing follows rows, edits, clear, width and reset (${fallback ? 'fallback' : 'native'})`, { tag: ['@layout', '@css', '@native'] }, async ({
    page,
  }) => {
    if (fallback)
      await page.evaluate(() => {
        const supports = CSS.supports.bind(CSS)
        CSS.supports = ((...args: string[]) =>
          args[0] === 'field-sizing'
            ? false
            : (supports as any)(...args)) as typeof CSS.supports
      })
    const props = {
      multiline: true,
      rows: 3,
      defaultValue: 'Initial',
      labels: { clear: 'Очистить' },
    }
    await render(page, props)
    const field = page.getByRole('textbox', { name: 'Field', exact: true })
    const height = () =>
      field.evaluate((node) => node.getBoundingClientRect().height)
    const minimum = await height()
    const line = await field.evaluate((node) =>
      parseFloat(getComputedStyle(node).lineHeight),
    )
    expect(minimum).toBeGreaterThanOrEqual(line * 3)
    const long = Array.from({ length: 12 }, (_, i) => `Line ${i}`).join('\n')
    await field.fill(long)
    await expect.poll(height).toBeGreaterThan(minimum * 2)
    await page.getByRole('button', { name: 'Очистить' }).click()
    await expect(field).toHaveValue('')
    await expect.poll(height).toBeCloseTo(minimum, 0)
    await field.fill('Word '.repeat(70))
    const wide = await height()
    await page.locator('#fixture').evaluate((node) => {
      node.style.width = '210px'
    })
    await expect.poll(height).toBeGreaterThan(wide * 1.5)
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(field).toHaveValue('Initial')
    await expect.poll(height).toBeCloseTo(minimum, 0)
    await render(page, { ...props, autoGrow: false })
    await field.fill(long)
    await expect.poll(height).toBeCloseTo(minimum, 0)
    expect(
      await field.evaluate((node) => node.scrollHeight > node.clientHeight),
    ).toBe(true)
    await render(page, { ...props, rows: 5 })
    await expect.poll(height).toBeGreaterThan(minimum * 2)
    await field.fill('Short')
    await expect.poll(height).toBeGreaterThanOrEqual(line * 5)
    await field.evaluate((node) => {
      node
        .closest('.uf-input')!
        .setAttribute(
          'style',
          '--uf-control-font-size: 28px; line-height: 40px',
        )
    })
    if (fallback)
      await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await expect.poll(height).toBeGreaterThanOrEqual(200)
  })
}
for (const multiline of [false, true]) {
  test(`native editing, controlled clear, localization, reset and submit (${multiline})`, { tag: ['@native', '@focus'] }, async ({
    page,
  }) => {
    await render(
      page,
      { multiline, defaultValue: 'Initial', labels: { clear: 'Очистить' } },
      true,
    )
    const field = page.getByRole('textbox', { name: 'Field', exact: true })
    await field.fill('Updated')
    await page.getByRole('button', { name: 'Очистить' }).click()
    await expect(field).toHaveValue('')
    await expect(field).toBeFocused()
    // The native handler runs first, then the value notification.
    expect(await page.evaluate(() => (window as any).inputEvents)).toEqual([
      { type: 'change', value: 'Updated' },
      { type: 'value', value: 'Updated' },
      { type: 'change', value: '' },
      { type: 'value', value: '' },
    ])
    await field.fill('Sent')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    expect(
      await page.evaluate(() => (window as any).inputEvents.at(-1)),
    ).toEqual({ type: 'submit', value: 'Sent' })
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(field).toHaveValue('Sent')
    await render(
      page,
      {
        multiline,
        defaultValue: 'Start',
        required: true,
        maxLength: 5,
        clearable: false,
      },
      false,
      'new',
    )
    await field.fill('')
    expect(
      await field.evaluate(
        (node) => (node as HTMLInputElement).validity.valueMissing,
      ),
    ).toBe(true)
    await field.pressSequentially('abcdef')
    await expect(field).toHaveValue('abcde')
    await expect(page.locator('.uf-input__clear')).toBeHidden()
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(field).toHaveValue('Start')
  })
}
test('a start label, help and error share columns with and without membrane', { tag: ['@layout'] }, async ({
  page,
}) => {
  for (const membrane of [false, true])
    for (const dir of ['ltr', 'rtl']) {
      await render(page, {
        label: 'Account',
        description: 'Help',
        error: 'Error',
        labelPosition: 'start',
        membrane,
        dir,
      })
      const field = page.getByRole('textbox', { name: 'Account', exact: true })
      await expect(field).toHaveAccessibleDescription('Help Error')
      const label = (await page
        .locator('[data-scope="field"][data-part="label"]')
        .boundingBox())!
      const input = (await field.boundingBox())!,
        help = (await page.locator('.uf-field__description').boundingBox())!,
        error = (await page.locator('.uf-field__error').boundingBox())!
      expect(Math.abs(label.y - input.y)).toBeLessThan(10)
      const start = (box: { x: number; width: number }) =>
        dir === 'ltr' ? box.x : box.x + box.width
      expect(Math.abs(start(help) - start(input))).toBeLessThanOrEqual(2)
      expect(Math.abs(start(error) - start(input))).toBeLessThanOrEqual(2)
      expect(help.y).toBeGreaterThanOrEqual(input.y + input.height - 1)
      expect(
        dir === 'ltr' ? input.x - label.x : label.x - input.x,
      ).toBeGreaterThan(100)
    }
})
test('native direction auto places the trailing icon and clear next to the text direction', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, {
    dir: 'auto',
    icon: 'search',
    iconPosition: 'end',
    defaultValue: 'Hello',
  })
  const field = page.getByRole('textbox', { name: 'Field', exact: true })
  for (const [value, dir] of [
    ['Hello', 'ltr'],
    ['مرحبا', 'rtl'],
    ['Hello again', 'ltr'],
  ]) {
    await field.fill(value)
    await expect(field).toHaveCSS('direction', dir)
    await expect(page.locator('.uf-input__control')).toHaveCSS('direction', dir)
    const box = (await field.boundingBox())!,
      clear = (await page.locator('.uf-input__clear').boundingBox())!
    expect(
      dir === 'ltr' ? clear.x - box.x : box.x + box.width - clear.x,
    ).toBeGreaterThan(box.width / 2)
  }
})
for (const controlled of [false, true])
  test(`typing inside the text keeps the caret (${controlled ? 'controlled' : 'uncontrolled'})`, { tag: ['@native', '@focus'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: 'Hello world' }, controlled)
    const field = page.getByRole('textbox', { name: 'Field', exact: true })
    await field.focus()
    await field.evaluate((node: HTMLInputElement) => node.setSelectionRange(5, 5))
    await page.keyboard.type('XY')
    await expect(field).toHaveValue('HelloXY world')
    expect(
      await field.evaluate((node: HTMLInputElement) => [node.selectionStart, node.selectionEnd]),
    ).toEqual([7, 7])
  })
test('IME composition inside the text commits without losing the caret', { tag: ['@native'] }, async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'composition is driven through the Chrome DevTools Protocol')
  const cdp = await page.context().newCDPSession(page)
  for (const controlled of [false, true]) {
    await render(page, { defaultValue: 'ab' }, controlled, `ime-${controlled}`)
    const field = page.getByRole('textbox', { name: 'Field', exact: true })
    await field.focus()
    await field.evaluate((node: HTMLInputElement) => node.setSelectionRange(1, 1))
    await cdp.send('Input.imeSetComposition', { text: 'k', selectionStart: 1, selectionEnd: 1 })
    await cdp.send('Input.imeSetComposition', { text: 'か', selectionStart: 1, selectionEnd: 1 })
    await cdp.send('Input.insertText', { text: 'か' })
    await expect(field).toHaveValue('aかb')
    expect(
      await field.evaluate((node: HTMLInputElement) => [node.selectionStart, node.selectionEnd]),
    ).toEqual([2, 2])
    expect(
      await page.evaluate(() =>
        (window as any).inputEvents.filter((event: any) => event.type === 'value').at(-1),
      ),
    ).toEqual({ type: 'value', value: 'aかb' })
  }
})
test('native types and constraints are forwarded to the control', { tag: ['@native'] }, async ({
  page,
}) => {
  for (const [type, value] of Object.entries({
    text: 'abc',
    email: 'a@b.com',
    password: 'secret',
    search: 'query',
    tel: '+123',
    url: 'https://example.com',
    number: '6',
    date: '2026-09-11',
    time: '12:30',
    'datetime-local': '2026-09-11T12:30',
    month: '2026-09',
    week: '2026-W37',
  } satisfies Partial<Record<InputType, string>>) as [InputType, string][]) {
    await render(
      page,
      { type, defaultValue: value, autoComplete: 'off', inputMode: 'text' },
      false,
      type,
    )
    const field = page.locator('input')
    await expect(field).toHaveAttribute('type', type)
    await expect(field).toHaveValue(value)
    await expect(field).toHaveAttribute('autocomplete', 'off')
  }
  await render(
    page,
    { type: 'number', min: 2, max: 8, step: 2 },
    false,
    'numeric',
  )
  const field = page.locator('input')
  await field.fill('3')
  expect(
    await field.evaluate((n) => (n as HTMLInputElement).validity.stepMismatch),
  ).toBe(true)
  await field.fill('10')
  expect(
    await field.evaluate((n) => (n as HTMLInputElement).validity.rangeOverflow),
  ).toBe(true)
  await render(
    page,
    { type: 'text', pattern: '[A-Z]{3}', minLength: 3 },
    false,
    'pattern',
  )
  await field.fill('abc')
  expect(
    await field.evaluate(
      (n) => (n as HTMLInputElement).validity.patternMismatch,
    ),
  ).toBe(true)
})
test('autoFocus, hidden and native form association keep browser behavior', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  await render(page, { autoFocus: true, form: 'external', name: 'field' })
  const field = page.getByRole('textbox', { name: 'Field', exact: true })
  await expect(field).toBeFocused()
  await page.evaluate(() => {
    const form = document.createElement('form')
    form.id = 'external'
    document.body.append(form)
  })
  await field.fill('External')
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#external')!).get(
        'field',
      ),
    ),
  ).toBe('External')
  await render(page, { hidden: true })
  await expect(page.locator('.uf-input')).toBeHidden()
})
test('disabled and readOnly preserve their distinct native form and keyboard behavior', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  for (const multiline of [false, true]) {
    await render(
      page,
      { multiline, defaultValue: 'Saved', readOnly: true },
      false,
      `readonly-${multiline}`,
    )
    const field = page.getByRole('textbox', { name: 'Field', exact: true })
    await field.focus()
    await field.pressSequentially('Change')
    await expect(field).toHaveValue('Saved')
    await expect(field).toBeFocused()
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    expect(
      await page.evaluate(() => (window as any).inputEvents.at(-1)),
    ).toEqual({ type: 'submit', value: 'Saved' })
    await render(
      page,
      { multiline, defaultValue: 'Saved', disabled: true },
      false,
      `disabled-${multiline}`,
    )
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Reset', exact: true }),
    ).toBeFocused()
    expect(
      await page.evaluate(() =>
        new FormData(document.querySelector<HTMLFormElement>('#form')!).has(
          'field',
        ),
      ),
    ).toBe(false)
    await expect(page.locator('.uf-input__clear')).toBeHidden()
  }
})

test('server fields hydrate with stable labeling, values and multiline semantics', { tag: ['@hydration'] }, async ({page,request})=>{
 const response=await request.get('hydration')
 const html=await response.text()
 expect(html).toContain('Анна')
 expect(html).toContain('<textarea')
 await open(page, 'hydration')
 const name=page.getByRole('textbox',{name:'Server name',exact:true}), notes=page.getByRole('textbox',{name:'Server notes',exact:true})
 await expect(name).toHaveValue('Анна')
 await expect(name).toHaveAccessibleDescription('Public name')
 await expect(notes).toHaveValue('First line\nSecond line')
 await notes.fill('Updated\nNote')
 await expect(notes).toHaveValue('Updated\nNote')
 await name.fill('Мария')
 await expect(name).toHaveValue('Мария')
})
test('field names, descriptions and validation pass automated accessibility checks in both themes',{ tag: ['@css', '@a11y'] }, async({page})=>{
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')})
 for(const theme of ['light','dark']) for(const multiline of [false,true]) {
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  await render(page,{multiline,label:'Account',description:'Enter a value',error:'This value is required',required:true,icon:'search',defaultValue:'Value'})
  const violations=await page.evaluate(async()=> (await (window as any).axe.run(document.querySelector('.uf-input'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations)
  expect(violations).toEqual([])
 }
})

test('help and validation text align with control text in both label positions and directions',{ tag: ['@layout', '@css'] }, async({page})=>{
 for(const labelPosition of ['top','start'] as const) for(const dir of ['ltr','rtl']) for(const membrane of [false,true]) {
  await render(page,{label:'Account',description:'Help',error:'Error',labelPosition,dir,membrane})
  const offsets=await page.locator('.uf-input').evaluate(root=>{
   const control=root.querySelector('input')!, box=control.getBoundingClientRect(),style=getComputedStyle(control),rtl=style.direction==='rtl'
   const edge=rtl?box.right-parseFloat(style.paddingRight):box.left+parseFloat(style.paddingLeft)
   return ['.uf-field__description','.uf-field__error'].map(selector=>{
    const node=root.querySelector(selector)!,range=document.createRange();range.selectNodeContents(node)
    const text=range.getBoundingClientRect();return Math.abs((rtl?text.right:text.left)-edge)
   })
  })
  // The membrane pads the control, not the help below it.
  for(const offset of offsets)expect(offset).toBeLessThanOrEqual(membrane ? 1.5 : 0.5)
 }
})
