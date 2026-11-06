import { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Upload, type UploadFile, type UploadProps } from '../../Upload/Upload'
import {
  acceptsFile,
  fileId,
  formatFileSize,
  validateFiles,
} from '../runtime/upload'
import { expectDevError, formEntries, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { describeField } from './harness/field'

const file = (name: string, size = 4, type = 'text/plain', lastModified = 1) =>
  new File(['x'.repeat(size)], name, { type, lastModified })
const entryOf = (source: File): UploadFile => ({
  id: fileId(source),
  name: source.name,
  size: source.size,
  file: source,
})

const brief = file('brief.pdf', 2048, 'application/pdf')
const photo = file('photo.jpg', 3000, 'image/jpeg')
const notes = file('notes.txt', 10)
const stored: UploadFile = { id: 'stored', name: 'stored.pdf', size: 1536 }

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: UploadProps = {}) =>
  act(async () => root.render(<Upload {...props} />))

const q = <E extends Element = HTMLElement>(selector: string, scope: ParentNode = host) =>
  scope.querySelector<E & Element>(selector) as E | null
const part = (name: string, scope: ParentNode = host) =>
  scope.querySelector<HTMLElement>(`[data-scope="upload"][data-part="${name}"]`)
const parts = (name: string, scope: ParentNode = host) =>
  Array.from(scope.querySelectorAll<HTMLElement>(`[data-scope="upload"][data-part="${name}"]`))
const input = (scope: ParentNode = host) => q<HTMLInputElement>('input[type="file"]', scope)!
const trigger = (scope: ParentNode = host) => part('trigger', scope) as HTMLButtonElement
const names = (scope: ParentNode = host) => parts('fileName', scope).map((node) => node.textContent)
const message = (scope: ParentNode = host) =>
  scope.querySelector('[data-scope="field"][data-part="error"]')?.textContent ?? null

/** A drag event as the browser sends it; jsdom has no DataTransfer. */
function dragEvent(type: string, files: readonly File[], types = ['Files']) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { files, types, dropEffect: 'none' },
  })
  return event as Event & { dataTransfer: { dropEffect: string } }
}
const dispatchDrop = (files: readonly File[], scope: ParentNode = host) =>
  part('root', scope)!.dispatchEvent(dragEvent('drop', files))
const drop = (files: readonly File[]) => act(async () => void dispatchDrop(files))
/** The picker's answer: the input holds the chosen files and fires change. */
const pick = (files: readonly File[]) =>
  act(async () => {
    Object.defineProperty(input(), 'files', { configurable: true, value: files })
    input().dispatchEvent(new Event('change', { bubbles: true }))
  })

const byName = new Map([brief, photo, notes].map((source) => [source.name, entryOf(source)]))
describeControlled<readonly UploadFile[]>({
  name: 'Upload',
  prop: 'files',
  values: [[], [entryOf(brief)]],
  render: (props) => <Upload multiple {...props} />,
  change: (scope, to) => {
    if (to.length) dispatchDrop(to.map((entry) => entry.file!), scope)
    else (part('fileRemove', scope) as HTMLButtonElement).click()
  },
  read: (scope) => names(scope).map((name) => byName.get(name!)!),
  handler: 'onDrop',
  formReset: true,
})

describeField('Upload', (props) => <Upload {...props} />)

describe('Upload files', () => {
  it('a picked file becomes an entry with its id, name, size and File; the input and the list show it', async () => {
    const onFilesChange = vi.fn()
    await render({ onFilesChange })
    await pick([brief])
    expect(onFilesChange.mock.calls).toEqual([[{ files: [entryOf(brief)] }]])
    expect(onFilesChange.mock.calls[0]![0].files[0].file).toBe(brief)
    expect(names()).toEqual(['brief.pdf'])
    expect(part('fileSize')!.textContent).toBe('2.0 KB')
  })

  it('id: the same File object picked or dropped again is listed once and reports nothing', async () => {
    const onFilesChange = vi.fn()
    await render({ multiple: true, onFilesChange })
    await pick([brief])
    await drop([brief])
    await pick([brief, notes])
    expect(names()).toEqual(['brief.pdf', 'notes.txt'])
    expect(onFilesChange.mock.calls.map(([{ files }]) => files.map((entry: UploadFile) => entry.name))).toEqual([
      ['brief.pdf'],
      ['brief.pdf', 'notes.txt'],
    ])
  })

  it('keeps distinct files with matching metadata, and rejects one only when the count limit is reached', async () => {
    const first = new File(['a'], 'same.txt', { type: 'text/plain', lastModified: 42 })
    const second = new File(['b'], 'same.txt', { type: 'text/plain', lastModified: 42 })
    const third = new File(['c'], 'same.txt', { type: 'text/plain', lastModified: 42 })
    const onFilesChange = vi.fn()
    const onReject = vi.fn()
    await render({ multiple: true, maxFiles: 2, onFilesChange, onReject })

    await pick([first])
    await drop([first])
    expect(onFilesChange).toHaveBeenCalledTimes(1)
    await drop([second])
    expect(names()).toEqual(['same.txt', 'same.txt'])
    const accepted = onFilesChange.mock.lastCall![0].files as UploadFile[]
    expect(accepted.map((entry) => entry.id)).toEqual([fileId(first), `${fileId(second)}#2`])
    expect(accepted.map((entry) => entry.file)).toEqual([first, second])
    expect(onReject).not.toHaveBeenCalled()

    await drop([third])
    expect(names()).toEqual(['same.txt', 'same.txt'])
    expect(onFilesChange).toHaveBeenCalledTimes(2)
    expect(onReject.mock.lastCall![0].files).toEqual([{ file: third, reason: 'tooMany' }])
  })

  it('proposes both matching-metadata files in controlled mode without changing the rendered list', async () => {
    const first = new File(['a'], 'same.txt', { lastModified: 42 })
    const second = new File(['b'], 'same.txt', { lastModified: 42 })
    const onFilesChange = vi.fn()
    await render({ files: [entryOf(first)], multiple: true, onFilesChange })

    await drop([second])
    const proposed = onFilesChange.mock.lastCall![0].files as UploadFile[]
    expect(proposed.map((entry) => entry.id)).toEqual([fileId(first), `${fileId(second)}#2`])
    expect(names()).toEqual(['same.txt'])

    await render({ files: proposed, multiple: true, onFilesChange })
    expect(names()).toEqual(['same.txt', 'same.txt'])
  })

  it('id: an entry without a string id, or repeating one, is dropped and reported', async () => {
    await expectDevError(
      () =>
        expectDevError(
          () => render({ files: [stored, { name: 'nameless' } as UploadFile, { ...stored, name: 'again.pdf' }] }),
          /^Face UI Upload: missing files\[1\] key; dropping the item\.$/,
        ),
      /^Face UI Upload: invalid files\[2\] key "stored"; dropping the duplicate\.$/,
    )
    expect(names()).toEqual(['stored.pdf'])
  })

  it('files that are not a list render an empty field and report', async () => {
    await expectDevError(
      () => render({ files: 'brief.pdf' as unknown as UploadFile[] }),
      /^Face UI Upload: invalid files "brief\.pdf"; using \[\]\.$/,
    )
    expect(part('fileList')).toBeNull()
    expect(trigger().textContent).toBe('Choose files')
  })

  it('name: shown in the entry and in its remove button, a non-string one reads as empty and reports', async () => {
    await render({ defaultFiles: [stored] })
    expect(names()).toEqual(['stored.pdf'])
    expect(part('fileRemove')!.textContent).toBe('Remove stored.pdf')
    ;({ host, root } = mount())
    await expectDevError(
      () => render({ files: [{ id: 'x', name: 7 as unknown as string }] }),
      /^Face UI Upload: invalid files\[0\]\.name 7; ignoring it\.$/,
    )
    expect(names()).toEqual([''])
  })

  it('size: shown in 1024-based units after the name; omitted shows none; invalid is reported', async () => {
    await render({ files: [stored, { id: 'nosize', name: 'nosize.bin' }] })
    expect(parts('fileItem').map((item) => part('fileSize', item)?.textContent ?? null)).toEqual([
      '1.5 KB',
      null,
    ])
    await expectDevError(
      () => render({ files: [{ id: 'bad', name: 'bad.bin', size: -3 }] }),
      /^Face UI Upload: invalid files\[0\]\.size -3; using 0\.$/,
    )
    expect(part('fileSize')!.textContent).toBe('0 B')
  })

  it('progress: a number is a determinate bar named by the file, null an indeterminate one, omitted none', async () => {
    await render({
      files: [
        { ...stored, progress: 40 },
        { id: 'pending', name: 'pending.pdf', progress: null },
        { id: 'done', name: 'done.pdf' },
      ],
    })
    const [first, second, third] = parts('fileItem')
    const bar = first!.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
    expect(document.getElementById(bar.getAttribute('aria-labelledby')!)!.textContent).toBe('stored.pdf')
    const unknown = second!.querySelector('[role="progressbar"]')!
    expect(unknown.hasAttribute('aria-valuenow')).toBe(false)
    expect(third!.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('error: shown under the entry, marks it invalid and describes its remove button', async () => {
    await render({ files: [{ ...stored, error: 'Upload failed', progress: 60 }, { id: 'ok', name: 'ok.pdf' }] })
    const [failed, ok] = parts('fileItem')
    expect(failed!.hasAttribute('data-invalid')).toBe(true)
    expect(part('fileError', failed)!.textContent).toBe('Upload failed')
    const remove = part('fileRemove', failed)!
    expect(document.getElementById(remove.getAttribute('aria-describedby')!)!.textContent).toBe('Upload failed')
    expect(failed!.querySelector('[role="progressbar"]')!.getAttribute('data-tone')).toBe('destructive')
    expect(ok!.hasAttribute('data-invalid')).toBe(false)
    expect(part('fileRemove', ok)!.hasAttribute('aria-describedby')).toBe(false)
  })

  it('file: only entries with a browser File reach the input; stored entries are shown only', async () => {
    const onFilesChange = vi.fn()
    await render({ multiple: true, defaultFiles: [stored], onFilesChange })
    await pick([notes])
    const [{ files }] = onFilesChange.mock.calls.at(-1)!
    expect(files.map((entry: UploadFile) => entry.file ?? null)).toEqual([null, notes])
  })
})

describe('Upload picking', () => {
  it('the button opens the native picker; the input is hidden from the tab order and assistive tech', async () => {
    await render()
    const click = vi.spyOn(input(), 'click')
    await act(async () => trigger().click())
    expect(click).toHaveBeenCalledTimes(1)
    expect(input().tabIndex).toBe(-1)
    expect(input().getAttribute('aria-hidden')).toBe('true')
    expect(trigger().getAttribute('type')).toBe('button')
  })

  it('accept: the picker offers it, and a file outside it is rejected with a message and onReject', async () => {
    const onReject = vi.fn()
    const onFilesChange = vi.fn()
    await render({ accept: '.pdf,image/*', multiple: true, onReject, onFilesChange })
    expect(input().accept).toBe('.pdf,image/*')
    await drop([notes, photo, brief])
    expect(names()).toEqual(['photo.jpg', 'brief.pdf'])
    expect(onReject.mock.calls).toEqual([[{ files: [{ file: notes, reason: 'invalidType' }] }]])
    expect(message()).toBe('File type not accepted: notes.txt')
    expect(onFilesChange).toHaveBeenCalledTimes(1)
  })

  it('multiple: off, the picker takes one file and a new one replaces the listed one', async () => {
    await render()
    expect(input().multiple).toBe(false)
    await pick([brief])
    await pick([photo])
    expect(names()).toEqual(['photo.jpg'])
  })

  it('multiple: off, a drop of several adds the first acceptable file and rejects the rest as tooMany', async () => {
    const onReject = vi.fn()
    await render({ accept: '.pdf', onReject })
    await drop([notes, brief, file('other.pdf')])
    expect(names()).toEqual(['brief.pdf'])
    expect(onReject.mock.calls[0]![0].files.map(({ file, reason }: { file: File; reason: string }) => [file.name, reason])).toEqual([
      ['notes.txt', 'invalidType'],
      ['other.pdf', 'tooMany'],
    ])
    expect(message()).toBe('File type not accepted: notes.txt\nLimit of 1 reached: other.pdf')
  })

  it('multiple: on, the picker takes several files and new ones are appended', async () => {
    await render({ multiple: true })
    expect(input().multiple).toBe(true)
    await pick([brief])
    await pick([photo, notes])
    expect(names()).toEqual(['brief.pdf', 'photo.jpg', 'notes.txt'])
  })

  it('maxSize: a larger file is rejected with the limit in the message; omitted means no limit', async () => {
    const onReject = vi.fn()
    await render({ maxSize: 2048, multiple: true, onReject })
    await drop([brief, photo])
    expect(names()).toEqual(['brief.pdf'])
    expect(onReject.mock.calls[0]![0].files).toEqual([{ file: photo, reason: 'tooLarge' }])
    expect(message()).toBe('Larger than 2.0 KB: photo.jpg')
    await render({ multiple: true })
    await drop([file('huge.bin', 5 * 1024 * 1024)])
    expect(names()).toContain('huge.bin')
  })

  it('maxSize: 0 is not "no limit"; it is reported and read as 1 byte', async () => {
    await expectDevError(() => render({ maxSize: 0 }), /^Face UI Upload: invalid maxSize 0; using 1\.$/)
    await drop([notes])
    expect(names()).toEqual([])
    expect(message()).toBe('Larger than 1 B: notes.txt')
  })

  it('maxFiles: with multiple, files past the limit are rejected, counting the listed ones', async () => {
    const onReject = vi.fn()
    await render({ multiple: true, maxFiles: 2, defaultFiles: [stored], onReject })
    await drop([brief, photo])
    expect(names()).toEqual(['stored.pdf', 'brief.pdf'])
    expect(onReject.mock.calls[0]![0].files).toEqual([{ file: photo, reason: 'tooMany' }])
    expect(message()).toBe('Limit of 2 reached: photo.jpg')
    await drop([notes])
    expect(message()).toBe('Limit of 2 reached: notes.txt')
  })

  it('maxFiles: omitted means no limit; 0 is reported and read as 1; without multiple the list holds one', async () => {
    await render({ multiple: true })
    await drop([brief, photo, notes])
    expect(names()).toHaveLength(3)
    ;({ host, root } = mount())
    await expectDevError(() => render({ multiple: true, maxFiles: 0 }), /^Face UI Upload: invalid maxFiles 0; using 1\.$/)
    await drop([brief, photo])
    expect(names()).toEqual(['brief.pdf'])
    ;({ host, root } = mount())
    await render({ maxFiles: 5 })
    await pick([brief])
    await pick([photo])
    expect(names()).toEqual(['photo.jpg'])
  })

  it('the message tells about the latest pick or drop: an accepted one or a removal clears it', async () => {
    await render({ accept: '.pdf', multiple: true })
    await drop([notes])
    expect(message()).toBe('File type not accepted: notes.txt')
    await pick([brief])
    expect(message()).toBeNull()
    await drop([notes])
    await act(async () => (part('fileRemove') as HTMLButtonElement).click())
    expect(message()).toBeNull()
  })

  it("the consumer's error wins over the field's own message", async () => {
    await render({ accept: '.pdf', error: 'Attach the signed contract' })
    await drop([notes])
    expect(message()).toBe('Attach the signed contract')
  })

  it('a refused controlled proposal still reports the rejected files', async () => {
    const onReject = vi.fn()
    await render({ files: [], accept: '.pdf', multiple: true, onReject })
    await drop([brief, notes])
    expect(names()).toEqual([])
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(message()).toBe('File type not accepted: notes.txt')
  })
})

describe('Upload dragging', () => {
  const drag = (type: string, types = ['Files']) =>
    act(async () => void part('root')!.dispatchEvent(dragEvent(type, [], types)))
  const dragging = () => part('root')!.hasAttribute('data-dragging')

  it('a file drag marks the field until it leaves the outermost element; nested enters count', async () => {
    await render()
    await drag('dragenter')
    await drag('dragenter')
    expect(dragging()).toBe(true)
    await drag('dragleave')
    expect(dragging()).toBe(true)
    await drag('dragleave')
    expect(dragging()).toBe(false)
    await drag('dragenter')
    await drop([brief])
    expect(dragging()).toBe(false)
    expect(names()).toEqual(['brief.pdf'])
  })

  it('dragover accepts a file drag as a copy; a text drag is left to the browser', async () => {
    await render()
    const files = dragEvent('dragover', [])
    await act(async () => void part('root')!.dispatchEvent(files))
    expect(files.defaultPrevented).toBe(true)
    expect(files.dataTransfer.dropEffect).toBe('copy')
    const text = dragEvent('dragover', [], ['text/plain'])
    await act(async () => void part('root')!.dispatchEvent(text))
    expect(text.defaultPrevented).toBe(false)
    await drag('dragenter', ['text/plain'])
    expect(dragging()).toBe(false)
  })

  it('consumer drag handlers run first; preventDefault() in onDragEnter keeps the mark off', async () => {
    const order: string[] = []
    await render({
      onDragEnter: (event) => {
        order.push('consumer')
        event.preventDefault()
      },
    })
    await drag('dragenter')
    expect(order).toEqual(['consumer'])
    expect(dragging()).toBe(false)
  })
})

describe('Upload disabled', () => {
  it('disables the button, the remove buttons and the input; drops are refused without the mark', async () => {
    const onFilesChange = vi.fn()
    await render({ disabled: true, defaultFiles: [stored], onFilesChange })
    expect(trigger().disabled).toBe(true)
    expect((part('fileRemove') as HTMLButtonElement).disabled).toBe(true)
    expect(input().disabled).toBe(true)
    expect(part('root')!.hasAttribute('data-disabled')).toBe(true)
    const over = dragEvent('dragover', [])
    await act(async () => void part('root')!.dispatchEvent(over))
    expect(over.defaultPrevented).toBe(true)
    expect(over.dataTransfer.dropEffect).toBe('none')
    await act(async () => void part('root')!.dispatchEvent(dragEvent('dragenter', [])))
    expect(part('root')!.hasAttribute('data-dragging')).toBe(false)
    await drop([brief])
    expect(names()).toEqual(['stored.pdf'])
    expect(onFilesChange).not.toHaveBeenCalled()
  })
})

describe('Upload removing', () => {
  it('a remove button drops its entry and focus moves to the entry that took its place, else the button', async () => {
    await render({ defaultFiles: [stored, { id: 'b', name: 'b.pdf' }, { id: 'c', name: 'c.pdf' }] })
    const [, second] = parts('fileRemove')
    await act(async () => second!.focus())
    await act(async () => second!.click())
    expect(names()).toEqual(['stored.pdf', 'c.pdf'])
    expect(document.activeElement).toBe(parts('fileRemove')[1])
    await act(async () => parts('fileRemove')[1]!.click())
    expect(document.activeElement).toBe(parts('fileRemove')[0])
    await act(async () => parts('fileRemove')[0]!.click())
    expect(part('fileList')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('remove buttons are icon buttons named by the remove template', async () => {
    await render({ defaultFiles: [stored] })
    const remove = part('fileRemove')!
    expect(remove.hasAttribute('data-icon-only')).toBe(true)
    expect(remove.textContent).toBe('Remove stored.pdf')
  })
})

describe('Upload labels', () => {
  it('every string Upload renders comes from labels; placeholders take the name, size and count', async () => {
    const onReject = vi.fn()
    await render({
      multiple: true,
      maxFiles: 2,
      maxSize: 2048,
      accept: '.pdf,.jpg',
      defaultFiles: [stored],
      onReject,
      labels: {
        drop: 'Перетащите файлы сюда',
        open: 'Выбрать файлы',
        remove: 'Удалить «{name}»',
        invalidType: 'Не тот тип: {name}',
        tooLarge: 'Больше {size}: {name}',
        tooMany: 'Не больше {count}: {name}',
      },
    })
    expect(part('hint')!.textContent).toBe('Перетащите файлы сюда')
    expect(trigger().textContent).toBe('Выбрать файлы')
    expect(part('fileRemove')!.textContent).toBe('Удалить «stored.pdf»')
    await drop([notes, photo, brief, file('extra.pdf')])
    expect(message()).toBe('Не тот тип: notes.txt\nБольше 2.0 KB: photo.jpg\nНе больше 2: extra.pdf')
  })

  it('a remove template without {name} gets the name appended; a blank label keeps the default', async () => {
    await render({ defaultFiles: [stored], labels: { remove: 'Delete', open: '  ' } })
    expect(part('fileRemove')!.textContent).toBe('Delete stored.pdf')
    expect(trigger().textContent).toBe('Choose files')
  })
})

describe('Upload forms', () => {
  it('name, form and disabled reach the native input', async () => {
    await render({ name: 'attachments', form: 'order' })
    expect(input().name).toBe('attachments')
    expect(input().getAttribute('form')).toBe('order')
  })

  it('required: the input is required while the list is empty, stored entries included; the label is marked', async () => {
    await render({ required: true, label: 'Contract' })
    expect(input().required).toBe(true)
    expect(q('[data-scope="field"][data-part="required"]')).not.toBeNull()
    ;({ host, root } = mount())
    await render({ required: true, label: 'Contract', files: [stored] })
    expect(input().required).toBe(false)
  })

  it('interactive validation shows the browser message in the field and moves focus to the button', async () => {
    await act(async () =>
      root.render(
        <form>
          <Upload required label="Contract" />
        </form>,
      ),
    )
    expect(input().validationMessage).not.toBe('')
    await act(async () => {
      input().focus()
      await Promise.resolve()
    })
    expect(document.activeElement).toBe(trigger())
    expect(message()).toBe(input().validationMessage)
    expect(part('root')!.hasAttribute('data-invalid')).toBe(true)
    await pick([brief])
    expect(message()).toBeNull()
  })

  it('the browser message goes away when the list gets files from the parent', async () => {
    const view = (files?: UploadFile[]) =>
      act(async () =>
        root.render(
          <form>
            <Upload required files={files} onFilesChange={() => {}} />
          </form>,
        ),
      )
    await view([])
    await act(async () => {
      input().focus()
      await Promise.resolve()
    })
    expect(message()).not.toBeNull()
    await view([stored])
    expect(message()).toBeNull()
  })

  it('name is the FormData key of the input; a disabled field leaves it out', async () => {
    const view = (disabled: boolean) =>
      act(async () =>
        root.render(
          <form>
            <Upload name="attachments" disabled={disabled} />
          </form>,
        ),
      )
    await view(false)
    expect(formEntries(q<HTMLFormElement>('form')!).map(([key]) => key)).toEqual(['attachments'])
    await view(true)
    expect(formEntries(q<HTMLFormElement>('form')!)).toEqual([])
  })

  it('form reset clears the message', async () => {
    await act(async () =>
      root.render(
        <form>
          <Upload accept=".pdf" />
        </form>,
      ),
    )
    await drop([notes])
    expect(message()).not.toBeNull()
    await act(async () => {
      q<HTMLFormElement>('form')!.reset()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(message()).toBeNull()
  })

  it('autoFocus focuses the picker button on mount and marks it for layers', async () => {
    await render({ autoFocus: true })
    expect(document.activeElement).toBe(trigger())
    expect(trigger().hasAttribute('data-autofocus')).toBe(true)
  })
})

describe('Upload native attributes', () => {
  it('reach the root group with the ref; className and style too', async () => {
    const ref = createRef<HTMLDivElement>()
    await act(async () =>
      root.render(
        <Upload
          ref={ref}
          id="docs"
          className="custom"
          style={{ maxWidth: 320 }}
          title="Documents"
          data-test="upload"
          aria-label="Documents"
        />,
      ),
    )
    const group = part('root')!
    expect(ref.current).toBe(group)
    expect(group.getAttribute('role')).toBe('group')
    expect(group.id).toBe('docs')
    expect(group.className).toBe('uf-field uf-upload custom')
    expect(group.style.maxWidth).toBe('320px')
    expect(group.title).toBe('Documents')
    expect(group.dataset.test).toBe('upload')
    expect(group.getAttribute('aria-label')).toBe('Documents')
  })
})

describe('Upload file rules (runtime)', () => {
  it('acceptsFile reads the accept syntax: extensions, wildcards and exact types, ignoring case and blanks', () => {
    const png = { name: 'Logo.PNG', type: 'image/png' }
    expect(acceptsFile(png, '.png')).toBe(true)
    expect(acceptsFile(png, ' IMAGE/* ')).toBe(true)
    expect(acceptsFile(png, 'image/png')).toBe(true)
    expect(acceptsFile(png, '.jpg, application/pdf')).toBe(false)
    expect(acceptsFile(png, '')).toBe(true)
    expect(acceptsFile(png, ' , ')).toBe(true)
    expect(acceptsFile(png, 7)).toBe(true)
  })

  it('validateFiles checks type, then size, then count, and keeps the order', () => {
    const a = { name: 'a.pdf', size: 10, type: 'application/pdf' }
    const big = { name: 'big.pdf', size: 99, type: 'application/pdf' }
    const exe = { name: 'x.exe', size: 99, type: 'application/x-msdownload' }
    const b = { name: 'b.pdf', size: 10, type: 'application/pdf' }
    expect(validateFiles([a, big, exe, b], { accept: '.pdf', maxSize: 50, maxFiles: 1 })).toEqual({
      accepted: [a],
      rejected: [
        { file: big, reason: 'tooLarge' },
        { file: exe, reason: 'invalidType' },
        { file: b, reason: 'tooMany' },
      ],
    })
    expect(validateFiles([a, big], {})).toEqual({ accepted: [a, big], rejected: [] })
  })

  it('fileId is the same for the same file and differs by size, date or name', () => {
    expect(fileId(file('a.txt', 4, 'text/plain', 5))).toBe(fileId(file('a.txt', 4, 'text/plain', 5)))
    expect(new Set([
      fileId(file('a.txt', 4, 'text/plain', 5)),
      fileId(file('a.txt', 5, 'text/plain', 5)),
      fileId(file('a.txt', 4, 'text/plain', 6)),
      fileId(file('b.txt', 4, 'text/plain', 5)),
    ]).size).toBe(4)
  })

  it('formatFileSize uses 1024-based units up to PB', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1023)).toBe('1023 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5 * 1024 ** 2)).toBe('5.0 MB')
    expect(formatFileSize(2 * 1024 ** 4)).toBe('2.0 TB')
    expect(formatFileSize(3 * 1024 ** 6)).toBe('3072.0 PB')
  })
})
