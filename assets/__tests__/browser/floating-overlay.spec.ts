import { expect, test } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/floating-overlay.fixture'
const { renderFloating: render } = hooks<Hooks>()
test.beforeEach(async ({ page }) => {
  await open(page, 'floating-overlay')
})
test('Tooltip stays open when the pointer moves onto its content', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, { props: { openDelay: 0, closeDelay: 0, side: 'bottom' } })
  await page.locator('#trigger').hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  const bounds = await tooltip.boundingBox()
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
    { steps: 10 },
  )
  await expect(tooltip).toBeVisible()
})
for (const align of ['start', 'end'] as const)
  test(`RTL ${align} aligns logical edges`, { tag: ['@layout', '@css'] }, async ({ page }) => {
    await render(page, {
      kind: 'popover',
      direction: 'rtl',
      props: { open: true, dir: 'rtl', side: 'bottom', align },
    })
    const popup = page.getByRole('dialog')
    await expect(popup).toBeVisible()
    await expect(async () => {
      const { trigger, bounds, surface, padding } = await popup.evaluate(
        (node) => {
          const membrane = node.parentElement!
          return {
            trigger: document
              .getElementById('trigger')!
              .getBoundingClientRect()
              .toJSON(),
            bounds: membrane.getBoundingClientRect().toJSON(),
            surface: node.getBoundingClientRect().toJSON(),
            padding: parseFloat(getComputedStyle(membrane).paddingLeft),
          }
        },
      )
      expect(surface.x - bounds.x).toBeCloseTo(padding, 1)
      expect(
        align === 'start' ? bounds!.x + bounds!.width : bounds!.x,
      ).toBeCloseTo(
        align === 'start' ? trigger!.x + trigger!.width : trigger!.x,
        0,
      )
    }).toPass()
  })
test('data-side reports actual flipped placement at the viewport edge', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, {
    kind: 'popover',
    top: 8,
    props: { open: true, side: 'top', sideOffset: 6 },
  })
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  await expect(async () => {
    const trigger = await page.locator('#trigger').boundingBox(),
      bounds = await popup.boundingBox()
    expect(bounds!.y).toBeGreaterThanOrEqual(trigger!.y + trigger!.height)
  }).toPass()
  await expect(popup).toHaveAttribute('data-side', 'bottom')
})

for (const side of ['top', 'right', 'bottom', 'left'] as const)
  test(`Tooltip bridges the membrane and gap on ${side} and closes on departure`, { tag: ['@pointer', '@layout'] }, async ({
    page,
  }) => {
    await render(page, {
      props: { openDelay: 0, closeDelay: 0, side, sideOffset: 20 },
    })
    const trigger = page.locator('#trigger'),
      tooltip = page.getByRole('tooltip')
    await trigger.hover()
    await expect(tooltip).toBeVisible()
    const box = await tooltip.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, {
      steps: 25,
    })
    await expect(tooltip).toBeVisible()
    await trigger.hover()
    await expect(tooltip).toBeVisible()
    await page.locator('#outside').hover()
    await expect(tooltip).toBeHidden()
  })
test('Escape during gap crossing clears intent for a later hover cycle', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, {
    props: { openDelay: 0, side: 'bottom', sideOffset: 30 },
  })
  const trigger = page.locator('#trigger'),
    tooltip = page.getByRole('tooltip')
  await trigger.hover()
  await expect(tooltip).toBeVisible()
  const box = await trigger.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height + 8, {
    steps: 8,
  })
  await expect(tooltip).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await trigger.hover()
  await expect(tooltip).toBeVisible()
  await page.locator('#outside').hover()
  await expect(tooltip).toBeHidden()
})
test('Escape dismisses focused Tooltip and it stays closed until a new intent', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { props: { openDelay: 0 } })
  await page.locator('#trigger').focus()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toBeHidden()
  await expect(page.locator('#trigger')).toBeFocused()
  await page.locator('#outside').focus()
  await page.locator('#trigger').focus()
  await expect(page.getByRole('tooltip')).toBeVisible()
})
for (const triggerKind of ['native-disabled', 'face-disabled'] as const)
  test(`Tooltip can explain a ${triggerKind} action with pointer hover`, { tag: ['@pointer', '@layout'] }, async ({
    page,
  }) => {
    await render(page, { triggerKind, props: { openDelay: 0 } })
    const box = await page.locator('#trigger').boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect(page.getByRole('tooltip')).toBeVisible()
  })

test('portal content inherits the trigger direction when dir is omitted', { tag: ['@css'] }, async ({
  page,
}) => {
  await render(page, {
    direction: 'rtl',
    props: { open: true, align: 'start', side: 'bottom' },
  })
  await expect(page.getByRole('tooltip')).toHaveCSS('direction', 'rtl')
})
test('dir auto uses content direction for logical alignment', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, {
    kind: 'popover',
    props: {
      open: true,
      dir: 'auto',
      content: 'مرحبا بالعالم',
      align: 'start',
      side: 'bottom',
    },
  })
  const surface = page.getByRole('dialog')
  await expect(surface).toHaveCSS('direction', 'rtl')
  await expect(async () => {
    const delta = await surface.evaluate(
      (node) =>
        node.parentElement!.getBoundingClientRect().right -
        document.getElementById('trigger')!.getBoundingClientRect().right,
    )
    expect(delta).toBeCloseTo(0, 0)
  }).toPass({ timeout: 3000 })
})
test('entering membrane padding then leaving does not retain a phantom hover region', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, {
    props: { openDelay: 0, side: 'bottom', sideOffset: 20 },
  })
  const trigger = page.locator('#trigger'),
    tooltip = page.getByRole('tooltip')
  await trigger.hover()
  await expect(tooltip).toBeVisible()
  const box = await tooltip.evaluate((node) =>
    node.parentElement!.getBoundingClientRect().toJSON(),
  )
  await page.mouse.move(box.x + box.width / 2, box.y + 0.5, { steps: 20 })
  await expect(tooltip).toBeVisible()
  await page.mouse.move(box.right + 100, box.y + 0.5, { steps: 12 })
  await expect(tooltip).toBeHidden()
})

test('Popover membrane padding belongs to its inside dismissal boundary', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, { kind: 'popover', props: { defaultOpen: true } })
  const dialog = page.getByRole('dialog')
  const box = await dialog.evaluate((node) =>
    node.parentElement!.getBoundingClientRect().toJSON(),
  )
  await page.mouse.click(box.x + 0.5, box.y + box.height / 2)
  await expect(dialog).toBeVisible()
})

for (const side of ['top', 'right', 'bottom', 'left'] as const) {
  for (const align of ['start', 'center', 'end'] as const) {
    for (const direction of ['ltr', 'rtl'] as const) test(`geometry ${side}/${align}/${direction}: gap and logical edges remain aligned after live offset changes`, { tag: ['@layout'] }, async ({ page }) => {
      for (const sideOffset of [0, 7.5, 24]) {
        await render(page, { kind: 'popover', direction, top: 300, left: 500, props: { open: true, side, align, sideOffset } })
        const dialog = page.getByRole('dialog')
        await expect(dialog).toHaveAttribute('data-side', side)
        await expect(async () => {
          const { trigger, box } = await dialog.evaluate(node => ({ trigger: document.getElementById('trigger')!.getBoundingClientRect().toJSON(), box: node.parentElement!.getBoundingClientRect().toJSON() }))
          const vertical = side === 'top' || side === 'bottom'
          const gap = side === 'top' ? trigger.top - box.bottom : side === 'bottom' ? box.top - trigger.bottom : side === 'left' ? trigger.left - box.right : box.left - trigger.right
          expect(Math.abs(gap - sideOffset)).toBeLessThanOrEqual(0.51)
          const physicalAlign = vertical && direction === 'rtl' ? align === 'start' ? 'end' : align === 'end' ? 'start' : align : align
          const [a, b] = vertical ? [box.left, trigger.left] : [box.top, trigger.top]
          const [size, triggerSize] = vertical ? [box.width, trigger.width] : [box.height, trigger.height]
          const delta = physicalAlign === 'start' ? a - b : physicalAlign === 'end' ? a + size - b - triggerSize : a + size / 2 - b - triggerSize / 2
          expect(Math.abs(delta)).toBeLessThanOrEqual(0.51)
        }).toPass({ timeout: 3000 })
      }
    })
  }
}
test('disabled Face Button keeps disabled styling and blocks activation while the hint opens', { tag: ['@css', '@pointer'] }, async ({ page }) => {
  await render(page, { triggerKind: 'face-disabled', props: { openDelay: 0 } })
  const button = page.locator('#trigger')
  const before = await button.evaluate(node => {
    node.addEventListener('click', () => { (window as any).disabledClicks = ((window as any).disabledClicks ?? 0) + 1 })
    const css = getComputedStyle(node); return { background: css.backgroundColor, color: css.color }
  })
  const box = await button.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.getByRole('tooltip')).toBeVisible()
  await expect(button).toHaveCSS('background-color', before.background)
  await expect(button).toHaveCSS('color', before.color)
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  expect(await page.evaluate(() => (window as any).disabledClicks ?? 0)).toBe(0)
  await expect(button).toBeDisabled()
})

test('Popover rich content keeps the shared control inset instead of menu row padding', { tag: ['@css'] }, async ({ page }) => {
  await render(page, { kind: 'popover', props: { open: true } })
  const spacing = await page.getByRole('dialog').evaluate(node => {
    const css = getComputedStyle(node)
    return { x: parseFloat(css.paddingLeft), y: parseFloat(css.paddingTop), expectedX: parseFloat(css.getPropertyValue('--uf-control-pad-text')), expectedY: parseFloat(css.getPropertyValue('--uf-control-pad-y')) }
  })
  expect(spacing.x).toBe(spacing.expectedX)
  expect(spacing.y).toBe(spacing.expectedY)
})
