import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Spinner } from '../../Spinner/Spinner'
import { Button } from '../../Button/Button'
import { mount } from './harness'

it('server-renders the same fixed-size loading glyph without a JavaScript animation owner', () => {
  const markup = renderToStaticMarkup(<Spinner label="Loading preview" />)
  expect(markup).toContain('viewBox="0 0 20 20"')
  expect(markup).toContain('aria-label="Loading preview"')
  expect(markup).toContain('role="img"')
  expect(markup).not.toContain('aria-hidden="true"')
  expect(markup).not.toMatch(/<script|data-agent-dot/)
})

it('keeps embedded spinners decorative and icon-only loading buttons named and inactive', async () => {
  const { host, root } = mount()
  await act(async () => root.render(<Button loading iconOnly icon="search">Search</Button>))
  const button = host.querySelector('button')!
  expect(button.disabled).toBe(true)
  expect(button.getAttribute('aria-busy')).toBe('true')
  expect(button.textContent).toBe('Search')
  expect(button.querySelectorAll('svg')).toHaveLength(1)
  expect(button.querySelector('.uf-spinner')?.getAttribute('aria-hidden')).toBe('true')
  await act(async () => root.render(<Spinner title="Preparing preview" />))
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe('Preparing preview')
  expect(host.querySelector('title')?.textContent).toBe('Preparing preview')
})
