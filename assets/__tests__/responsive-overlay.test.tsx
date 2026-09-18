// @vitest-environment jsdom

import { existsSync, readFileSync } from 'node:fs'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Button } from '../../Button/Button'
import { Checkbox } from '../../Checkbox/Checkbox'
import { Command } from '../../Command/Command'
import { Date } from '../../Date/Date'
import { Input } from '../../Input/Input'
import { Menu } from '../../Menu/Menu'
import { Modal } from '../../Modal/Modal'
import { Navigation } from '../../Navigation/Navigation'
import { Panel } from '../../Panel/Panel'
import { Popover } from '../../Popover/Popover'
import { Radio } from '../../Radio/Radio'
import { Select } from '../../Select/Select'
import { Steps } from '../../Steps/Steps'
import { Switcher } from '../../Switcher/Switcher'
import { Tooltip } from '../../Tooltip/Tooltip'
import { useResponsiveOverlaySurface } from '../adapters/react/use-responsive-overlay-surface'

interface MatchMediaStub {
  matches: boolean
  listeners: Set<(event: MediaQueryListEvent) => void>
}

type MatchMediaRestore = (() => void) & {
  setMatches: (matches: boolean) => void
  dispatchChange: () => void
}

function installMatchMedia(matches: boolean): MatchMediaRestore {
  const original = window.matchMedia
  const stub: MatchMediaStub = {
    matches,
    listeners: new Set(),
  }

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: stub.matches,
    media: query,
    onchange: null,
    addEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      stub.listeners.add(listener)
    },
    removeEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      stub.listeners.delete(listener)
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.add(listener)
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.delete(listener)
    },
    dispatchEvent: () => true,
  }))

  const restore = (() => {
    window.matchMedia = original
  }) as MatchMediaRestore

  restore.setMatches = (nextMatches: boolean) => {
    stub.matches = nextMatches
  }
  restore.dispatchChange = () => {
    const event = { matches: stub.matches } as MediaQueryListEvent
    stub.listeners.forEach((listener) => listener(event))
  }

  return restore
}

function readComponentStyles() {
  const cwd = process.cwd()
  const candidates = [
    `${cwd}/assets/styles/components.css`,
    `${cwd}/../face-ui/assets/styles/components.css`,
    `${cwd}/face-ui/assets/styles/components.css`,
  ]
  const componentStylesPath = candidates.find((candidate) =>
    existsSync(candidate),
  )
  if (!componentStylesPath) {
    throw new Error(`Unable to locate Face UI component styles from ${cwd}`)
  }
  return readFileSync(componentStylesPath, 'utf8')
}

describe('responsive overlay surfaces', () => {
  let container: HTMLDivElement
  let root: Root
  let restoreMatchMedia: MatchMediaRestore | null

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    restoreMatchMedia = installMatchMedia(true)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    restoreMatchMedia?.()
    restoreMatchMedia = null
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
    container.remove()
  })

  it('keeps auto overlay initial render SSR-stable before compact viewport promotion', async () => {
    const renderSequence: string[] = []

    function SurfaceProbe() {
      const surface = useResponsiveOverlaySurface('auto')
      renderSequence.push(surface)
      return <div data-testid="surface-probe" data-surface={surface} />
    }

    await act(async () => {
      root.render(<SurfaceProbe />)
    })

    expect(renderSequence[0]).toBe('popover')
    expect(renderSequence).toContain('sheet')
    expect(
      container
        .querySelector('[data-testid="surface-probe"]')
        ?.getAttribute('data-surface'),
    ).toBe('sheet')
  })

  it('Select switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector(
      '[data-part="content"]',
    ) as HTMLElement | null
    const backdrop = container.querySelector(
      '.uf-responsive-overlay-backdrop',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(backdrop?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Select option')

    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const closedContent = container.querySelector(
      '[data-part="content"]',
    ) as HTMLElement | null
    expect(closedContent?.hidden ?? true).toBe(true)
  })

  it('Button defaults to non-submit native button semantics inside forms', async () => {
    const handleClick = vi.fn()
    const handleSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
    })

    await act(async () => {
      root.render(
        <form onSubmit={handleSubmit}>
          <Button
            text="Run action"
            onClick={handleClick}
            fullWidth={false}
            membrane={false}
          />
        </form>,
      )
    })

    const button = container.querySelector(
      '.uf-button',
    ) as HTMLButtonElement | null
    expect(button).not.toBeNull()
    expect(button?.tagName).toBe('BUTTON')
    expect(button?.type).toBe('button')

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('Steps exposes current-step semantics and linear skip guards', async () => {
    await act(async () => {
      root.render(
        <Steps
          linear
          defaultStep={0}
          items={[
            { label: 'Account', content: 'Create account' },
            { label: 'Profile', content: 'Complete profile' },
            { label: 'Review', content: 'Review setup' },
          ]}
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="steps"][data-part="root"]',
    ) as HTMLElement | null
    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-scope="steps"][data-part="trigger"]',
      ),
    )
    const contents = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-scope="steps"][data-part="content"]',
      ),
    )

    expect(rootNode?.getAttribute('aria-label')).toBe('Steps')
    expect(triggers).toHaveLength(3)
    expect(contents).toHaveLength(3)
    expect(triggers[0]?.type).toBe('button')
    expect(triggers[0]?.getAttribute('aria-current')).toBe('step')
    expect(triggers[1]?.disabled).toBe(false)
    expect(triggers[1]?.hasAttribute('data-disabled')).toBe(false)
    expect(triggers[2]?.disabled).toBe(true)
    expect(triggers[2]?.hasAttribute('data-disabled')).toBe(true)
    expect(contents[0]?.hidden).toBe(false)
    expect(contents[1]?.hidden).toBe(true)
    expect(contents[2]?.hidden).toBe(true)

    await act(async () => {
      triggers[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(triggers[0]?.getAttribute('aria-current')).toBeNull()
    expect(triggers[1]?.getAttribute('aria-current')).toBe('step')
    expect(triggers[2]?.disabled).toBe(false)
    expect(contents[0]?.hidden).toBe(true)
    expect(contents[1]?.hidden).toBe(false)
    expect(contents[2]?.hidden).toBe(true)
  })

  it('Input binds visible labels, descriptions and invalid disabled state to the native control', async () => {
    await act(async () => {
      root.render(
        <Input
          id="profile-notes"
          label="Profile notes"
          description="Shown to workspace admins."
          error="Profile notes are required."
          disabled
          multiline
        />,
      )
    })

    const label = container.querySelector(
      '.uf-input label',
    ) as HTMLLabelElement | null
    const textarea = container.querySelector(
      '.uf-input textarea',
    ) as HTMLTextAreaElement | null
    const description = container.querySelector(
      '.uf-input__description',
    ) as HTMLElement | null
    const error = container.querySelector(
      '.uf-input__error',
    ) as HTMLElement | null

    expect(label).not.toBeNull()
    expect(textarea).not.toBeNull()
    expect(label?.htmlFor).toBe('profile-notes')
    expect(textarea?.id).toBe('profile-notes')
    expect(textarea?.getAttribute('aria-label')).toBeNull()
    expect(textarea?.disabled).toBe(true)
    expect(textarea?.getAttribute('aria-disabled')).toBe('true')
    expect(textarea?.getAttribute('aria-invalid')).toBe('true')
    expect(textarea?.getAttribute('aria-describedby')).toBe(
      'profile-notes-description profile-notes-error',
    )
    expect(description?.id).toBe('profile-notes-description')
    expect(description?.textContent).toContain('Shown to workspace admins.')
    expect(error?.id).toBe('profile-notes-error')
    expect(error?.getAttribute('role')).toBe('alert')
    expect(error?.hasAttribute('aria-live')).toBe(false)
    expect(error?.textContent).toContain('Profile notes are required.')
  })

  it('Checkbox binds its visible label to the native control and reflects checked disabled required state', async () => {
    await act(async () => {
      root.render(
        <Checkbox
          name="accept-terms"
          label="Accept terms"
          checked
          disabled
          required
        />,
      )
    })

    const label = container.querySelector(
      '.uf-checkbox',
    ) as HTMLLabelElement | null
    const indicator = label?.querySelector(
      '[data-part="indicator"]',
    ) as HTMLElement | null
    const input = label?.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null
    const visibleText = label?.querySelector(
      '[data-part="label"]',
    ) as HTMLElement | null

    expect(label).not.toBeNull()
    expect(indicator).not.toBeNull()
    expect(input).not.toBeNull()
    expect(visibleText?.textContent).toContain('Accept terms')
    expect(input?.labels?.[0]).toBe(label)
    expect(input?.name).toBe('accept-terms')
    expect(input?.checked).toBe(true)
    expect(input?.disabled).toBe(true)
    expect(input?.required).toBe(true)
    expect(input?.getAttribute('aria-checked')).toBe('true')
    expect(input?.getAttribute('aria-disabled')).toBe('true')
    expect(input?.getAttribute('aria-required')).toBe('true')
  })

  it('Radio binds visible option labels to native controls and mirrors checked disabled required state', async () => {
    await act(async () => {
      root.render(
        <Radio
          name="notification-frequency"
          defaultValue="daily"
          required
          options={[
            { value: 'daily', label: 'Daily updates' },
            { value: 'never', label: 'Never notify', disabled: true },
          ]}
        />,
      )
    })

    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement | null
    const daily = container.querySelector(
      'label[data-value="daily"]',
    ) as HTMLLabelElement | null
    const never = container.querySelector(
      'label[data-value="never"]',
    ) as HTMLLabelElement | null
    const dailyInput = daily?.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement | null
    const neverInput = never?.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement | null

    expect(group?.getAttribute('aria-orientation')).toBe('vertical')
    expect(daily?.textContent).toContain('Daily updates')
    expect(never?.textContent).toContain('Never notify')
    expect(dailyInput?.labels?.[0]).toBe(daily)
    expect(neverInput?.labels?.[0]).toBe(never)
    expect(dailyInput?.getAttribute('aria-checked')).toBe('true')
    expect(dailyInput?.checked).toBe(true)
    expect(dailyInput?.required).toBe(true)
    expect(neverInput?.getAttribute('aria-disabled')).toBe('true')
    expect(neverInput?.disabled).toBe(true)
    expect(neverInput?.required).toBe(true)
  })

  it('Switcher wires its visible label to toggling and exposes checked disabled required state', async () => {
    await act(async () => {
      root.render(
        <>
          <Switcher
            name="auto-publish"
            label="Auto publish"
            defaultChecked={false}
            required
            membrane={false}
          />
          <Switcher
            name="locked-sync"
            label="Locked sync"
            defaultChecked
            disabled
            required
            membrane={false}
          />
        </>,
      )
    })

    const switchers = Array.from(
      container.querySelectorAll<HTMLElement>('.uf-switcher'),
    )
    const autoPublish =
      switchers.find((node) => node.textContent?.includes('Auto publish')) ??
      null
    const lockedSync =
      switchers.find((node) => node.textContent?.includes('Locked sync')) ??
      null
    const autoLabel = autoPublish as HTMLLabelElement | null
    const autoControl = autoPublish?.querySelector(
      'input[role="switch"]',
    ) as HTMLElement | null
    const autoInput = autoPublish?.querySelector(
      'input[role="switch"]',
    ) as HTMLInputElement | null
    const lockedControl = lockedSync?.querySelector(
      'input[role="switch"]',
    ) as HTMLElement | null
    const lockedInput = lockedSync?.querySelector(
      'input[role="switch"]',
    ) as HTMLInputElement | null
    const autoLabelText = autoLabel?.querySelector(
      '.uf-text[data-part="label"]',
    ) as HTMLElement | null

    expect(autoLabel?.textContent).toContain('Auto publish')
    expect(autoLabelText?.textContent).toContain('Auto publish')
    expect(autoLabelText?.getAttribute('data-inset')).toBe('none')
    expect(autoInput?.labels?.[0]).toBe(autoLabel)
    expect(autoControl?.getAttribute('aria-checked')).toBe('false')
    expect(autoControl?.getAttribute('aria-required')).toBe('true')
    expect(autoInput?.checked).toBe(false)
    expect(autoInput?.required).toBe(true)

    await act(async () => {
      autoLabel?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(autoControl?.getAttribute('aria-checked')).toBe('true')
    expect(autoInput?.checked).toBe(true)
    expect(lockedControl?.getAttribute('aria-checked')).toBe('true')
    expect(lockedControl?.getAttribute('aria-disabled')).toBe('true')
    expect(lockedControl?.getAttribute('aria-required')).toBe('true')
    expect(lockedInput?.checked).toBe(true)
    expect(lockedInput?.disabled).toBe(true)
    expect(lockedInput?.required).toBe(true)
  })

  it('Select binds its visible label, trigger, listbox and options', async () => {
    await act(async () => {
      root.render(
        <Select
          label="Font style"
          options={[
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const label = container.querySelector(
      '[data-part="label"]',
    ) as HTMLLabelElement | null
    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    expect(label).not.toBeNull()
    expect(trigger).not.toBeNull()
    expect(label?.id).toBeTruthy()
    expect(trigger?.id).toBeTruthy()
    expect(label?.htmlFor).toBe(trigger?.id)
    expect(trigger?.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const listbox = container.querySelector(
      '[role="listbox"]',
    ) as HTMLElement | null
    const options = Array.from(
      container.querySelectorAll<HTMLElement>('[role="option"]'),
    )
    expect(
      document
        .getElementById(trigger?.getAttribute('aria-controls') ?? '')
        ?.contains(listbox),
    ).toBe(true)
    expect(listbox?.contains(document.activeElement)).toBe(true)
    expect(listbox?.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(options).toHaveLength(2)
    expect(options.every((option) => Boolean(option.id))).toBe(true)
  })

  it('Select keyboard navigation highlights enabled options and binds active descendant', async () => {
    await act(async () => {
      root.render(
        <Select
          label="Weight"
          options={[
            { value: 'thin', label: 'Thin', disabled: true },
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
            { value: 'black', label: 'Black', disabled: true },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.hasAttribute('aria-activedescendant')).toBe(false)

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    })

    let highlighted = container.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Regular')
    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBe(highlighted?.id)

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    })

    highlighted = container.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Bold')
    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBe(highlighted?.id)

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      )
    })
    expect(
      container.querySelector<HTMLElement>('[role="option"][data-highlighted]')
        ?.textContent,
    ).toContain('Regular')

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      )
    })
    expect(
      container.querySelector<HTMLElement>('[role="option"][data-highlighted]')
        ?.textContent,
    ).toContain('Bold')

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    expect(container.querySelector('[role="listbox"]')).toBeNull()
    expect(trigger?.hasAttribute('aria-activedescendant')).toBe(false)
  })

  it('Select click selection keeps multiselect open and emits value callbacks', async () => {
    const handleValueChange = vi.fn()
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Select
          multiple
          defaultValue={[]}
          options={[
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
          ]}
          placeholder="Pick"
          onValueChange={handleValueChange}
          onOpenChange={handleOpenChange}
        />,
      )
    })

    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })

    const regularOption =
      Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((node) => node.textContent?.includes('Regular')) ?? null
    expect(regularOption).not.toBeNull()

    await act(async () => {
      regularOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[role="listbox"]')).not.toBeNull()
    expect(trigger?.textContent).toContain('Regular')
    expect(handleValueChange).toHaveBeenLastCalledWith({ value: ['regular'] })
  })

  it('Date switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(<Date />)
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    const calendar = content?.querySelector(
      '.uf-calendar[data-scope="calendar"]',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(calendar).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    expect(content?.textContent).toContain('Choose date')

    const componentStyles = readComponentStyles()
    expect(componentStyles).toMatch(
      /\.uf-date__content\[data-surface="sheet"\] \.uf-date__grid,\s*\.uf-date__content\[data-surface="sheet"\] \.uf-calendar\[data-scope="calendar"\] \{\s*width: 100%;\s*inline-size: 100%;\s*min-inline-size: 0;\s*\}/,
    )
    expect(componentStyles).toContain(
      '.uf-date__content[data-surface="sheet"] .uf-date__grid > .uf-membrane',
    )
  })

  it('Date keeps auto surfaces as a popover on wide viewports', async () => {
    restoreMatchMedia?.setMatches(false)

    await act(async () => {
      root.render(<Date />)
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(content?.hidden).toBe(false)
    expect(document.querySelector('.uf-responsive-overlay-backdrop')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(container.textContent).not.toContain('Choose date')
  })

  it('Date reevaluates auto surfaces after crossing the responsive breakpoint', async () => {
    await act(async () => {
      root.render(<Date />)
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(document.body.style.overflow).toBe('hidden')

    restoreMatchMedia?.setMatches(false)

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(document.querySelector('.uf-responsive-overlay-backdrop')).toBeNull()
    expect(document.body.style.overflow).toBe('')

    restoreMatchMedia?.setMatches(true)

    await act(async () => {
      restoreMatchMedia?.dispatchChange()
    })

    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(
      document.querySelector('.uf-responsive-overlay-backdrop'),
    ).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Date exposes visible label and keyboard dialog trigger semantics', async () => {
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Date
          label="Start date"
          placeholder="Pick start"
          required
          surface="popover"
          onOpenChange={handleOpenChange}
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="date"][data-part="root"]',
    ) as HTMLElement | null
    const label = container.querySelector(
      '.uf-date__label',
    ) as HTMLLabelElement | null
    const trigger = container.querySelector(
      '[data-scope="date"][data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(rootNode?.getAttribute('data-mode')).toBe('date')
    expect(rootNode?.getAttribute('data-state')).toBe('closed')
    expect(label?.tagName).toBe('LABEL')
    expect(label?.textContent).toContain('Start date')
    expect(label?.textContent).toContain('*')
    expect(trigger?.type).toBe('button')
    expect(trigger?.getAttribute('role')).toBe('combobox')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.textContent).toContain('Pick start')
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
    expect(
      document.querySelector('[data-scope="date"][role="dialog"]'),
    ).toBeNull()

    const openEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      trigger?.dispatchEvent(openEvent)
    })

    expect(openEvent.defaultPrevented).toBe(true)
    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })
    expect(rootNode?.getAttribute('data-state')).toBe('open')
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    expect(content?.getAttribute('role')).toBe('dialog')
    expect(
      document.getElementById(content?.getAttribute('aria-labelledby') ?? '')
        ?.textContent,
    ).toBe('Start date')
    expect(content?.hidden).toBe(false)

    const closeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      content?.dispatchEvent(closeEvent)
    })

    expect(closeEvent.defaultPrevented).toBe(true)
    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: false })
    expect(rootNode?.getAttribute('data-state')).toBe('closed')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(content?.isConnected).toBe(false)
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
  })

  it('Tooltip exposes non-interactive tooltip semantics from the focusable trigger', async () => {
    await act(async () => {
      root.render(
        <Tooltip
          content="Exports the current report."
          openDelay={0}
          closeDelay={0}
        >
          Export
        </Tooltip>,
      )
    })

    const trigger = container.querySelector(
      '[data-scope="overlay"][data-part="trigger"]',
    ) as HTMLElement | null
    const button = trigger as HTMLButtonElement | null
    let content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) =>
        node.textContent?.includes('Exports the current report.'),
      ) ?? null

    expect(trigger).not.toBeNull()
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Export')
    expect(trigger?.getAttribute('aria-expanded')).toBeNull()
    expect(content?.getAttribute('role')).toBe('tooltip')
    expect(content?.getAttribute('data-trigger')).toBe('hover')
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)

    await act(async () => {
      button?.focus()
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) =>
        node.textContent?.includes('Exports the current report.'),
      ) ?? null

    expect(document.activeElement).toBe(button)
    expect(trigger?.getAttribute('aria-describedby')).toBe(
      content?.id,
    )
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hidden).toBe(false)

    await act(async () => {
      button?.blur()
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) =>
        node.textContent?.includes('Exports the current report.'),
      ) ?? null

    expect(trigger?.getAttribute('aria-expanded')).toBeNull()
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)
  })

  it('Popover opens from its semantic trigger and focuses interactive content', async () => {
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Popover
          content={<button type="button">Popover action</button>}
          onOpenChange={handleOpenChange}
        >
          Open popover
        </Popover>,
      )
    })

    const trigger = container.querySelector(
      '[data-scope="overlay"][data-part="trigger"]',
    ) as HTMLElement | null
    const button = trigger as HTMLButtonElement | null
    let content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) => node.textContent?.includes('Popover action')) ?? null
    const action = content?.querySelector('button') as HTMLButtonElement | null

    expect(trigger).not.toBeNull()
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Open popover')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('data-state')).toBe('closed')
    expect(content?.getAttribute('data-trigger')).toBe('click')
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)
    expect(action?.textContent).toContain('Popover action')

    await act(async () => {
      button?.focus()
    })

    expect(document.activeElement).toBe(button)

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) => node.textContent?.includes('Popover action')) ?? null

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect(trigger?.getAttribute('data-state')).toBe('open')
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hidden).toBe(false)
    expect(document.activeElement).toBe(action)

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) => node.textContent?.includes('Popover action')) ?? null

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: false })
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('data-state')).toBe('closed')
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)
    expect(document.activeElement).toBe(button)
  })

  it('Menu switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            { value: 'paste', label: 'Paste' },
          ]}
        >
          Open menu
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Open menu'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Open menu')
  })

  it('Menu binds popup semantics and keyboard handlers to the focusable child trigger', async () => {
    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            { value: 'paste', label: 'Paste' },
          ]}
        >
          <Button text="Open menu" fullWidth={false} membrane={false} />
        </Menu>,
      )
    })

    const wrapper = container.querySelector(
      '.uf-menu-trigger',
    ) as HTMLElement | null
    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    expect(wrapper).not.toBeNull()
    expect(trigger).not.toBeNull()
    expect(wrapper).toBe(trigger)
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('aria-controls')).toBeTruthy()

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    const controlledContent = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    )
    expect(controlledContent?.getAttribute('data-scope')).toBe('menu')
    expect(controlledContent?.hidden).toBe(false)
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(controlledContent?.hidden).toBe(true)
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('Menu applies explicit popover alignment, trigger offset, and membrane surface', async () => {
    await act(async () => {
      root.render(
        <Menu
          surface="popover"
          align="start"
          sideOffset={4}
          items={[{ value: 'copy', label: 'Copy' }]}
        >
          <Button text="Open menu" fullWidth={false} membrane={false} />
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    const triggerAnchor = container.querySelector(
      '.uf-menu-trigger',
    ) as HTMLElement | null
    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(trigger).not.toBeNull()
    expect(triggerAnchor).not.toBeNull()
    expect(content).not.toBeNull()

    Object.defineProperty(triggerAnchor, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 40,
        right: 180,
        bottom: 72,
        left: 100,
        width: 80,
        height: 32,
        x: 100,
        y: 40,
        toJSON: () => {},
      }),
    })
    Object.defineProperty(content, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 0,
        right: 0,
        bottom: 100,
        left: 0,
        width: 160,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    })

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(content?.style.left).toBe('100px')
    expect(content?.style.top).toBe('76px')

    const membrane = content?.querySelector(
      '.uf-menu-contentMembrane',
    ) as HTMLElement | null
    const panel = content?.querySelector(
      '.uf-menu-contentPanel',
    ) as HTMLElement | null
    expect(membrane).not.toBeNull()
    expect(membrane?.classList.contains('uf-membrane')).toBe(true)
    expect(membrane?.classList.contains('uf-membrane--full')).toBe(true)
    expect(panel?.getAttribute('data-scope')).toBe('card')
    expect(panel?.getAttribute('data-card-variant')).toBe('default')
    expect(panel?.getAttribute('data-padding')).toBe('membrane')
    expect(panel?.hasAttribute('data-full-width')).toBe(true)

    const componentStyles = readComponentStyles()
    const menuPanelBlock =
      componentStyles.match(/\.uf-menu-contentPanel\s*\{[^}]*\}/)?.[0] ?? ''
    expect(menuPanelBlock).not.toContain('max-height')
  })

  it('Menu dismisses on outside pointerdown before bubbled events can be stopped', async () => {
    await act(async () => {
      root.render(
        <>
          <Menu surface="popover" items={[{ value: 'copy', label: 'Copy' }]}>
            <Button text="Open menu" fullWidth={false} membrane={false} />
          </Menu>
          <button
            type="button"
            data-testid="outside-stop"
            onPointerDown={(event) => event.stopPropagation()}
          >
            Outside
          </button>
        </>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    const outside = container.querySelector(
      '[data-testid="outside-stop"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.hidden).toBe(false)

    await act(async () => {
      outside?.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await Promise.resolve()
    })

    expect(content?.hidden).toBe(true)
  })

  it('Menu dismisses on outside click when pointerdown is not delivered', async () => {
    await act(async () => {
      root.render(
        <>
          <Menu surface="popover" items={[{ value: 'copy', label: 'Copy' }]}>
            <Button text="Open menu" fullWidth={false} membrane={false} />
          </Menu>
          <button type="button" data-testid="outside-click">
            Outside
          </button>
        </>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    const outside = container.querySelector(
      '[data-testid="outside-click"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.hidden).toBe(false)

    await act(async () => {
      outside?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(content?.hidden).toBe(true)
  })

  it('Menu keeps context trigger behavior in the React adapter', async () => {
    await act(async () => {
      root.render(
        <Menu
          trigger="context"
          surface="popover"
          items={[{ value: 'inspect', label: 'Inspect' }]}
        >
          <Button text="Context target" fullWidth={false} membrane={false} />
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Context target'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      await Promise.resolve()
    })

    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.hidden).toBe(false)
    expect(content?.textContent).toContain('Inspect')
  })

  it('Menu roves focus across enabled items and selects highlighted items from the keyboard', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            { value: 'paste', label: 'Paste', disabled: true },
            { value: 'delete', label: 'Delete' },
          ]}
          onSelect={handleSelect}
        >
          <Button text="Open menu" fullWidth={false} membrane={false} />
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    let highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    const disabledItem =
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
      ).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(highlighted?.textContent).toContain('Copy')
    expect(document.activeElement).toBe(highlighted)
    expect(disabledItem?.disabled).toBe(true)

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Delete')
    expect(document.activeElement).toBe(highlighted)

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
      )
    })
    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Copy')

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
      )
    })
    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Delete')

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
      )
    })
    expect(
      container.querySelector<HTMLElement>(
        '[data-scope="menu"][data-part="content"]',
      )?.hidden,
    ).toBe(true)
    expect(handleSelect).not.toHaveBeenCalled()

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'd' }),
      )
    })
    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Delete')

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: ' ' }),
      )
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenLastCalledWith({ value: 'delete' })
    expect(
      container.querySelector<HTMLElement>(
        '[data-scope="menu"][data-part="content"]',
      )?.hidden,
    ).toBe(true)
  })

  it('Menu typeahead uses textValue for custom group item labels', async () => {
    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            {
              type: 'group',
              label: 'More',
              items: [
                {
                  value: 'preferences',
                  label: (
                    <span aria-label="Preferences">
                      <span aria-hidden="true">#</span>
                    </span>
                  ),
                  textValue: 'Preferences',
                },
              ],
            },
          ]}
        >
          <Button text="Open menu" fullWidth={false} membrane={false} />
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector<HTMLElement>(
      '[data-scope="menu"][data-part="content"]',
    )
    expect(content?.hidden).toBe(false)

    await act(async () => {
      content?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'p' }),
      )
    })

    const highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.dataset.value).toBe('preferences')
  })

  it('allows forcing desktop popover surfaces on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          surface="popover"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    const content =
      document
        .getElementById(contentId)
        ?.closest<HTMLElement>('[data-part="content"]') ?? null
    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(
      container.querySelector('.uf-responsive-overlay-backdrop'),
    ).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('Select uses the shared outside click fallback for popover dismissal', async () => {
    await act(async () => {
      root.render(
        <>
          <Select
            surface="popover"
            options={[
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ]}
          />
          <button type="button" data-testid="select-outside-click">
            Outside
          </button>
        </>,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    const outside = container.querySelector(
      '[data-testid="select-outside-click"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    expect(document.getElementById(contentId)).not.toBeNull()

    await act(async () => {
      outside?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(document.getElementById(contentId)).toBeNull()
  })

  it('Command binds combobox, grouped listbox and keyboard active-descendant semantics', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          surface="inline"
          placeholder="Search commands"
          groups={[{ id: 'edit', label: 'Edit' }]}
          items={[
            { id: 'copy', label: 'Copy', group: 'edit' },
            { id: 'paste', label: 'Paste', group: 'edit', disabled: true },
            { id: 'cut', label: 'Cut', group: 'edit' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="command"][data-part="root"]',
    ) as HTMLElement | null
    const input = container.querySelector(
      '[data-scope="command"][data-part="input"]',
    ) as HTMLInputElement | null
    const listbox = container.querySelector(
      '[data-scope="command"][data-part="list"]',
    ) as HTMLElement | null
    const group = container.querySelector(
      '[data-scope="command"][data-part="group"]',
    ) as HTMLElement | null
    const groupLabel = container.querySelector(
      '[data-scope="command"][data-part="groupLabel"]',
    ) as HTMLElement | null
    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    )
    const copy =
      options.find((option) => option.dataset.value === 'copy') ?? null
    const paste =
      options.find((option) => option.dataset.value === 'paste') ?? null
    const cut = options.find((option) => option.dataset.value === 'cut') ?? null

    expect(rootNode?.getAttribute('data-state')).toBe('idle')
    expect(input?.getAttribute('role')).toBe('combobox')
    expect(input?.getAttribute('aria-expanded')).toBe('true')
    expect(input?.getAttribute('aria-controls')).toBe(listbox?.id)
    expect(input?.getAttribute('aria-activedescendant')).toBe(copy?.id)
    expect(listbox?.getAttribute('role')).toBe('listbox')
    expect(listbox?.getAttribute('aria-label')).toBe('Command items')
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.getAttribute('aria-labelledby')).toBe(groupLabel?.id)
    expect(groupLabel?.getAttribute('role')).toBe('presentation')
    expect(options).toHaveLength(3)
    expect(copy?.getAttribute('aria-selected')).toBe('true')
    expect(paste?.hasAttribute('data-disabled')).toBe(true)
    expect(paste?.getAttribute('aria-selected')).toBe('false')

    await act(async () => {
      input?.focus()
    })

    expect(rootNode?.getAttribute('data-state')).toBe('focused')

    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    })

    expect(input?.getAttribute('aria-activedescendant')).toBe(cut?.id)
    expect(cut?.getAttribute('aria-selected')).toBe('true')
    expect(paste?.getAttribute('aria-selected')).toBe('false')

    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect.mock.calls.at(-1)?.[0]).toMatchObject({
      item: { id: 'cut' },
    })
  })

  it('Command switches auto surfaces to a dialog on compact viewports', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          items={[
            { id: 'copy', label: 'Copy' },
            { id: 'paste', label: 'Paste' },
            { id: 'cut', label: 'Cut' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    expect(container.querySelector('[role="combobox"]')).toBeNull()

    const trigger = container.querySelector(
      '.uf-command__trigger',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const input = container.querySelector(
      '[role="combobox"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    expect(
      container.querySelector('.uf-command .uf-responsive-sheetHeader'),
    ).toBeNull()

    const pasteButton =
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('.uf-command-item'),
      ).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(pasteButton).not.toBeNull()

    await act(async () => {
      pasteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(
      container.querySelector('.uf-command__dialog[data-state=\"open\"]'),
    ).toBeNull()
  })

  it('Panel switches auto surfaces to a left drawer on compact viewports', async () => {
    await act(async () => {
      root.render(<Panel items={[]} />)
    })

    const trigger = container.querySelector(
      '.uf-sidebar-sheetTrigger',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const panel = document.body.querySelector(
      '.uf-sidebar-sheet',
    ) as HTMLElement | null
    expect(panel?.getAttribute('data-placement')).toBe('left')
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Navigation switches auto surfaces to a selection sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={[
            { id: 'home', label: 'Home' },
            {
              id: 'library',
              label: 'Library',
              items: [{ id: 'typefaces', label: 'Typefaces' }],
            },
          ]}
        />,
      )
    })

    const trigger = container.querySelector(
      '.uf-navigation-sheetTrigger',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const panel = document.body.querySelector(
      '.uf-navigation-sheet',
    ) as HTMLElement | null
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(panel?.textContent).toContain('Navigation')
    expect(panel?.textContent).toContain('Typefaces')
  })

  it('Modal edge placement contains focus and restores trigger focus', async () => {
    await act(async () => {
      root.render(
        <Modal
          trigger="Open inspector"
          title="Responsive inspector"
          placement="right"
          edge="flush"
          actions={[
            { label: 'Cancel', variant: 'outline' },
            { label: 'Save', variant: 'accent' },
          ]}
        >
          <button type="button">Inner action</button>
        </Modal>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open inspector'),
      ) ?? null
    expect(trigger).not.toBeNull()

    trigger?.focus()
    expect(document.activeElement).toBe(trigger)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dialog = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="content"]',
    )
    const positioner = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="positioner"]',
    )
    const buttons = Array.from(
      dialog?.querySelectorAll<HTMLButtonElement>('button') || [],
    )
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const close =
      dialog?.querySelector<HTMLButtonElement>('[data-part="close"]') ?? null

    expect(dialog?.hidden).toBe(false)
    expect(dialog?.getAttribute('data-edge')).toBe('flush')
    expect(positioner?.getAttribute('data-variant')).toBe('right')
    expect(dialog?.contains(document.activeElement)).toBe(true)
    expect(close).toBe(first)
    expect(last?.textContent).toContain('Save')

    last?.focus()
    const forwardTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      last?.dispatchEvent(forwardTab)
    })
    expect(forwardTab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)

    first?.focus()
    const backwardTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      first?.dispatchEvent(backwardTab)
    })
    expect(backwardTab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)

    await act(async () => {
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(
      document.body.querySelector<HTMLElement>(
        '[data-scope="modal"][data-part="content"]',
      )?.hidden,
    ).toBe(true)
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps center placement centered on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Modal trigger="Open modal" title="Responsive modal">
          Body
        </Modal>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Open modal'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const positioner = document.body.querySelector(
      '[data-scope="modal"][data-part="positioner"]',
    ) as HTMLElement | null
    expect(positioner?.getAttribute('data-variant')).toBe('center')
  })
})
