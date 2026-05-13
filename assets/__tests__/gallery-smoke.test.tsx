// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import FaceUiReact from '../../face-ui-react'

function setNativeInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  expect(setter).toBeTypeOf('function')
  setter?.call(element, value)
}

function getGalleryCard(container: HTMLElement, title: string): HTMLElement {
  const cards = Array.from(container.querySelectorAll<HTMLElement>('.uf-gallery-item'))
  const card = cards.find((item) => item.querySelector('.uf-gallery-itemTitle')?.textContent?.trim() === title)
  expect(card, `Gallery card "${title}" should exist`).toBeTruthy()
  return card as HTMLElement
}

function hasGalleryCard(container: HTMLElement, title: string): boolean {
  return Array.from(container.querySelectorAll<HTMLElement>('.uf-gallery-item')).some(
    (item) => item.querySelector('.uf-gallery-itemTitle')?.textContent?.trim() === title,
  )
}

describe('face-ui-react gallery smoke', () => {
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

  it('keeps stateful showcase cards interactive', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    expect(hasGalleryCard(container, 'Resizable')).toBe(false)
    expect(hasGalleryCard(container, 'Overlay')).toBe(false)
    expect(hasGalleryCard(container, 'Toggle')).toBe(false)

    const carouselCard = getGalleryCard(container, 'Carousel')
    const nextSlide = carouselCard.querySelector('[data-part="next"]') as HTMLButtonElement | null
    const slideOne = carouselCard.querySelector('[data-part="slide"][data-index="0"]') as HTMLElement | null
    const slideTwo = carouselCard.querySelector('[data-part="slide"][data-index="1"]') as HTMLElement | null
    await act(async () => {
      nextSlide?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(slideOne?.hasAttribute('data-current')).toBe(false)
    expect(slideTwo?.getAttribute('data-current')).toBe('')
    const activeIndicator = carouselCard.querySelector('[data-part="indicator-item"][data-index="1"]') as HTMLButtonElement | null
    expect(activeIndicator?.getAttribute('data-state')).toBe('active')

    const navigationCard = getGalleryCard(container, 'Navigation')
    const settingsButton = Array.from(navigationCard.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Settings')) ?? null
    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const activeSettingsButton = Array.from(navigationCard.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Settings')) ?? null
    expect(activeSettingsButton?.getAttribute('data-variant')).toBe('default')

    const paginationCard = getGalleryCard(container, 'Pagination')
    const nextPage = paginationCard.querySelector('[data-part="next"]') as HTMLButtonElement | null
    await act(async () => {
      nextPage?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const pageTwoButton = paginationCard.querySelector('.uf-pagination-current[data-scope="text"]') as HTMLElement | null
    expect(pageTwoButton?.getAttribute('aria-current')).toBe('page')
    expect(pageTwoButton?.textContent).toBe('7')

    const ratingCard = getGalleryCard(container, 'Rating')
    const ratingStars = Array.from(ratingCard.querySelectorAll<HTMLButtonElement>('.uf-rating-star'))
    await act(async () => {
      ratingStars[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(ratingStars[3]?.getAttribute('aria-checked')).toBe('true')

    const sliderCard = getGalleryCard(container, 'Slider')
    const sliderInput = sliderCard.querySelector('.uf-slider--advanced input[type="range"]') as HTMLInputElement | null
    await act(async () => {
      if (!sliderInput) return
      setNativeInputValue(sliderInput, '41')
      sliderInput.dispatchEvent(new Event('input', { bubbles: true }))
      sliderInput.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const updatedSliderThumb = sliderCard.querySelector('.uf-slider--advanced .uf-slider-thumbButton [data-part="text"]') as HTMLElement | null
    expect(updatedSliderThumb?.textContent).toContain('41')
    expect(sliderCard.textContent).toContain('Crop')

    const stepsCard = getGalleryCard(container, 'Steps')
    const profileStep = Array.from(stepsCard.querySelectorAll<HTMLButtonElement>('[data-part="trigger"]')).find((button) => button.textContent?.includes('Profile')) ?? null
    await act(async () => {
      profileStep?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(profileStep?.getAttribute('data-state')).toBe('active')
    expect(stepsCard.textContent).toContain('Add brand settings, themes, and team details.')

    const switcherCard = getGalleryCard(container, 'Switcher')
    const switcherControl = switcherCard.querySelector('[role="switch"]') as HTMLElement | null
    await act(async () => {
      switcherControl?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(switcherControl?.getAttribute('aria-checked')).toBe('true')

    const tabsCard = getGalleryCard(container, 'Tabs')
    const tabB = tabsCard.querySelector('[role="tab"][data-value="b"]') as HTMLButtonElement | null
    const tabBPanel = tabsCard.querySelector('#tabs\\:content\\:b') as HTMLElement | null
    await act(async () => {
      tabB?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(tabBPanel?.hidden).toBe(false)

    const tocCard = getGalleryCard(container, 'Toc')
    const setupItem = Array.from(tocCard.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Setup')) ?? null
    await act(async () => {
      setupItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(setupItem?.getAttribute('aria-current')).toBe('location')
    expect(tocCard.textContent).toContain('Themes')

    const segmentedCard = getGalleryCard(container, 'SegmentedControl')
    const listSegment = Array.from(segmentedCard.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'List') ?? null
    await act(async () => {
      listSegment?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(listSegment?.getAttribute('data-state')).toBe('on')

    const treeCard = getGalleryCard(container, 'Tree')
    const treeBranch = treeCard.querySelector('[data-tree-node-id="src"]') as HTMLButtonElement | null
    expect(treeCard.querySelector('[data-part="branchContent"][data-value="src"]')?.hasAttribute('hidden')).toBe(false)
    await act(async () => {
      treeBranch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(treeCard.querySelector('[data-part="branchContent"][data-value="src"]')?.hasAttribute('hidden')).toBe(true)

    await act(async () => {
      treeBranch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(treeCard.querySelector('[data-part="branchContent"][data-value="src"]')?.hasAttribute('hidden')).toBe(false)

    const treeChild = treeCard.querySelector('[data-tree-node-id="index"]') as HTMLButtonElement | null
    await act(async () => {
      treeChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(treeChild?.getAttribute('data-selected')).toBe('')
  })

  it('does not let the panel showcase steal focus or preview-only geometry', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()

    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const panelCard = getGalleryCard(container, 'Panel')
    expect(panelCard.contains(document.activeElement)).toBe(false)

    const previewButtons = Array.from(panelCard.querySelectorAll<HTMLButtonElement>('.uf-sidebar-preview-item[data-scope="button"]'))
    expect(previewButtons.length).toBeGreaterThan(0)
    expect(previewButtons.every((button) => button.getAttribute('data-variant') === 'default')).toBe(true)
    expect(previewButtons.some((button) => button.hasAttribute('data-selected'))).toBe(true)
    expect(panelCard.querySelector('.uf-sidebar-preview-separator')).toBeNull()
    expect(panelCard.textContent).toContain('Workspace')
    expect(panelCard.textContent).toContain('Tools')
    expect(panelCard.textContent).toContain('Structure')

    const panelTreeSelected = panelCard.querySelector('.uf-sidebar-preview-tree [aria-selected="true"]') as HTMLElement | null
    expect(panelTreeSelected).toBeNull()

    outside.remove()
  })

  it('keeps the command showcase searchable', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const commandCard = getGalleryCard(container, 'Command')
    const input = commandCard.querySelector('[role="combobox"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(commandCard.textContent).toContain('Copy')
    expect(commandCard.textContent).toContain('Paste')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, 'pa')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(input?.value).toBe('pa')
    expect(commandCard.textContent).not.toContain('Copy')
    expect(commandCard.textContent).toContain('Paste')
  })

  it('keeps modal, calendar, date, and select showcase cards interactive', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const modalCard = getGalleryCard(container, 'Modal')
    const modalTrigger = Array.from(modalCard.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Open')) ?? null
    const modalContent = modalCard.querySelector('[data-part="content"]') as HTMLElement | null
    expect(modalContent?.hidden).toBe(true)

    await act(async () => {
      modalTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(modalContent?.hidden).toBe(false)

    const calendarCard = getGalleryCard(container, 'Calendar')
    const calendarDayButtons = Array.from(calendarCard.querySelectorAll<HTMLButtonElement>('.uf-calendar-dayButton'))
    const calendarDay = calendarDayButtons.find((button) =>
      button.getAttribute('data-disabled') == null && button.getAttribute('data-outside') == null,
    )
    expect(calendarDay).toBeTruthy()

    await act(async () => {
      calendarDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(calendarDay?.getAttribute('data-selected')).not.toBeNull()

    const dateCard = getGalleryCard(container, 'DatePicker')
    const dateTrigger = dateCard.querySelector('button') as HTMLButtonElement | null
    expect(dateTrigger?.textContent).toContain('Pick date')

    await act(async () => {
      dateTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dayButtons = Array.from(dateCard.querySelectorAll<HTMLButtonElement>('.uf-calendar-dayButton'))
    const selectableDay = dayButtons.find((button) => button.getAttribute('data-disabled') == null)
    expect(selectableDay).toBeTruthy()

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(dateTrigger?.textContent).not.toContain('Pick date')

    const selectCard = getGalleryCard(container, 'Select')
    const selectTrigger = selectCard.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    expect(selectTrigger?.textContent).toContain('Option 1')

    await act(async () => {
      selectTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const selectContentId = selectTrigger?.getAttribute('aria-controls') ?? ''
    const selectContentRoot = document.getElementById(selectContentId)
    const selectContent = selectContentRoot?.querySelector('.uf-select__contentMembrane') as HTMLElement | null
    expect(selectContent).not.toBeNull()

    const optionTwo = Array.from(selectContentRoot?.querySelectorAll<HTMLElement>('[data-part="option"]') ?? []).find((node) => node.textContent?.includes('Option 2')) ?? null
    expect(optionTwo).not.toBeNull()

    await act(async () => {
      optionTwo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(selectTrigger?.textContent).toContain('Option 2')
  })
})
