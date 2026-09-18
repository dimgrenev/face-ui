import { createRequire } from 'node:module'
import { mount, open, type MountProps, type MountWindow } from './helpers'
import { test, expect } from './test'

const require = createRequire(import.meta.url)
test.beforeEach(async ({ page }) => {
  await open(page, 'mount')
})

test('Tile owns the design-system font in a host with unrelated typography', { tag: ['@css'] }, async ({ page }) => {
  const family = await page.evaluate(() => {
    document.body.style.fontFamily = 'monospace'
    const probe = document.createElement('span')
    probe.style.fontFamily = 'var(--uf-font-family-base)'
    document.body.append(probe)
    const family = getComputedStyle(probe).fontFamily
    probe.remove()
    return family
  })
  await mount(page, 'Tile', { children: 'Label', meta: 'Secondary' })
  const tile = page.locator('[data-scope="tile"][data-part="root"]')
  await expect(tile).toBeVisible()
  await expect(tile.locator('.uf-tile__label')).toHaveCSS('font-family', family)
  await expect(tile.locator('[data-part="meta"]')).toHaveCSS('font-family', family)
  await mount(page, 'Tile', { children: 'Label', style: { fontFamily: 'monospace' } })
  await expect(tile.locator('.uf-tile__label')).toHaveCSS('font-family', 'monospace')
})
test('Tile tone reaches its own label without repainting a nested Button', { tag: ['@css'] }, async ({
  page,
}) => {
  for (const tone of [
    'neutral',
    'muted',
    'positive',
    'warning',
    'destructive',
  ] as const) {
    await page.evaluate((tone) => {
      const {
        React: R,
        renderProps,
        propComponents: { Button },
      } = window as unknown as MountWindow
      renderProps('Tile', {
        tone,
        children: 'Status',
        icon: 'folder',
        actions: R.createElement(Button, { children: 'Edit', variant: 'primary' }),
        actionVisibility: 'always',
      })
    }, tone)
    const tile = page.locator('.uf-tile')
    await expect(tile).toHaveAttribute('data-tone', tone)
    const colors = await tile.evaluate((node) => ({
      root: getComputedStyle(node).color,
      label: getComputedStyle(node.querySelector('[data-part="text"]')!).color,
      action: getComputedStyle(node.querySelector('button .uf-button__label')!)
        .color,
    }))
    expect(colors.label).toBe(colors.root)
    expect(colors.action).not.toBe(colors.root)
  }
})
test('Tile stretchText works when a disclosure indicator is present', { tag: ['@layout'] }, async ({
  page,
}) => {
  const widths: number[] = []
  for (const stretchText of [false, true]) {
    await mount(page, 'Tile', { children: 'Title', chevron: 'down', stretchText })
    const tile = page.locator('.uf-tile')
    await expect(tile).toHaveAttribute('data-selector', '')
    if (stretchText) await expect(tile).toHaveAttribute('data-stretch-text', '')
    else await expect(tile).not.toHaveAttribute('data-stretch-text')
    widths.push(
      (await tile.locator('> [data-part="text"]').boundingBox())!.width,
    )
  }
  expect(widths[1] - widths[0]).toBeGreaterThan(200)
})
test('Tile truncate=false wraps the label and align affects stretched text', { tag: ['@layout'] }, async ({
  page,
}) => {
  for (const align of ['start', 'center', 'end'] as const) {
    await mount(page, 'Tile', { children: 'Short label', align, stretchText: true })
    await expect(page.locator('.uf-tile')).toHaveAttribute('data-align', align)
    const x = await page.locator('.uf-tile__label').evaluate((node) => {
      const r = document.createRange()
      r.selectNodeContents(node)
      return {
        label: node.getBoundingClientRect().toJSON(),
        text: r.getBoundingClientRect().toJSON(),
      }
    })
    if (align === 'center')
      expect(
        Math.abs(
          (x.label.left + x.label.right) / 2 - (x.text.left + x.text.right) / 2,
        ),
      ).toBeLessThan(2)
    if (align === 'end')
      expect(Math.abs(x.label.right - x.text.right)).toBeLessThan(2)
  }
  const heights: number[] = []
  for (const truncate of [true, false]) {
    await mount(page, 'Tile', {
      children: 'A long description with enough words to wrap to multiple lines inside this narrow row.',
      style: { width: 180 },
      truncate,
    })
    const tile = page.locator('.uf-tile')
    if (truncate) await expect(tile).toHaveAttribute('data-truncate', '')
    else await expect(tile).not.toHaveAttribute('data-truncate')
    heights.push((await tile.boundingBox())!.height)
  }
  expect(heights[1] - heights[0]).toBeGreaterThan(20)
})
test('Tile indent applies at the logical start in RTL', { tag: ['@css'] }, async ({ page }) => {
  const rows: { left: number; right: number }[] = []
  for (const level of [0, 2]) {
    await mount(page, 'Tile', { children: 'Project', dir: 'rtl', indent: level })
    await expect(page.locator('.uf-tile')).toHaveCSS(
      '--face-runtime-option-level',
      String(level),
    )
    rows.push(
      await page.locator('.uf-tile').evaluate((node) => ({
        left: parseFloat(getComputedStyle(node).paddingLeft),
        right: parseFloat(getComputedStyle(node).paddingRight),
      })),
    )
  }
  expect(rows[1].right - rows[0].right).toBeGreaterThan(20)
  expect(rows[1].left).toBe(rows[0].left)
})
test('Tile state styles do not leak into nested Tile and Text components', { tag: ['@css'] }, async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      React: R,
      renderProps,
      propComponents: { Tile, Text, Button },
    } = window as unknown as MountWindow
    renderProps('Tile', {
      'aria-busy': true,
      actionVisibility: 'hidden',
      children: R.createElement(Tile, {
        children: 'Inner',
        actions: R.createElement(Button, { children: 'Edit' }),
        actionVisibility: 'always',
        meta: R.createElement(Text, { children: 'Meta', variant: 'code' }),
      }),
    })
  })
  const inner = page.locator('.uf-tile .uf-tile')
  await expect(inner.locator('> [data-part="actions"]')).toHaveCSS(
    'visibility',
    'visible',
  )
  await expect(inner.locator('> [data-part="text"]')).toHaveCSS('opacity', '1')
  await expect(
    inner.locator('.uf-text[data-variant="code"] .uf-text__content'),
  ).not.toHaveCSS('display', 'contents')
})
test('Tile primary names, keyboard activation and isolated controls agree across composition changes', { tag: ['@focus', '@pointer'] }, async ({
  page,
}) => {
  for (const membrane of [false, true]) {
    await page.evaluate((membrane) => {
      const {
        React: R,
        renderProps,
        propComponents: { Button },
      } = window as unknown as MountWindow
      ;(window as any).propEvents = []
      renderProps('Tile', {
        membrane,
        children: 'Visible title',
        'aria-label': 'Open project',
        onClick: () => (window as any).propEvents.push('open'),
        leading: R.createElement(Button, {
          children: 'Pin',
          onClick: () => (window as any).propEvents.push('pin'),
        }),
        actions: R.createElement(Button, {
          children: 'Edit',
          onClick: () => (window as any).propEvents.push('edit'),
        }),
      })
    }, membrane)
    if (membrane)
      await expect(page.locator('.uf-tile')).toHaveAttribute(
        'data-membrane',
        '',
      )
    else
      await expect(page.locator('.uf-tile')).not.toHaveAttribute(
        'data-membrane',
      )
    const primary = page.getByRole('button', {
      name: 'Open project',
      exact: true,
    })
    await primary.focus()
    await expect(primary).toBeFocused()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'Pin', exact: true }).click()
    expect(await page.evaluate(() => (window as any).propEvents)).toEqual([
      'open',
      'open',
      'edit',
      'pin',
    ])
  }
})
test('Tile disabled blocks the primary action while independent nested controls remain usable', { tag: ['@css', '@pointer'] }, async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      React: R,
      renderProps,
      propComponents: { Button },
    } = window as unknown as MountWindow
    renderProps('Tile', {
      disabled: true,
      children: 'Unavailable',
      onClick: () => (window as any).propEvents.push('open'),
      actionVisibility: 'always',
      actions: R.createElement(Button, {
        children: 'Remove',
        onClick: () => (window as any).propEvents.push('remove'),
      }),
    })
  })
  await expect(page.locator('[data-part="primary"]')).toBeDisabled()
  await expect(page.locator('.uf-tile')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Remove', exact: true }).focus()
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => (window as any).propEvents)).toEqual([
    'remove',
    'remove',
  ])
})
test('Tile action visibility distinguishes active reveal from hover and supports focus and touch', { tag: ['@css', '@pointer', '@focus'] }, async ({
  page,
}) => {
  for (const visibility of ['hidden', 'always', 'hover', 'reveal'] as const) {
    await page.mouse.move(1000, 700)
    await page.evaluate((actionVisibility) => {
      ;(document.activeElement as HTMLElement)?.blur()
      const {
        React: R,
        renderProps,
        propComponents: { Button },
      } = window as unknown as MountWindow
      renderProps('Tile', {
        children: 'Title',
        onClick: () => {},
        active: true,
        actionVisibility,
        actions: R.createElement(Button, { children: 'Edit' }),
      })
    }, visibility)
    await expect(page.locator('.uf-tile')).toHaveAttribute(
      'data-action-visibility',
      visibility,
    )
    const actions = page.locator('.uf-tile > [data-part="actions"]')
    await expect(actions).toHaveCSS(
      'opacity',
      ['reveal', 'always'].includes(visibility) ? '1' : '0',
    )
    if (visibility === 'hidden') {
      await expect(actions).toHaveCSS('visibility', 'hidden')
      continue
    }
    await page.locator('[data-part="primary"]').focus()
    await expect(actions).toHaveCSS('opacity', '1')
  }
})
test('Tile variants, tones and passive rows have distinct and coherent hover behavior', { tag: ['@css', '@pointer'] }, async ({
  page,
}) => {
  const colors: Record<string, string> = {}
  for (const [key, props] of Object.entries({
    normal: { interactive: true },
    passive: { interactive: false },
    ghost: { variant: 'ghost', interactive: true },
    accent: { tone: 'accent', interactive: true },
  } satisfies Record<string, MountProps<'Tile'>>)) {
    await mount(page, 'Tile', { children: 'Title', 'data-case': key, ...props })
    const tile = page.locator('.uf-tile')
    await expect(tile).toHaveAttribute('data-case', key)
    await tile.hover()
    colors[key] = await tile.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    )
    if (key === 'passive') await expect(tile).toHaveCSS('cursor', 'default')
  }
  expect(colors.normal).not.toBe(colors.passive)
  expect(colors.ghost).toBe(colors.passive)
  expect(colors.accent).not.toBe(colors.normal)
})
test('Tile density, fullWidth, iconPosition and membrane change actual geometry', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  const rows: Record<
    string,
    { row: number; label: number; icon: number; pad: number; boundary: number }
  > = {}
  for (const [key, props] of Object.entries({
    base: {},
    spacious: { density: 'spacious' },
    intrinsic: { fullWidth: false },
    right: { iconPosition: 'end' },
    bare: { membrane: false },
  } satisfies Record<string, MountProps<'Tile'>>)) {
    await mount(page, 'Tile', { children: 'Title', icon: 'folder', 'data-case': key, ...props })
    await expect(page.locator('.uf-tile')).toHaveAttribute('data-case', key)
    rows[key] = await page.locator('.uf-tile').evaluate((node) => ({
      row: node.getBoundingClientRect().width,
      label: node.querySelector('[data-part="text"]')!.getBoundingClientRect()
        .x,
      icon: node.querySelector('[data-part="icon"]')!.getBoundingClientRect().x,
      pad: parseFloat(getComputedStyle(node).paddingRight),
      boundary: node.parentElement!.matches(
        '.uf-membrane:not([data-membrane-disabled])',
      )
        ? node.parentElement!.getBoundingClientRect().width -
          node.getBoundingClientRect().width
        : 0,
    }))
  }
  expect(rows.spacious.pad).toBeGreaterThan(rows.base.pad)
  expect(rows.base.row - rows.intrinsic.row).toBeGreaterThan(200)
  expect(rows.base.icon).toBeLessThan(rows.base.label)
  expect(rows.right.icon).toBeGreaterThan(rows.right.label)
  expect(rows.base.boundary).toBeGreaterThan(0)
  expect(rows.bare.boundary).toBe(0)
})

for (const theme of ['light', 'dark']) {
  test(`Tile labels, hints and metadata retain contrast in ${theme}`, { tag: ['@a11y', '@layout'] }, async ({
    page,
  }) => {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    for (const tone of [
      'neutral',
      'muted',
      'accent',
      'positive',
      'warning',
      'destructive',
    ] as const) {
      await mount(page, 'Tile', {
        children: 'Project name',
        meta: '12 items',
        tone,
        'aria-busy': true,
      })
      await expect(page.locator('.uf-tile')).toHaveAttribute('data-tone', tone)
      const violations = await page.evaluate(async () =>
        (
          await (window as any).axe.run('[data-prop-fixture]', {
            runOnly: ['color-contrast'],
          })
        ).violations.map((v: any) => ({
          id: v.id,
          nodes: v.nodes.map((n: any) => n.target),
        })),
      )
      expect(violations, tone).toEqual([])
      const ratios = await page.locator('.uf-tile').evaluate((row) => {
        const context = document.createElement('canvas').getContext('2d')!
        const rgba = (value: string) => {
          context.clearRect(0, 0, 1, 1)
          context.fillStyle = value
          context.fillRect(0, 0, 1, 1)
          return Array.from(context.getImageData(0, 0, 1, 1).data)
        }
        const background = rgba(
          getComputedStyle(row).getPropertyValue('--uf-color-bg'),
        )
        const luminance = (rgb: number[]) =>
          rgb
            .slice(0, 3)
            .map((x) => {
              x /= 255
              return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
            })
            .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0)
        return ['.uf-tile__label', '[data-part="meta"]'].map((selector) => {
          const node = row.querySelector(selector)!
          let opacity = 1
          for (
            let ancestor: Element | null = node;
            ancestor;
            ancestor = ancestor.parentElement
          )
            opacity *= Number(getComputedStyle(ancestor).opacity)
          const foreground = rgba(getComputedStyle(node).color)
          const alpha = (foreground[3] / 255) * opacity
          const blended = foreground
            .slice(0, 3)
            .map((x, i) => x * alpha + background[i] * (1 - alpha))
          const light = luminance(blended),
            back = luminance(background)
          return {
            selector,
            width: node.getBoundingClientRect().width,
            ratio:
              (Math.max(light, back) + 0.05) / (Math.min(light, back) + 0.05),
          }
        })
      })
      for (const item of ratios) {
        expect(item.width, item.selector).toBeGreaterThan(1)
        expect(item.ratio, `${tone}: ${item.selector}`).toBeGreaterThanOrEqual(
          4.5,
        )
      }
      await expect(page.locator('.uf-tile')).toHaveCSS('cursor', 'wait')
    }
  })
}
test('Tile chevron follows focus, hover, side expansion and nested ownership', { tag: ['@css', '@pointer', '@focus'] }, async ({
  page,
}) => {
  for (const rich of [false, true]) {
    await page.mouse.move(1000, 700)
    await page.evaluate((rich) => {
      ;(document.activeElement as HTMLElement)?.blur()
      const {
        React: R,
        renderProps,
        propComponents: { Button },
      } = window as unknown as MountWindow
      renderProps('Tile', {
        children: rich ? R.createElement('strong', null, 'Title') : 'Title',
        chevron: 'end',
        'aria-expanded': true,
        onClick: () => {},
        actions: R.createElement(Button, { children: 'Edit' }),
      })
    }, rich)
    const indicator = page.locator('.uf-tile__indicator')
    await expect(indicator).toHaveCSS('opacity', '0')
    await page.locator('[data-part="primary"]').focus()
    await expect(indicator).toHaveCSS('opacity', '0.7')
    await expect(indicator).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)')
  }
})
test('Native hidden removes the whole membrane boundary for Tile and Button', { tag: ['@css'] }, async ({
  page,
}) => {
  for (const component of ['Tile', 'Button'] as const) {
    for (const membrane of [true, false]) {
      await mount(page, component, { children: 'Hidden', hidden: true, membrane })
      const root = page.locator(
        `[data-scope="${component.toLowerCase()}"][data-part="root"]`,
      )
      await expect(root).toHaveAttribute('hidden', '')
      if (membrane)
        await expect(root.locator('..')).not.toHaveAttribute(
          'data-membrane-disabled',
        )
      else
        await expect(root.locator('..')).toHaveAttribute(
          'data-membrane-disabled',
          '',
        )
      await expect(root.locator('..')).toHaveCSS('display', 'none')
    }
  }
})
test('Tile align start and the end chevron follow the inline direction in RTL', { tag: ['@layout'] }, async ({
  page,
}) => {
  const tile = page.locator('.uf-tile')
  const measured = []
  for (const dir of ['ltr', 'rtl'] as const)
    for (const expanded of [false, true]) {
      await mount(page, 'Tile', {
        key: `${dir}-${expanded}`,
        children: 'Project',
        align: 'start',
        chevron: 'end',
        stretchText: true,
        'aria-expanded': expanded,
        dir,
        style: { width: 240 },
      })
      await expect(tile).toHaveAttribute('dir', dir)
      measured.push(
        await tile.evaluate((node) => {
          const box = node.getBoundingClientRect()
          const label = node.querySelector('.uf-tile__label')!
          const range = document.createRange()
          range.selectNodeContents(label)
          const text = range.getBoundingClientRect()
          const indicator = node.querySelector('[data-part="indicator"]')!
          return {
            textStart: text.left - box.left,
            textEnd: box.right - text.right,
            indicatorLeft: indicator.getBoundingClientRect().left - box.left,
            indicatorRight: box.right - indicator.getBoundingClientRect().right,
            transform: getComputedStyle(indicator).transform,
          }
        }),
      )
    }
  const [ltr, ltrOpen, rtl, rtlOpen] = measured
  // The label starts at the inline start and the chevron sits at the inline end.
  expect(ltr.textStart).toBeLessThan(ltr.textEnd)
  expect(rtl.textEnd).toBeLessThan(rtl.textStart)
  expect(rtl.textEnd).toBeCloseTo(ltr.textStart, 0)
  expect(ltr.indicatorLeft).toBeGreaterThan(ltr.indicatorRight)
  expect(rtl.indicatorRight).toBeGreaterThan(rtl.indicatorLeft)
  expect(rtl.indicatorLeft).toBeCloseTo(ltr.indicatorRight, 0)
  // Closed, the chevron points to the inline end; expanded, it points down in both directions.
  expect(ltr.transform).toBe('matrix(1, 0, 0, 1, 0, 0)')
  expect(rtl.transform).toBe('matrix(-1, 0, 0, 1, 0, 0)')
  expect(ltrOpen.transform).toBe('matrix(0, 1, -1, 0, 0, 0)')
  expect(rtlOpen.transform).toBe('matrix(0, 1, -1, 0, 0, 0)')
})
