import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Markdown } from '../../Markdown/Markdown'
import { interpret } from '../create-machine'
import { accordionMachine } from '../machines/accordion.machine'
import { uploadMachine } from '../machines/upload.machine'

const file = (id: string) => ({
  id,
  name: `${id}.txt`,
  size: 10,
  type: 'text/plain',
})

describe('content and upload integrity', () => {
  it.each([true, false])('sanitizes raw HTML with safeMode=%s', (safeMode) => {
    const html = renderToStaticMarkup(
      <Markdown
        allowRawHtml
        safeMode={safeMode}
        content={
          '<script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">link</a><iframe src="https://example.org"></iframe><input type="text" autofocus value="unsafe">'
        }
      />,
    )
    expect(html).not.toMatch(
      /<script|onerror|javascript:|<iframe|autofocus|value="unsafe"/i,
    )
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('disabled="disabled"')
  })
  it('respects raw HTML and GFM independently', () => {
    const source = '<div>Raw block</div>\n\n~~strike~~\n\n- [x] Done'
    const basic = renderToStaticMarkup(
      <Markdown content={source} gfm={false} />,
    )
    const gfm = renderToStaticMarkup(<Markdown content={source} gfm />)
    expect(basic).not.toContain('Raw block')
    expect(basic).not.toContain('<del>')
    expect(gfm).toContain('<del>strike</del>')
    expect(gfm).toContain('aria-label="Completed task"')
  })
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
  it('expands registered accordion sections and updates the active keyboard item', () => {
    const service = interpret(accordionMachine, {
      enabledValues: ['a', 'c'],
    }).start()
    service.send('EXPAND_ALL')
    expect(service.getSnapshot().context.expandedIds).toEqual(['a', 'c'])
    service.send({ type: 'FOCUS', value: 'a' })
    service.send('FOCUS_NEXT')
    expect(service.getSnapshot().context.focusedValue).toBe('c')
    service.send('FOCUS_FIRST')
    expect(service.getSnapshot().context.focusedValue).toBe('a')
    service.stop()
  })
})
