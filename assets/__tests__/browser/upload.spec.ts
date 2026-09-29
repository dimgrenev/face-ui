import { test, expect, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/upload.fixture'

const { renderUpload: render } = hooks<Hooks>()
const events = (page: Page) => page.evaluate(() => (window as any).uploadEvents)
const part = (page: Page, name: string) => page.locator(`[data-scope="upload"][data-part="${name}"]`)
const input = (page: Page) => page.locator('input[type="file"]')
const names = (page: Page) => part(page, 'fileName').allTextContents()
const message = (page: Page) => page.locator('[data-scope="field"][data-part="error"]')
const submit = async (page: Page) => {
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  return (await events(page)).filter((event: object) => 'submit' in event).at(-1)?.submit
}
const file = (name: string, size = 4, mimeType = 'text/plain') => ({
  name,
  mimeType,
  buffer: Buffer.alloc(size, 'x'),
})

/** A file drag from the desktop, as far as a page can build one: a DataTransfer holding Files. */
async function drag(page: Page, files: ReadonlyArray<{ name: string; size: number; type: string }>, steps: string[]) {
  const transfer = await page.evaluateHandle((files) => {
    const data = new DataTransfer()
    for (const { name, size, type } of files) data.items.add(new File(['x'.repeat(size)], name, { type }))
    return data
  }, files)
  for (const type of steps) await part(page, 'dropzone').dispatchEvent(type, { dataTransfer: transfer })
}

test.beforeEach(async ({ page }) => {
  await open(page, 'upload')
})

test('setInputFiles: picked files are listed and submitted under name; a removed one is not', { tag: ['@native'] }, async ({ page }) => {
  await render(page, { name: 'attachments', multiple: true, label: 'Attachments' })
  await input(page).setInputFiles([file('a.txt'), file('b.txt')])
  expect(await names(page)).toEqual(['a.txt', 'b.txt'])
  await input(page).setInputFiles([file('c.txt')])
  expect(await names(page)).toEqual(['a.txt', 'b.txt', 'c.txt'])
  expect(await submit(page)).toEqual([
    ['attachments', 'a.txt'],
    ['attachments', 'b.txt'],
    ['attachments', 'c.txt'],
  ])
  await page.getByRole('button', { name: 'Remove b.txt' }).click()
  expect(await submit(page)).toEqual([
    ['attachments', 'a.txt'],
    ['attachments', 'c.txt'],
  ])
  expect(await events(page)).toContainEqual({ files: ['a.txt', 'c.txt'] })
})

test('filechooser: the button opens the native picker with accept and multiple; Enter opens it too', { tag: ['@native', '@focus'] }, async ({ page }) => {
  await render(page, { name: 'images', accept: 'image/*', multiple: true, label: 'Images' })
  const button = page.getByRole('button', { name: 'Choose files' })
  let chooser = page.waitForEvent('filechooser')
  await button.click()
  const picker = await chooser
  expect(picker.isMultiple()).toBe(true)
  await picker.setFiles([file('a.png', 8, 'image/png')])
  expect(await names(page)).toEqual(['a.png'])
  // Whether Tab reaches buttons is a WebKit preference; what matters is that the key opens the picker.
  await button.focus()
  chooser = page.waitForEvent('filechooser')
  await page.keyboard.press('Enter')
  await (await chooser).setFiles([file('b.png', 8, 'image/png')])
  expect(await names(page)).toEqual(['a.png', 'b.png'])
  expect(await submit(page)).toEqual([
    ['images', 'a.png'],
    ['images', 'b.png'],
  ])
})

test('filechooser: without multiple the picker takes one file and replaces the listed one', { tag: ['@native'] }, async ({ page }) => {
  await render(page, { name: 'csv', label: 'Customer list' })
  for (const name of ['first.csv', 'second.csv']) {
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Choose files' }).click()
    const picker = await chooser
    expect(picker.isMultiple()).toBe(false)
    await picker.setFiles([file(name, 4, 'text/csv')])
  }
  expect(await names(page)).toEqual(['second.csv'])
  expect(await submit(page)).toEqual([['csv', 'second.csv']])
})

test('drag and drop: a file drag marks the field, the drop lists the files and the form submits them', { tag: ['@native', '@css'] }, async ({ page }) => {
  await render(page, { name: 'attachments', multiple: true, label: 'Attachments' })
  const dropzone = part(page, 'dropzone')
  const idle = await dropzone.evaluate((node) => getComputedStyle(node).backgroundColor)
  const files = [
    { name: 'a.txt', size: 3, type: 'text/plain' },
    { name: 'b.txt', size: 5, type: 'text/plain' },
  ]
  await drag(page, files, ['dragenter', 'dragover'])
  await expect(part(page, 'root')).toHaveAttribute('data-dragging', '')
  expect(await dropzone.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(idle)
  await drag(page, files, ['drop'])
  await expect(part(page, 'root')).not.toHaveAttribute('data-dragging')
  expect(await names(page)).toEqual(['a.txt', 'b.txt'])
  expect(await submit(page)).toEqual([
    ['attachments', 'a.txt'],
    ['attachments', 'b.txt'],
  ])
})

test('distinct files with matching metadata are both listed and submitted', { tag: ['@native'] }, async ({ page }) => {
  await render(page, { name: 'attachments', multiple: true, label: 'Attachments' })
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File(['a'], 'same.txt', { type: 'text/plain', lastModified: 42 }))
    data.items.add(new File(['b'], 'same.txt', { type: 'text/plain', lastModified: 42 }))
    return data
  })
  await part(page, 'dropzone').dispatchEvent('drop', { dataTransfer: transfer })
  expect(await names(page)).toEqual(['same.txt', 'same.txt'])
  expect(await submit(page)).toEqual([
    ['attachments', 'same.txt'],
    ['attachments', 'same.txt'],
  ])
  expect(await events(page)).not.toContainEqual({ reject: [['same.txt', 'tooMany']] })
})

test('drag and drop: leaving through a nested element keeps the mark until the drag leaves the field', { tag: ['@native'] }, async ({ page }) => {
  await render(page, { label: 'Attachments' })
  const files = [{ name: 'a.txt', size: 3, type: 'text/plain' }]
  await drag(page, files, ['dragenter'])
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File(['x'], 'a.txt'))
    return data
  })
  await part(page, 'hint').dispatchEvent('dragenter', { dataTransfer: transfer })
  await part(page, 'hint').dispatchEvent('dragleave', { dataTransfer: transfer })
  await expect(part(page, 'root')).toHaveAttribute('data-dragging', '')
  await drag(page, files, ['dragleave'])
  await expect(part(page, 'root')).not.toHaveAttribute('data-dragging')
})

test('validation messages: rejected files are named under the drop area, one line per reason', { tag: ['@native', '@css'] }, async ({ page }) => {
  await render(page, { accept: '.pdf', maxSize: 1024, multiple: true, maxFiles: 2, label: 'Contracts' })
  const status = page.locator('.uf-upload [role="status"][aria-live="polite"]')
  await expect(status).toBeEmpty()
  await input(page).setInputFiles([
    file('notes.txt'),
    file('big.pdf', 4096, 'application/pdf'),
    file('a.pdf', 8, 'application/pdf'),
    file('b.pdf', 8, 'application/pdf'),
    file('c.pdf', 8, 'application/pdf'),
  ])
  expect(await names(page)).toEqual(['a.pdf', 'b.pdf'])
  expect(await message(page).evaluate((node: HTMLElement) => node.innerText)).toBe(
    'File type not accepted: notes.txt\nLarger than 1.0 KB: big.pdf\nLimit of 2 reached: c.pdf',
  )
  await expect(status).toHaveText('File type not accepted: notes.txt\nLarger than 1.0 KB: big.pdf\nLimit of 2 reached: c.pdf')
  await expect(part(page, 'root')).toHaveAttribute('data-invalid', '')
  await expect(page.getByRole('button', { name: 'Choose files' })).toHaveAccessibleDescription(/File type not accepted: notes\.txt/)
  expect(await events(page)).toContainEqual({
    reject: [
      ['notes.txt', 'invalidType'],
      ['big.pdf', 'tooLarge'],
      ['c.pdf', 'tooMany'],
    ],
  })
  await page.getByRole('button', { name: 'Remove a.pdf' }).click()
  await expect(message(page)).toHaveCount(0)
  await expect(status).toBeEmpty()
})

test('validation messages: a required empty field blocks submission, shows the browser message and focuses the button', { tag: ['@native', '@focus'] }, async ({ page }) => {
  await render(page, { name: 'contract', required: true, label: 'Signed contract' })
  const button = page.getByRole('button', { name: 'Choose files' })
  const text = await input(page).evaluate((node: HTMLInputElement) => node.validationMessage)
  expect(text).not.toBe('')
  for (let round = 0; round < 2; round++) {
    await page.locator('#before').focus()
    expect(await submit(page)).toBeUndefined()
    await expect(button).toBeFocused()
  }
  await expect(message(page)).toHaveText(text)
  await expect(button).toHaveAccessibleDescription(text)
  await input(page).setInputFiles([file('signed.pdf', 8, 'application/pdf')])
  await expect(message(page)).toHaveCount(0)
  expect(await submit(page)).toEqual([['contract', 'signed.pdf']])
})

test('repeating the same rejection refreshes its live announcement', { tag: ['@native', '@a11y'] }, async ({ page }) => {
  await render(page, { accept: '.pdf', label: 'Contracts' })
  const status = page.locator('.uf-upload [role="status"][aria-live="polite"]')
  const refused = [{ name: 'notes.txt', size: 3, type: 'text/plain' }]
  await drag(page, refused, ['drop'])
  await expect(status).toHaveText('File type not accepted: notes.txt')
  await status.evaluate((node) => {
    const changes: string[] = []
    new MutationObserver(() => changes.push(node.textContent ?? ''))
      .observe(node, { childList: true, characterData: true, subtree: true })
    ;(window as any).announcementChanges = changes
  })
  await drag(page, refused, ['drop'])
  await expect.poll(() => page.evaluate(() => (window as any).announcementChanges)).toContain('')
  await expect(status).toHaveText('File type not accepted: notes.txt')
})

test('the covering input anchors the browser bubble on the drop area', { tag: ['@layout'] }, async ({ page }) => {
  await render(page, { name: 'contract', required: true, label: 'Signed contract' })
  // The input fills the drop area's padding box: its border is all that stays outside.
  const [proxy, zone] = await part(page, 'dropzone').evaluate((node) => {
    const input = node.querySelector('input')!.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    const inner = { x: box.x + node.clientLeft, y: box.y + node.clientTop, width: node.clientWidth, height: node.clientHeight }
    return [{ x: input.x, y: input.y, width: input.width, height: input.height }, inner]
  })
  expect(proxy).toEqual(zone)
  expect(zone.width).toBeGreaterThan(0)
})

test('form reset restores the default list and empties the input', { tag: ['@native'] }, async ({ page }) => {
  await render(page, {
    name: 'attachments',
    multiple: true,
    defaultFiles: [{ id: 'stored', name: 'stored.pdf', size: 1536 }],
  })
  await input(page).setInputFiles([file('new.txt')])
  expect(await names(page)).toEqual(['stored.pdf', 'new.txt'])
  await page.locator('#form').evaluate((form: HTMLFormElement) => form.reset())
  await expect.poll(() => names(page)).toEqual(['stored.pdf'])
  // Entries stored elsewhere are shown, never submitted: the input sends its empty file entry.
  expect(await submit(page)).toEqual([['attachments', '']])
})

test('removing with the keyboard moves focus to the entry that took its place, then to the button', { tag: ['@focus'] }, async ({ page }) => {
  await render(page, {
    multiple: true,
    defaultFiles: [
      { id: 'a', name: 'a.pdf' },
      { id: 'b', name: 'b.pdf' },
    ],
  })
  await page.getByRole('button', { name: 'Remove a.pdf' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Remove b.pdf' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeFocused()
})

for (const direction of ['ltr', 'rtl'] as const)
  test(`entries: name, size and remove share a row, progress and error span it, long names wrap (${direction})`, { tag: ['@layout'] }, async ({ page }) => {
    await render(
      page,
      {
        label: 'Images',
        multiple: true,
        defaultFiles: [
          { id: 'long', name: 'quarterly-report-final-version-approved-by-legal-2026.pdf', size: 2_400_000, progress: 45 },
          { id: 'failed', name: 'box.png', error: 'Upload failed' },
        ],
      },
      { width: 320, direction },
    )
    const box = async (selector: string, index = 0) =>
      (await page.locator(selector).nth(index).boundingBox())!
    const item = await box('[data-part="fileItem"]')
    const name = await box('[data-part="fileName"]')
    const size = await box('[data-part="fileSize"]')
    const remove = await box('[data-part="fileRemove"]')
    const bar = await box('[data-part="fileItem"] [data-scope="progress"][data-part="root"]')
    // One row: the remove button at the inline end (inside its 1px membrane), the size before it, the name first.
    if (direction === 'ltr') {
      expect(item.x + item.width - (remove.x + remove.width)).toBe(1)
      expect(size.x + size.width).toBeLessThanOrEqual(remove.x + 1)
      expect(name.x + name.width).toBeLessThanOrEqual(size.x + 1)
    } else {
      expect(remove.x - item.x).toBe(1)
      expect(size.x).toBeGreaterThanOrEqual(remove.x + remove.width - 1)
      expect(name.x).toBeGreaterThanOrEqual(size.x + size.width - 1)
    }
    // The long name wraps inside its cell instead of widening the row.
    expect(name.height).toBeGreaterThan(remove.height)
    expect(await page.locator('#form').evaluate((form) => form.scrollWidth <= form.clientWidth)).toBe(true)
    // Progress and error sit below the row, across its width.
    expect(bar.y).toBeGreaterThanOrEqual(name.y + name.height - 1)
    expect(bar.width).toBeGreaterThan(item.width * 0.8)
    const failed = await box('[data-part="fileItem"]', 1)
    const error = await box('[data-part="fileError"]')
    const failedRemove = await box('[data-part="fileRemove"]', 1)
    expect(error.y).toBeGreaterThanOrEqual(failedRemove.y + failedRemove.height - 1)
    expect(error.width).toBeGreaterThan(failed.width * 0.8)
  })

test('a populated field with help, error, progress and failed entries has no axe violations', { tag: ['@a11y'] }, async ({ page }) => {
  await render(page, {
    label: 'Images',
    description: 'PNG up to 5 MB',
    error: 'Add a cover image',
    required: true,
    name: 'images',
    multiple: true,
    defaultFiles: [
      { id: 'a', name: 'a.png', size: 2048, progress: 30 },
      { id: 'b', name: 'b.png', progress: null, error: 'Upload failed' },
    ],
  })
  expect(await axe(page, '#form')).toEqual([])
  await expect(page.getByRole('group', { name: 'Images' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'a.png' })).toHaveAttribute('aria-valuenow', '30')
  await expect(page.getByRole('button', { name: 'Remove b.png' })).toHaveAccessibleDescription('Upload failed')
})
