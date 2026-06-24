// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMembraneInteractions } from '../runtime/membrane-interactions'

describe('membrane interactions', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('does not proxy clicks away from nested interactive controls', () => {
    installMembraneInteractions()
    const membrane = document.createElement('span')
    membrane.className = 'uf-membrane uf-membrane--full'
    const surface = document.createElement('div')
    const textarea = document.createElement('textarea')
    const button = document.createElement('button')
    const textareaClick = vi.fn()
    const buttonClick = vi.fn()

    textarea.addEventListener('click', textareaClick)
    button.addEventListener('click', buttonClick)
    surface.append(textarea, button)
    membrane.append(surface)
    document.body.append(membrane)

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    button.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(textareaClick).not.toHaveBeenCalled()
    expect(buttonClick).toHaveBeenCalledTimes(1)
  })

  it('still proxies membrane padding clicks to the first interactive target', () => {
    installMembraneInteractions()
    const membrane = document.createElement('span')
    membrane.className = 'uf-membrane'
    const button = document.createElement('button')
    const buttonClick = vi.fn()

    button.addEventListener('click', buttonClick)
    membrane.append(button)
    document.body.append(membrane)

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    membrane.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(buttonClick).toHaveBeenCalledTimes(1)
  })
})
