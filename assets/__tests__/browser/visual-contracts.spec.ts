import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks as MarkdownHooks } from './fixtures/markdown.fixture'

const { renderMarkdown } = hooks<MarkdownHooks>()

test.beforeEach(async ({ page }) => {
  await open(page, 'markdown')
})

test('Markdown keeps strong text and table headings at the design-system bold weight', { tag: ['@css'] }, async ({ page }) => {
  await renderMarkdown(page, {
    children: 'Normal **important** text\n\n| Heading |\n| --- |\n| Cell |',
  })
  const weights = await page.locator('[data-scope="markdown"]').evaluate((root) => {
    const weight = (selector: string) =>
      getComputedStyle(root.querySelector(selector)!).fontWeight
    return {
      normal: weight('p'),
      strong: weight('strong'),
      heading: weight('th'),
      boldToken: getComputedStyle(root).getPropertyValue('--uf-font-weight-bold').trim(),
    }
  })
  expect(weights.strong).toBe(weights.boldToken)
  expect(weights.heading).toBe(weights.boldToken)
  expect(Number(weights.strong)).toBeGreaterThan(Number(weights.normal))
})

async function addGeometryProbes(page: Page) {
  await page.evaluate(() => {
    const probe = document.createElement('section')
    probe.id = 'visual-contract-probe'
    probe.style.setProperty('--uf-date-sheet-inset', '13px')
    probe.style.setProperty('--uf-select-sheet-inset', '17px')
    probe.style.setProperty('--uf-select-indicator-gap', '19px')
    probe.style.setProperty('--uf-select-content-max-height', '91px')
    probe.style.setProperty('--uf-select-side-content-max-height', '137px')
    probe.style.setProperty('--uf-carousel-viewport-pad', '11px')
    probe.style.setProperty('--uf-carousel-controls-inset', '15px')
    probe.style.setProperty('--uf-control-pad-text', '11px')
    probe.style.setProperty('--uf-control-pad-icon', '5px')
    probe.innerHTML = `
      <div class="uf-date" data-scope="date"><button class="uf-date__trigger">Date</button>
        <div class="uf-date__content" data-surface="sheet"></div></div>
      <button class="uf-command__trigger">Command</button>
      <div class="uf-select" data-scope="select"><button data-part="trigger">Select</button></div>
      <div class="uf-select__content" data-scope="select" data-part="content" data-surface="side">
        <div class="uf-select__contentPanel"></div></div>
      <div class="uf-select__content" data-scope="select" data-part="content" data-surface="sheet">
        <div class="uf-select__contentPanel"></div></div>
      <div class="uf-select__content" data-scope="select" data-part="content" data-surface="popover">
        <div class="uf-select__contentPanel"></div></div>
      <div class="uf-carousel" data-scope="carousel">
        <div data-scope="carousel" data-part="viewport"></div>
        <div class="uf-carousel-controls"></div></div>
    `
    document.body.append(probe)
  })
}

for (const direction of ['ltr', 'rtl'] as const)
  for (const theme of ['light', 'dark'] as const)
    test(`${direction}/${theme}: theme tokens reach Date, Select and Carousel; trigger padding follows inline direction`, { tag: ['@css', '@layout'] }, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 720 })
      await addGeometryProbes(page)
      const values = await page.evaluate(({ direction, theme }) => {
        const probe = document.getElementById('visual-contract-probe')!
        probe.setAttribute('dir', direction)
        probe.setAttribute('data-theme', theme)
        const value = (selector: string, property: keyof CSSStyleDeclaration) =>
          getComputedStyle(probe.querySelector(selector)!)[property] as string
        return {
          dateInset: value('.uf-date__content', 'left'),
          selectInset: value('.uf-select__content[data-surface="sheet"]', 'left'),
          selectGap: value('.uf-select [data-part="trigger"]', 'gap'),
          sideHeight: value('.uf-select__content[data-surface="side"] .uf-select__contentPanel', 'maxHeight'),
          popoverHeight: value('.uf-select__content[data-surface="popover"] .uf-select__contentPanel', 'maxHeight'),
          carouselViewport: value('[data-part="viewport"]', 'paddingTop'),
          carouselControls: value('.uf-carousel-controls', 'paddingTop'),
          date: [value('.uf-date__trigger', 'paddingLeft'), value('.uf-date__trigger', 'paddingRight')],
          command: [value('.uf-command__trigger', 'paddingLeft'), value('.uf-command__trigger', 'paddingRight')],
        }
      }, { direction, theme })
      expect(values).toEqual({
        dateInset: '13px',
        selectInset: '17px',
        selectGap: '19px',
        sideHeight: '137px',
        popoverHeight: '91px',
        carouselViewport: '11px',
        carouselControls: '15px',
        date: direction === 'ltr' ? ['11px', '5px'] : ['5px', '11px'],
        command: direction === 'ltr' ? ['5px', '11px'] : ['11px', '5px'],
      })
    })

test('Select side viewport applies both the public cap and runtime placement cap', { tag: ['@css'] }, async ({ page }) => {
  await addGeometryProbes(page)
  const panel = page.locator('.uf-select__content[data-surface="side"] .uf-select__contentPanel')
  await expect(panel).toHaveCSS('max-height', '137px')
  await page.locator('#visual-contract-probe').evaluate((node) =>
    node.style.setProperty('--face-runtime-select-side-content-max-height', '79px'),
  )
  await expect(panel).toHaveCSS('max-height', '79px')
  await page.locator('#visual-contract-probe').evaluate((node) => {
    node.style.setProperty('--uf-select-side-content-max-height', '53px')
  })
  await expect(panel).toHaveCSS('max-height', '53px')
})

test('state transitions are instant by default, opt in together, and yield to reduced motion', { tag: ['@css'] }, async ({ page }) => {
  await addGeometryProbes(page)
  const durations = () => page.evaluate(() => {
    const root = document.getElementById('visual-contract-probe')!
    const date = getComputedStyle(root.querySelector('.uf-date__content')!)
    const carousel = getComputedStyle(root.querySelector('.uf-carousel-track')!)
    return {
      date: date.transitionDuration.split(',').map((item) => item.trim()),
      visibilityDelay: date.transitionDelay.split(',').map((item) => item.trim()).at(-1),
      carousel: carousel.transitionDuration.split(',').map((item) => item.trim()),
    }
  })
  await page.evaluate(() => {
    document.querySelector('.uf-carousel')!.insertAdjacentHTML('beforeend', '<div class="uf-carousel-track"></div>')
  })
  expect(await durations()).toEqual({
    date: ['0s', '0s'],
    visibilityDelay: '0s',
    carousel: ['0s', '0s'],
  })
  await page.locator('#visual-contract-probe').evaluate((node) => node.classList.add('uf-animated'))
  expect(await durations()).toEqual({
    date: ['0.3s', '0s'],
    visibilityDelay: '0.2s',
    carousel: ['0.25s', '0.25s'],
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await durations()
  expect(reduced.date.every((value) => parseFloat(value) < 0.001)).toBe(true)
  expect(reduced.carousel.every((value) => parseFloat(value) < 0.001)).toBe(true)
  expect(reduced.visibilityDelay).toBe('0s')
})
