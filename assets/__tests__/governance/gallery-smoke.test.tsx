import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import FaceUiReact from '../../../face-ui-react'
import { FELD_GALLERY_META } from '../../../gallery'
import { libraryCss, mount } from '../harness'

function setNativeInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  expect(setter).toBeTypeOf('function')
  setter?.call(element, value)
}

function getGalleryCard(container: HTMLElement, title: string): HTMLElement {
  const cards = Array.from(
    container.querySelectorAll<HTMLElement>('.uf-gallery-item'),
  )
  const card = cards.find(
    (item) =>
      item.querySelector('.uf-gallery-itemTitle')?.textContent?.trim() ===
      title,
  )
  expect(card, `Gallery card "${title}" should exist`).toBeTruthy()
  return card as HTMLElement
}

function hasGalleryCard(container: HTMLElement, title: string): boolean {
  return Array.from(
    container.querySelectorAll<HTMLElement>('.uf-gallery-item'),
  ).some(
    (item) =>
      item.querySelector('.uf-gallery-itemTitle')?.textContent?.trim() ===
      title,
  )
}

describe('face-ui-react gallery smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('renders every active face.json gallery component with non-empty preview content', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const activeNames = FELD_GALLERY_META.map((entry) => entry.name).sort(
      (left, right) => left.localeCompare(right),
    )
    const cardTitles = Array.from(
      container.querySelectorAll<HTMLElement>('.uf-gallery-itemTitle'),
    )
      .map((node) => node.textContent?.trim() || '')
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))

    expect(cardTitles).toEqual(activeNames)
    expect(container.textContent).not.toContain('Preview error')
    expect(container.textContent).not.toContain('No component export')

    for (const name of activeNames) {
      const card = getGalleryCard(container, name)
      const surface = card.querySelector<HTMLElement>('.uf-gallery-itemSurface')
      expect(surface, `${name} should have a preview surface`).not.toBeNull()
      expect(
        surface?.querySelector(
          '[data-scope], svg, img, video, canvas, input, textarea, button, table, [role]',
        ),
        `${name} should render visible component DOM in its preview surface`,
      ).not.toBeNull()
    }
  })

  it('keeps the root showcase as a full-width visible flow layout', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const gallery = container.querySelector<HTMLElement>('.uf-gallery')
    const headerTitle =
      container.querySelector<HTMLElement>('.uf-gallery-title')
    const headerButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.uf-gallery-icon-button[data-scope="button"][data-icon-only]',
      ),
    )
    const firstCard = container.querySelector<HTMLElement>('.uf-gallery-item')
    const firstTitle = firstCard?.querySelector<HTMLElement>(
      '.uf-gallery-itemTitle',
    )
    const firstPreview = firstCard?.querySelector<HTMLElement>(
      '.uf-gallery-itemPreview',
    )
    const firstSurface = firstCard?.querySelector<HTMLElement>(
      '.uf-gallery-itemSurface',
    )
    const componentStyles = libraryCss()
    const galleryGeneratorSource = readFileSync(
      join(process.cwd(), 'scripts/generate-components-gallery.mjs'),
      'utf8',
    )
    const runtimeSource = readFileSync(
      join(process.cwd(), 'uf.runtime.ts'),
      'utf8',
    )

    expect(gallery).not.toBeNull()
    expect(headerTitle?.getAttribute('data-inset')).toBe('control')
    expect(headerTitle?.getAttribute('data-full-width')).toBe('')
    expect(headerTitle?.getAttribute('data-truncate')).toBe('')
    expect(headerTitle?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )
    expect(
      headerTitle?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)
    expect(headerButtons).toHaveLength(2)
    expect(
      headerButtons.every((button) =>
        button.parentElement?.classList.contains('uf-membrane'),
      ),
    ).toBe(true)
    expect(firstCard).not.toBeNull()
    expect(firstTitle?.getAttribute('data-full-width')).toBe('')
    expect(firstTitle?.getAttribute('data-truncate')).toBe('')
    expect(
      firstTitle?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)
    expect(firstPreview).not.toBeNull()
    expect(firstSurface).not.toBeNull()
    expect(firstSurface?.getAttribute('data-card-variant')).toBe('default')
    expect(firstSurface?.getAttribute('data-padding')).toBe('default')
    expect(firstSurface?.getAttribute('data-radius')).toBe('md')
    expect(firstSurface?.getAttribute('data-border')).toBe('false')
    expect(componentStyles).toContain('.uf-gallery {')
    expect(componentStyles).toContain(
      '--face-gallery-inset: var(--uf-gallery-inset);',
    )
    expect(componentStyles).toContain('--face-gallery-grid-pad-top: 0px;')
    expect(componentStyles).toContain(
      '--face-gallery-surface-radius: var(--uf-radius-lg);',
    )
    expect(componentStyles).toContain('max-width: none;')
    expect(componentStyles).toContain(
      '--face-gallery-frame-min-height: 100dvh;',
    )
    expect(componentStyles).toContain('height: 100%;')
    expect(componentStyles).toContain(
      'min-height: var(--face-gallery-frame-min-height);',
    )
    expect(componentStyles).toContain('padding: var(--face-gallery-inset);')
    expect(componentStyles).toContain('--face-gallery-frame-bg: transparent;')
    expect(componentStyles).toContain(
      '--face-gallery-surface-bg: var(--uf-overlay-surface-bg);',
    )
    expect(componentStyles).toContain(
      'background: var(--face-gallery-frame-bg);',
    )
    expect(componentStyles).toContain('overflow: hidden;')
    expect(componentStyles).toContain('align-content: start;')
    expect(componentStyles).toContain('overflow: auto;')
    expect(componentStyles).toContain(
      '.uf-gallery-icon-button[data-scope="button"][data-icon-only]',
    )
    expect(componentStyles).toContain('.uf-gallery-item > .uf-membrane')
    expect(componentStyles).toContain('.uf-gallery-itemPreview {')
    expect(componentStyles).toContain('.uf-gallery-itemSurface {')
    expect(componentStyles).not.toContain('[data-card-variant="showcase"]')
    expect(componentStyles).toContain(
      '--uf-card-bg: var(--face-gallery-surface-bg, var(--uf-overlay-surface-bg));',
    )
    expect(componentStyles).not.toContain(
      '.uf-gallery-itemSurface:has(> .uf-card[data-scope]),',
    )
    expect(galleryGeneratorSource).toContain(
      'function getDefaultStateProps(contract)',
    )
    expect(galleryGeneratorSource).not.toContain('gallery.samples.json')
    expect(runtimeSource).toContain("maxWidth: '100%'")
    expect(runtimeSource).toContain("fullFrameComponents: ['face-ui-react']")
    expect(runtimeSource).toContain("'face-ui-react'")
  })

  it('renders the Card showcase from its default state with structured footer content', async () => {
    const bodyText =
      'Workspace settings and recent activity stay grouped in one place'

    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const card = getGalleryCard(container, 'Card')
    const preview = card.querySelector<HTMLElement>('.uf-gallery-itemSurface')
    const cardRoot = preview?.querySelector<HTMLElement>('[data-scope="card"]')
    const footerButton =
      cardRoot?.querySelector<HTMLButtonElement>(
        '[data-part="footer"] [data-scope="button"]',
      ) ?? null

    expect(cardRoot).not.toBeNull()
    expect(cardRoot?.textContent).toContain('Card Title')
    expect(cardRoot?.textContent).not.toContain('Card description text')
    expect(cardRoot?.textContent).toContain(bodyText)
    expect(cardRoot?.textContent).not.toContain('[object Object]')
    expect(footerButton?.textContent).toContain('Open')
    expect(footerButton?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )

    const textNodes = Array.from(
      cardRoot?.querySelectorAll<HTMLElement>('[data-scope="text"]') ?? [],
    )
    const titleText =
      textNodes.find((node) => node.textContent?.trim() === 'Card Title') ??
      null
    const contentText =
      textNodes.find((node) => node.textContent?.trim() === bodyText) ?? null
    expect(titleText?.getAttribute('data-inset')).toBe('control')
    expect(titleText?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )
    expect(
      titleText?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)
    expect(contentText?.getAttribute('data-inset')).toBe('control')
    expect(contentText?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )
  })

  it('keeps stateful showcase cards interactive', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    expect(hasGalleryCard(container, 'Resizable')).toBe(false)
    expect(hasGalleryCard(container, 'Overlay')).toBe(false)
    expect(hasGalleryCard(container, 'Toggle')).toBe(false)

    const carouselCard = getGalleryCard(container, 'Carousel')
    const nextSlide = carouselCard.querySelector(
      '[data-scope="button"][data-part="next"]',
    ) as HTMLButtonElement | null
    const slideOne = carouselCard.querySelector(
      '[data-part="slide"][data-index="0"]',
    ) as HTMLElement | null
    const slideTwo = carouselCard.querySelector(
      '[data-part="slide"][data-index="1"]',
    ) as HTMLElement | null
    const mediaSlide = carouselCard.querySelector(
      '[data-scope="media"].uf-carousel-slideMedia',
    ) as HTMLElement | null
    const mediaImage =
      mediaSlide?.querySelector<HTMLImageElement>('img') ?? null
    const inactiveIndicatorBefore = carouselCard.querySelector(
      '[data-scope="button"][data-part="indicator-item"][data-state="inactive"] svg[data-icon="radio-off"]',
    ) as HTMLElement | null
    expect(mediaSlide).not.toBeNull()
    expect(mediaImage?.getAttribute('src')).toBe(
      '/assets/media/examples/office-core/lobby-day.webp',
    )
    expect(inactiveIndicatorBefore).not.toBeNull()
    await act(async () => {
      nextSlide?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(slideOne?.hasAttribute('data-current')).toBe(false)
    expect(slideTwo?.getAttribute('data-current')).toBe('')
    const activeIndicator = carouselCard.querySelector(
      '[data-scope="button"][data-part="indicator-item"][data-index="1"]',
    ) as HTMLButtonElement | null
    expect(activeIndicator?.getAttribute('data-state')).toBe('active')
    expect(
      activeIndicator?.querySelector('svg[data-icon="radio-on"]'),
    ).not.toBeNull()

    const navigationCard = getGalleryCard(container, 'Navigation')
    const settingsButton =
      Array.from(
        navigationCard.querySelectorAll<HTMLButtonElement>('button'),
      ).find((button) => button.textContent?.includes('Settings')) ?? null
    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const activeSettingsButton =
      Array.from(
        navigationCard.querySelectorAll<HTMLButtonElement>('button'),
      ).find((button) => button.textContent?.includes('Settings')) ?? null
    expect(activeSettingsButton?.getAttribute('data-variant')).toBe('default')

    const paginationCard = getGalleryCard(container, 'Pagination')
    const nextPage = paginationCard.querySelector(
      '[data-part="next"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      nextPage?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const pageTwoButton = paginationCard.querySelector(
      '.uf-pagination-page[aria-current="page"]',
    ) as HTMLElement | null
    expect(pageTwoButton?.getAttribute('aria-current')).toBe('page')
    expect(pageTwoButton?.textContent).toBe('7')

    const ratingCard = getGalleryCard(container, 'Rating')
    const ratingStars = Array.from(
      ratingCard.querySelectorAll<HTMLInputElement>('.uf-rating input[type="radio"]'),
    )
    await act(async () => {
      ratingStars[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(ratingStars[3]?.checked).toBe(true)

    const sliderCard = getGalleryCard(container, 'Slider')
    const sliderRoot = sliderCard.querySelector(
      '.uf-slider[data-scope="slider"]',
    ) as HTMLElement | null
    const sliderThumb = sliderCard.querySelector(
      'input[type="range"]',
    ) as HTMLElement | null
    expect(sliderRoot).not.toBeNull()
    expect((sliderThumb as HTMLInputElement)?.value).toBe('50')
    expect(sliderCard.textContent).toContain('Value')

    const stepsCard = getGalleryCard(container, 'Steps')
    const profileStep =
      Array.from(
        stepsCard.querySelectorAll<HTMLButtonElement>('[data-part="trigger"]'),
      ).find((button) => button.textContent?.includes('Profile')) ?? null
    await act(async () => {
      profileStep?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(profileStep?.getAttribute('data-state')).toBe('active')
    expect(stepsCard.textContent).toContain(
      'Add brand settings, themes, and team details.',
    )

    const switcherCard = getGalleryCard(container, 'Switcher')
    const switcherControl = switcherCard.querySelector(
      '[role="switch"]',
    ) as HTMLElement | null
    await act(async () => {
      switcherControl?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(switcherControl?.getAttribute('aria-checked')).toBe('true')

    const tabsCard = getGalleryCard(container, 'Tabs')
    const tabB = tabsCard.querySelector(
      '[role="tab"][data-value="b"]',
    ) as HTMLButtonElement | null
    const tabBPanel = tabsCard.querySelector(
      '[role="tabpanel"][data-value="b"]',
    ) as HTMLElement | null
    await act(async () => {
      tabB?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(tabBPanel?.hidden).toBe(false)

    const tocCard = getGalleryCard(container, 'Toc')
    const setupItem = tocCard.querySelector<HTMLAnchorElement>('a[href="#setup"]')
    await act(async () => {
      setupItem?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })
    expect(setupItem?.getAttribute('aria-current')).toBe('location')
    expect(tocCard.textContent).toContain('Themes')

    const segmentedCard = getGalleryCard(container, 'SegmentedControl')
    const listSegment =
      Array.from(
        segmentedCard.querySelectorAll<HTMLButtonElement>('button'),
      ).find((button) => button.textContent === 'List') ?? null
    await act(async () => {
      listSegment?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(listSegment?.getAttribute('data-state')).toBe('on')

    const treeCard = getGalleryCard(container, 'Tree')
    const treeBranch = treeCard.querySelector(
      '[data-tree-node-id="src"]',
    ) as HTMLButtonElement | null
    expect(
      treeCard
        .querySelector('[data-part="branchContent"][data-value="src"]')
        ?.hasAttribute('hidden'),
    ).toBe(false)
    await act(async () => {
      treeBranch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(
      treeCard
        .querySelector('[data-part="branchContent"][data-value="src"]')
        ?.hasAttribute('hidden'),
    ).toBe(true)

    await act(async () => {
      treeBranch?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(
      treeCard
        .querySelector('[data-part="branchContent"][data-value="src"]')
        ?.hasAttribute('hidden'),
    ).toBe(false)

    const treeChild = treeCard.querySelector(
      '[data-tree-node-id="index"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      treeChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(treeChild?.getAttribute('data-selected')).toBe('')
  })

  it('renders the Panel gallery state through the production items API without stealing focus', async () => {
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

    const panelButtons = Array.from(
      panelCard.querySelectorAll<HTMLButtonElement>(
        '.uf-sidebar-itemButton[data-scope="button"]',
      ),
    )
    expect(panelButtons).toHaveLength(4)
    expect(
      panelButtons.every(
        (button) => button.getAttribute('data-variant') === 'default',
      ),
    ).toBe(true)
    expect(
      panelButtons.some((button) => button.hasAttribute('data-selected')),
    ).toBe(true)
    expect(panelCard.textContent).toContain('Overview')
    expect(panelCard.textContent).toContain('Projects')
    expect(panelCard.textContent).toContain('Automations')

    outside.remove()
  })

  it('keeps the command showcase searchable', async () => {
    await act(async () => {
      root.render(<FaceUiReact />)
    })

    const commandCard = getGalleryCard(container, 'Command')
    const input = commandCard.querySelector(
      '[role="combobox"]',
    ) as HTMLInputElement | null
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
    const showcaseModalContent = modalCard.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="content"]',
    )
    expect(showcaseModalContent?.hidden).toBe(false)
    expect(showcaseModalContent?.textContent).toContain('Focused work surface')
    expect(showcaseModalContent?.textContent).toContain(
      'Review the workspace details',
    )
    expect(document.activeElement?.closest?.('[data-scope="modal"]')).toBeNull()

    const calendarCard = getGalleryCard(container, 'Calendar')
    const calendarDayButtons = Array.from(
      calendarCard.querySelectorAll<HTMLButtonElement>(
        '.uf-calendar-dayButton',
      ),
    )
    const calendarDay = calendarDayButtons.find(
      (button) =>
        button.getAttribute('data-disabled') == null &&
        button.getAttribute('data-outside') == null,
    )
    expect(calendarDay).toBeTruthy()

    await act(async () => {
      calendarDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(calendarDay?.getAttribute('data-selected')).not.toBeNull()

    const dateCard = getGalleryCard(container, 'Date')
    const dateTrigger = dateCard.querySelector(
      'button',
    ) as HTMLButtonElement | null
    expect(dateTrigger?.textContent).toContain('Pick date')

    await act(async () => {
      dateTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dayButtons = Array.from(
      document
        .getElementById(dateTrigger?.getAttribute('aria-controls') ?? '')
        ?.querySelectorAll<HTMLButtonElement>('.uf-calendar-dayButton') ?? [],
    )
    const selectableDay = dayButtons.find(
      (button) => button.getAttribute('data-disabled') == null,
    )
    expect(selectableDay).toBeTruthy()

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(dateTrigger?.textContent).not.toContain('Pick date')

    const selectCard = getGalleryCard(container, 'Select')
    const selectTrigger = selectCard.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(selectTrigger?.textContent).toContain('Choose option')

    await act(async () => {
      selectTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const selectContentId = selectTrigger?.getAttribute('aria-controls') ?? ''
    const selectContentRoot = document.getElementById(selectContentId)?.closest('[data-part="content"]')
    const selectContent = selectContentRoot?.querySelector(
      '.uf-select__contentMembrane',
    ) as HTMLElement | null
    expect(selectContent).not.toBeNull()

    const optionTwo =
      Array.from(
        selectContentRoot?.querySelectorAll<HTMLElement>(
          '[data-part="option"]',
        ) ?? [],
      ).find((node) => node.textContent?.includes('Option 2')) ?? null
    expect(optionTwo).not.toBeNull()

    await act(async () => {
      optionTwo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(selectTrigger?.textContent).toContain('Option 2')
  })
})
