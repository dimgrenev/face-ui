// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { Upload } from '../../Upload/Upload.tsx'
import type { UploadFile } from '../machines/upload.machine'

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
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
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
    expect(remove?.getAttribute('aria-label')).toBe('Remove file')
    expect(remove?.disabled).toBe(true)
    expect(remove?.textContent).toBe('Remove')
    expect(remove?.querySelector('[data-scope="button"][data-part="text"]')?.textContent).toBe('Remove')
    expect(remove?.closest('.uf-membrane')).toBeNull()
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
    expect(remove?.getAttribute('aria-label')).toBe('Remove file')
    expect(remove?.textContent).toBe('Remove')
    expect(remove?.querySelector('[data-scope="button"][data-part="text"]')?.textContent).toBe('Remove')
    expect(remove?.closest('.uf-membrane')).toBeNull()

    await act(async () => {
      remove?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleFilesChange).toHaveBeenLastCalledWith({ files: [] })
    expect(container.querySelector('[data-scope="upload"][data-part="fileName"]')).toBeNull()
  })
})
