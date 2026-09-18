import type { ComponentPropsWithoutRef } from 'react'
import { test, expect, type Page } from './test'
import { mount, open, type MountProps, type MountWindow } from './helpers'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const textVariants: NonNullable<MountProps<'Text'>['variant']>[] =
  require('../../../Text/Text.json').props.variant.options
const render = (page: Page, props: MountProps<'Card'>) =>
  mount(page, 'Card', props)
test.beforeEach(async ({ page }) => {
  await open(page, 'mount')
})
test('Card border remains independent of all padding, radius and variant combinations', { tag: ['@css'] }, async ({
  page,
}) => {
  const card = page.locator('[data-scope="card"][data-part="root"]')
  for (const variant of ['default', 'plain', 'code'] as const) {
    for (const padding of ['none', 'membrane', 'control', 'default'] as const) {
      for (const radius of ['none', 'md', 'lg'] as const) {
        for (const border of [true, false]) {
          await render(page, {
            content: 'Surface',
            variant,
            padding,
            radius,
            border,
          })
          await expect(card).toHaveAttribute('data-border', String(border))
          await expect(
            card,
            `${variant}/${padding}/${radius}/${border}`,
          ).toHaveCSS('border-top-width', border ? '1px' : '0px')
          await expect(card).toHaveCSS(
            'border-radius',
            { none: '0px', md: '8px', lg: '12px' }[radius]!,
          )
          const inset = {
            none: [0, 0],
            membrane: [1, 1],
            control: [6, 8],
            default: [7, 7],
          }[padding]!
          await expect(card).toHaveCSS('padding-top', `${inset[0]}px`)
          await expect(card).toHaveCSS('padding-inline-start', `${inset[1]}px`)
        }
      }
    }
  }
})
test('Card title and description honor every size and typography variant', { tag: ['@css'] }, async ({
  page,
}) => {
  for (const part of ['Title', 'Description'] as const) {
    for (const variant of textVariants) {
      const sizes: number[] = []
      for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
        await page.evaluate(
          ({ variant, size, part }) => {
            const {
              React: R,
              propComponents: { Card },
              renderProps,
            } = window as unknown as MountWindow
            renderProps('Card', {
              children: R.createElement(Card[part], { variant, size }, 'Title'),
            })
          },
          { variant, size, part },
        )
        const title = page.locator(`[data-part="${part.toLowerCase()}"]`)
        await expect(title).toHaveAttribute('data-size', size)
        sizes.push(
          await title.evaluate((node) =>
            parseFloat(getComputedStyle(node).fontSize),
          ),
        )
      }
      expect(sizes, variant).toEqual([...new Set(sizes)].sort((a, b) => a - b))
    }
  }
})
test('Card fullWidth changes width without silently changing alignment', { tag: ['@layout'] }, async ({
  page,
}) => {
  const card = page.locator('[data-scope="card"][data-part="root"]')
  await render(page, { content: 'Short', fullWidth: true })
  await expect(card).toHaveAttribute('data-full-width', '')
  const full = (await card.boundingBox())!
  await render(page, { content: 'Short', fullWidth: false })
  await expect(card).not.toHaveAttribute('data-full-width')
  const compact = (await card.boundingBox())!
  expect(compact.width).toBeLessThan(full.width)
  expect(compact.x).toBe(full.x)
})
test('Card footerAlign positions primitive footer text as well as composed controls', { tag: ['@layout'] }, async ({
  page,
}) => {
  const positions: number[] = []
  for (const footerAlign of ['start', 'end'] as const) {
    await render(page, {
      content: 'Card content',
      footer: 'Updated today',
      footerAlign,
    })
    await expect(page.locator('[data-part="footer"]')).toHaveAttribute(
      'data-align',
      footerAlign,
    )
    positions.push(
      (await page
        .locator('[data-part="footer"] .uf-text__content')
        .boundingBox())!.x,
    )
  }
  expect(positions[1] - positions[0]).toBeGreaterThan(150)
})
test('Card hoverable styling has an actual hover effect for every variant', { tag: ['@css', '@pointer'] }, async ({
  page,
}) => {
  const card = page.locator('[data-scope="card"][data-part="root"]')
  for (const variant of ['default', 'plain', 'code'] as const) {
    await page.mouse.move(1000, 500)
    await render(page, { content: 'Card content', variant, hoverable: true })
    await expect(card).toHaveAttribute('data-card-variant', variant)
    const before = await card.evaluate((node) => {
      const s = getComputedStyle(node)
      return [s.backgroundColor, s.backgroundImage]
    })
    await card.hover()
    const after = await card.evaluate((node) => {
      const s = getComputedStyle(node)
      return [s.backgroundColor, s.backgroundImage]
    })
    expect(after, variant).not.toEqual(before)
  }
})

test('Card header orientation places a long title and actions on the requested axis', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  for (const dir of ['ltr', 'rtl']) {
    for (const align of ['start', 'end', 'between'] as const) {
      for (const orientation of ['vertical', 'horizontal'] as const) {
        await page.evaluate(
          ({ dir, orientation, align }) => {
            const {
              React: R,
              propComponents: { Card, Button },
              renderProps,
            } = window as unknown as MountWindow
            renderProps('Card', {
              dir,
              children: R.createElement(
                Card.Header,
                { orientation },
                R.createElement(
                  Card.Title,
                  { truncate: true },
                  'A long workspace title '.repeat(10),
                ),
                R.createElement(
                  Card.Actions,
                  { align },
                  R.createElement(Button, { text: 'Edit' }),
                ),
              ),
            })
          },
          { dir, orientation, align },
        )
        await expect(page.locator('[data-part="header"]')).toHaveAttribute(
          'data-orientation',
          orientation,
        )
        await expect(page.locator('[data-part="actions"]')).toHaveAttribute(
          'data-align',
          align,
        )
        await expect(
          page.locator('[data-scope="card"][data-part="root"]'),
        ).toHaveAttribute('dir', dir)
        const title = (await page.locator('[data-part="title"]').boundingBox())!
        const actions = (await page
          .locator('[data-part="actions"]')
          .boundingBox())!
        const header = (await page
          .locator('[data-part="header"]')
          .boundingBox())!
        if (orientation === 'vertical')
          expect(actions.y).toBeGreaterThanOrEqual(title.y + title.height)
        else {
          expect(
            Math.abs(
              actions.y + actions.height / 2 - title.y - title.height / 2,
            ),
          ).toBeLessThan(2)
          if (dir === 'ltr')
            expect(actions.x).toBeGreaterThanOrEqual(title.x + title.width)
          else expect(actions.x + actions.width).toBeLessThanOrEqual(title.x)
        }
        expect(actions.x).toBeGreaterThanOrEqual(header.x)
        expect(actions.x + actions.width).toBeLessThanOrEqual(
          header.x + header.width,
        )
        const actionLabel = await page
          .getByRole('button', { name: 'Edit', exact: true })
          .locator('[data-part="label"]')
          .evaluate((node) => ({
            width: node.clientWidth,
            scroll: node.scrollWidth,
          }))
        expect(actionLabel.scroll).toBeLessThanOrEqual(actionLabel.width)
        await expect(
          page.locator('[data-part="title"] .uf-text__content'),
        ).toHaveCSS('text-overflow', 'ellipsis')
      }
    }
  }
})

test('Card footer and actions alignment works for multiple controls in LTR and RTL', { tag: ['@layout'] }, async ({
  page,
}) => {
  for (const dir of ['ltr', 'rtl']) {
    for (const part of ['Footer', 'Actions'] as const) {
      for (const align of ['start', 'end', 'between'] as const) {
        await page.evaluate(
          ({ dir, part, align }) => {
            const {
              React: R,
              propComponents: { Card, Button },
              renderProps,
            } = window as unknown as MountWindow
            renderProps('Card', {
              dir,
              children: R.createElement(
                Card[part],
                { align },
                R.createElement(Button, { text: 'One' }),
                R.createElement(Button, { text: 'Two' }),
              ),
            })
          },
          { dir, part, align },
        )
        await expect(
          page.locator(`[data-part="${part.toLowerCase()}"]`),
        ).toHaveAttribute('data-align', align)
        await expect(
          page.locator('[data-scope="card"][data-part="root"]'),
        ).toHaveAttribute('dir', dir)
        const container = (await page
          .locator(`[data-part="${part.toLowerCase()}"]`)
          .boundingBox())!
        const boxes = await page.locator('.uf-membrane:not([data-membrane-disabled])').evaluateAll((nodes) =>
          nodes.map((node) => {
            const { x, width } = node.getBoundingClientRect()
            return { x, width }
          }),
        )
        const start = (box: { x: number; width: number }) =>
          dir === 'ltr'
            ? box.x - container.x
            : container.x + container.width - box.x - box.width
        const end = (box: { x: number; width: number }) =>
          container.width - start(box) - box.width
        if (align === 'start' || align === 'between')
          expect(Math.abs(start(boxes[0]))).toBeLessThan(1)
        if (align === 'end' || align === 'between')
          expect(Math.abs(end(boxes[1]))).toBeLessThan(1)
        const gap = start(boxes[1]) - start(boxes[0]) - boxes[0].width
        if (align === 'between') expect(gap).toBeGreaterThan(100)
        else expect(Math.abs(gap)).toBeLessThan(1)
      }
    }
  }
})

test('Card wraps long primitive body content inside the available width', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  for (const fullWidth of [true, false]) {
    await render(page, {
      content: 'LongUnbrokenWorkspaceIdentifier'.repeat(15),
      fullWidth,
    })
    const body = page.locator('[data-part="content"]')
    const metrics = await body.evaluate((node) => {
      const content = node.querySelector('.uf-text__content')!
      return {
        width: node.clientWidth,
        scroll: node.scrollWidth,
        height: content.getBoundingClientRect().height,
        line: parseFloat(getComputedStyle(content.parentElement!).lineHeight),
      }
    })
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1)
    expect(metrics.height).toBeGreaterThan(metrics.line * 2)
  }
})

test('Card typography slots preserve icon, inset, membrane, width, alignment and stretch controls', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  for (const part of ['Title', 'Description'] as const) {
    const renderPart = async (
      props: ComponentPropsWithoutRef<MountWindow['propComponents']['Card'][typeof part]>,
    ) =>
      page.evaluate(
        ({ part, props }) => {
          const {
            React: R,
            propComponents: { Card },
            renderProps,
          } = window as unknown as MountWindow
          renderProps('Card', { children: R.createElement(Card[part], props) })
        },
        { part, props },
      )
    const text = page.locator(`[data-part="${part.toLowerCase()}"]`)
    for (const membrane of [true, false]) {
      for (const inset of ['control', 'none'] as const) {
        for (const iconPosition of ['start', 'end'] as const) {
          await renderPart({
            text: 'Slot',
            icon: 'user',
            iconPosition,
            inset,
            membrane,
          })
          await expect(text).toHaveText('Slot')
          await expect(text).toHaveAttribute('data-icon-position', iconPosition)
          await expect(text).toHaveAttribute('data-inset', inset)
          await expect(page.locator('.uf-membrane:not([data-membrane-disabled])')).toHaveCount(
            membrane ? 1 : 0,
          )
          const icon = (await text.locator('.uf-text__icon').boundingBox())!
          const content = (await text
            .locator('.uf-text__content')
            .boundingBox())!
          expect(icon.x < content.x).toBe(iconPosition === 'start')
          if (inset === 'none') {
            await expect(text).toHaveCSS('padding-left', '0px')
            await expect(text).toHaveCSS('padding-right', '0px')
          } else {
            expect(
              await text.evaluate((node) =>
                parseFloat(getComputedStyle(node).paddingLeft),
              ),
            ).toBeGreaterThan(0)
          }
        }
      }
    }
    const positions: number[] = []
    for (const align of ['left', 'center', 'right'] as const) {
      await renderPart({ text: 'Slot', align, fullWidth: true })
      await expect(text).toHaveAttribute('data-align', align)
      positions.push((await text.locator('.uf-text__content').boundingBox())!.x)
    }
    expect(positions[1]).toBeGreaterThan(positions[0] + 50)
    expect(positions[2]).toBeGreaterThan(positions[1] + 50)
    const widths: number[] = []
    for (const fullWidth of [false, true]) {
      await renderPart({ text: 'Slot', fullWidth })
      if (fullWidth) await expect(text).toHaveAttribute('data-full-width', '')
      else await expect(text).not.toHaveAttribute('data-full-width')
      widths.push((await text.boundingBox())!.width)
    }
    expect(widths[1]).toBeGreaterThan(widths[0] + 100)
    const contentWidths: number[] = []
    for (const stretchText of [false, true]) {
      await renderPart({
        text: 'Slot',
        icon: 'user',
        fullWidth: true,
        stretchText,
      })
      if (stretchText)
        await expect(text).toHaveAttribute('data-stretch-text', '')
      else await expect(text).not.toHaveAttribute('data-stretch-text')
      contentWidths.push(
        (await text.locator('.uf-text__content').boundingBox())!.width,
      )
    }
    expect(contentWidths[1]).toBeGreaterThan(contentWidths[0] + 100)
    await renderPart({ text: 'Fallback', children: 'Chosen' })
    await expect(text).toHaveText('Chosen')
  }
})

test('Card hoverable responds to focus within and can be disabled in both themes', { tag: ['@css', '@focus'] }, async ({
  page,
}) => {
  const card = page.locator('[data-scope="card"][data-part="root"]')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    for (const variant of ['default', 'plain', 'code'] as const) {
      await page.evaluate((variant) => {
        const {
          React: R,
          propComponents: { Button },
          renderProps,
        } = window as unknown as MountWindow
        renderProps('Card', {
          variant,
          hoverable: true,
          content: R.createElement(Button, { text: 'Edit' }),
        })
      }, variant)
      await expect(card).toHaveAttribute('data-card-variant', variant)
      await page
        .getByRole('button', { name: 'Edit' })
        .evaluate((node: HTMLButtonElement) => node.blur())
      const idle = await card.evaluate(
        (node) => getComputedStyle(node).backgroundImage,
      )
      await page.getByRole('button', { name: 'Edit' }).focus()
      await expect
        .poll(() =>
          card.evaluate((node) => getComputedStyle(node).backgroundImage),
        )
        .not.toBe(idle)
      await page.evaluate((variant) => {
        const {
          React: R,
          propComponents: { Button },
          renderProps,
        } = window as unknown as MountWindow
        renderProps('Card', {
          variant,
          hoverable: false,
          content: R.createElement(Button, { text: 'Edit' }),
        })
      }, variant)
      await expect(card).not.toHaveAttribute('data-hoverable')
      await expect(page.getByRole('button', { name: 'Edit' })).toBeFocused()
      await expect(card).toHaveCSS('background-image', idle)
    }
  }
})
