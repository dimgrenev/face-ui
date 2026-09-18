import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'

import { Upload } from '../../Upload/Upload'
import { type UploadFile, uploadMachine } from '../machines/upload.machine'
import { interpret } from '../create-machine'
import { mount } from './harness'

const selectedFiles: UploadFile[] = [
  {
    id: 'file-1',
    name: 'brief.pdf',
    size: 2048,
    type: 'application/pdf',
    progress: 0,
    status: 'pending',
  },
]

describe('Upload smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('exposes the upload trigger and hidden input DOM contract', async () => {
    await act(async () => {
      root.render(<Upload accept="image/*,.pdf" multiple disabled />)
    })

    const trigger = container.querySelector<HTMLButtonElement>('.uf-upload-trigger')
    expect(trigger).not.toBeNull()
    expect(trigger?.tagName).toBe('BUTTON')
    expect(trigger?.getAttribute('type')).toBe('button')
    expect(trigger?.disabled).toBe(true)
    expect(trigger?.getAttribute('data-disabled')).toBe('true')
    expect(trigger?.textContent).toBe('Choose files')
    expect(trigger?.querySelector('[data-scope="button"][data-part="text"]')?.textContent).toBe('Choose files')

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    expect(input?.getAttribute('type')).toBe('file')
    expect(input?.getAttribute('accept')).toBe('image/*,.pdf')
    expect(input?.multiple).toBe(true)
    expect(input?.disabled).toBe(true)
    expect(input?.tabIndex).toBe(-1)
  })

  it('renders selected files as an accessible list with disabled remove buttons', async () => {
    await act(async () => {
      root.render(<Upload files={selectedFiles} disabled />)
    })

    const list = container.querySelector<HTMLUListElement>('[data-scope="upload"][data-part="fileList"]')
    expect(list).not.toBeNull()
    expect(list?.tagName).toBe('UL')
    expect(list?.getAttribute('role')).toBe('list')

    const items = Array.from(container.querySelectorAll<HTMLLIElement>('[data-scope="upload"][data-part="fileItem"]'))
    expect(items).toHaveLength(1)
    expect(items[0]?.tagName).toBe('LI')
    expect(items[0]?.getAttribute('role')).toBe('listitem')
    expect(items[0]?.getAttribute('data-file-id')).toBe('file-1')
    expect(items[0]?.getAttribute('data-status')).toBe('pending')

    const fileName = items[0]?.querySelector('[data-scope="upload"][data-part="fileName"]')
    expect(fileName?.classList.contains('uf-text')).toBe(true)
    expect(fileName?.textContent).toBe('brief.pdf')

    const fileSize = items[0]?.querySelector('[data-scope="upload"][data-part="fileSize"]')
    expect(fileSize?.classList.contains('uf-text')).toBe(true)
    expect(fileSize?.textContent).toBe('2.0 KB')

    const remove = items[0]?.querySelector<HTMLButtonElement>('[data-scope="upload"][data-part="fileRemove"]')
    expect(remove).not.toBeNull()
    expect(remove?.tagName).toBe('BUTTON')
    expect(remove?.getAttribute('type')).toBe('button')
    expect(remove?.getAttribute('aria-label')).toBe('Remove brief.pdf')
    expect(remove?.disabled).toBe(true)
    expect(remove?.textContent).toBe('Remove')
    expect(remove?.querySelector('[data-scope="button"][data-part="text"]')?.textContent).toBe('Remove')
    expect(remove?.closest('.uf-membrane:not([data-membrane-disabled])')).toBeNull()
  })

  it('renders upload actions through Button text while preserving remove semantics', async () => {
    const handleFilesChange = vi.fn()

    function Harness() {
      const [files, setFiles] = React.useState<UploadFile[]>(selectedFiles)

      return (
        <Upload
          files={files}
          onFilesChange={(details) => {
            handleFilesChange(details)
            setFiles(details.files)
          }}
        />
      )
    }

    await act(async () => {
      root.render(<Harness />)
    })

    const trigger = container.querySelector<HTMLButtonElement>('.uf-upload-trigger')
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toBe('Choose files')
    expect(trigger?.querySelector('[data-scope="button"][data-part="text"]')?.textContent).toBe('Choose files')

    const remove = container.querySelector<HTMLButtonElement>('[data-scope="upload"][data-part="fileRemove"]')
    expect(remove).not.toBeNull()
    expect(remove?.tagName).toBe('BUTTON')
    expect(remove?.classList.contains('uf-button')).toBe(true)
    expect(remove?.getAttribute('type')).toBe('button')
    expect(remove?.getAttribute('aria-label')).toBe('Remove brief.pdf')
    expect(remove?.textContent).toBe('Remove')
    expect(remove?.querySelector('[data-scope="button"][data-part="text"]')?.textContent).toBe('Remove')
    expect(remove?.closest('.uf-membrane:not([data-membrane-disabled])')).toBeNull()

    await act(async () => {
      remove?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleFilesChange).toHaveBeenLastCalledWith({ files: [] })
    expect(container.querySelector('[data-scope="upload"][data-part="fileName"]')).toBeNull()
  })

  it('keeps uncontrolled selections and exposes the original browser File', async () => {
    const handleFilesChange = vi.fn()

    await act(async () => {
      root.render(<Upload onFilesChange={handleFilesChange} />)
    })

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    const source = new File(['report'], 'report.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { configurable: true, value: [source] })

    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(handleFilesChange).toHaveBeenLastCalledWith({
      files: [expect.objectContaining({ name: 'report.pdf', source })],
    })
    expect(container.querySelector('[data-scope="upload"][data-part="fileName"]')?.textContent).toBe('report.pdf')

    await act(async () => {
      root.render(<Upload onFilesChange={handleFilesChange} />)
    })

    expect(container.querySelector('[data-scope="upload"][data-part="fileName"]')?.textContent).toBe('report.pdf')
  })

  it('validates extension patterns against the filename', async () => {
    const handleReject = vi.fn()

    await act(async () => {
      root.render(<Upload accept=".pdf" onReject={handleReject} />)
    })

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    const source = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(input, 'files', { configurable: true, value: [source] })

    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(handleReject).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'photo.jpg', reason: 'type', source })],
    })
    expect(container.querySelector('[data-scope="upload"][data-part="fileName"]')).toBeNull()
  })
})

const file = (id: string) => ({
  id,
  name: `${id}.txt`,
  size: 10,
  type: 'text/plain',
})

describe('content and upload integrity', () => {
  it('retains nested drag state, progress updates and drops after a drag leave', () => {
    const service = interpret(uploadMachine, { multiple: true }).start()
    service.send({ type: 'ADD_FILES', items: [file('first')] })
    service.send('DRAG_ENTER')
    service.send('DRAG_ENTER')
    service.send('DRAG_LEAVE')
    expect(service.getSnapshot().value).toBe('dragging')
    service.send({ type: 'SET_PROGRESS', id: 'first', progress: 65 })
    service.send({ type: 'SET_STATUS', id: 'first', status: 'uploading' })
    expect(service.getSnapshot().context.files[0]).toMatchObject({
      progress: 65,
      status: 'uploading',
    })
    service.send('DRAG_LEAVE')
    service.send({ type: 'DROP', items: [file('second')] })
    expect(service.getSnapshot().context.files).toHaveLength(2)
    service.syncContext({ disabled: true })
    service.send({ type: 'DROP', items: [file('third')] })
    expect(service.getSnapshot().context.files).toHaveLength(2)
    service.stop()
  })
  it('rejects all new files when an existing list exceeds a lowered count limit', () => {
    const service = interpret(uploadMachine, { multiple: true }).start()
    service.send({
      type: 'ADD_FILES',
      items: [file('a'), file('b'), file('c')],
    })
    service.syncContext({ maxFiles: 1 })
    service.send({
      type: 'ADD_FILES',
      items: [file('d'), file('e'), file('f')],
    })
    expect(
      service.getSnapshot().context.files.map((entry) => entry.id),
    ).toEqual(['a', 'b', 'c'])
    service.stop()
  })
})
