import { test, expect } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.goto('/scripts/browser/props.html')
  await page.waitForFunction(
    () => typeof (window as any).renderProps === 'function',
  )
})
test('Bar preserves native tab order and activation without claiming toolbar focus management', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      React: R,
      propComponents: { Button },
      renderProps,
    } = window as any
    renderProps('Bar', {
      children: ['First', 'Second', 'Third'].map((text) =>
        R.createElement(Button, {
          key: text,
          text,
          onClick: () => (window as any).propEvents.push(text),
        }),
      ),
    })
  })
  await expect(page.getByRole('toolbar')).toHaveCount(0)
  await expect(page.getByRole('button')).toHaveCount(3)
  // Match native button navigation on this platform. macOS WebKit can reserve
  // plain Tab for text controls and use Option+Tab for all controls.
  await page.evaluate(() => {
    const native = document.createElement('button')
    native.id = 'native-before-bar'
    native.textContent = 'Native before Bar'
    document.body.prepend(native)
  })
  await page.keyboard.press('Tab')
  let tabKey = 'Tab'
  if (
    !(await page
      .locator('#native-before-bar')
      .evaluate((node) => node === document.activeElement))
  ) {
    tabKey = 'Alt+Tab'
    await page.keyboard.press(tabKey)
  }
  await expect(page.locator('#native-before-bar')).toBeFocused()
  for (const name of ['First', 'Second', 'Third']) {
    await page.keyboard.press(tabKey)
    await expect(page.getByRole('button', { name, exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
  }
  expect(await page.evaluate(() => (window as any).propEvents)).toEqual([
    'First',
    'Second',
    'Third',
  ])
})
test('BarSection logical alignment follows RTL direction', async ({ page }) => {
  await page.evaluate(() => {
    const {
      React: R,
      propComponents: { BarSection, Button },
      renderProps,
    } = window as any
    renderProps('Bar', {
      dir: 'rtl',
      children: [
        R.createElement(
          BarSection,
          { key: 'start' },
          R.createElement(Button, { text: 'Start' }),
        ),
        R.createElement(
          BarSection,
          { key: 'end', align: 'end' },
          R.createElement(Button, { text: 'End' }),
        ),
      ],
    })
  })
  await expect(page.getByRole('button')).toHaveCount(2)
  const start = (await page
    .getByRole('button', { name: 'Start', exact: true })
    .boundingBox())!
  const end = (await page
    .getByRole('button', { name: 'End', exact: true })
    .boundingBox())!
  expect(start.x - end.x).toBeGreaterThan(300)
})
test('BarSection start/end occupy the correct edges in both orientations and preserve every action', async ({
  page,
}) => {
  for (const orientation of ['horizontal', 'vertical']) {
    await page.evaluate((orientation) => {
      const {
        React: R,
        propComponents: { BarSection, Button },
        renderProps,
      } = window as any
      renderProps('Bar', {
        orientation,
        'aria-label': 'Actions',
        style: { width: 380, height: 240 },
        children: [
          R.createElement(
            BarSection,
            { key: 'start' },
            R.createElement(Button, { text: 'First' }),
            R.createElement(Button, { text: 'Second' }),
          ),
          R.createElement(
            BarSection,
            { key: 'end', align: 'end' },
            R.createElement(Button, { text: 'Last' }),
          ),
        ],
      })
    }, orientation)
    const root = page.locator('[data-scope="bar"][data-part="root"]')
    await expect(root).toHaveAttribute('data-orientation', orientation)
    await expect(page.getByRole('button')).toHaveCount(3)
    const first = (await page
      .getByRole('button', { name: 'First', exact: true })
      .boundingBox())!
    const second = (await page
      .getByRole('button', { name: 'Second', exact: true })
      .boundingBox())!
    const last = (await page
      .getByRole('button', { name: 'Last', exact: true })
      .boundingBox())!
    if (orientation === 'horizontal') {
      expect(second.x).toBeGreaterThan(first.x)
      expect(last.x - second.x).toBeGreaterThan(150)
    } else {
      expect(second.y).toBeGreaterThan(first.y)
      expect(last.y - second.y).toBeGreaterThan(120)
    }
  }
})
test('Bar vertical orientation accommodates visible text and named actions instead of forcing an icon width', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      React: R,
      propComponents: { Bar, Button },
      renderProps,
    } = window as any
    renderProps('Bar', {
      orientation: 'vertical',
      children: [
        R.createElement(
          Bar.Section,
          { key: 'start', grow: true },
          R.createElement(Button, { text: 'Save workspace' }),
          R.createElement(Button, { text: 'Open settings' }),
        ),
        R.createElement(
          Bar.Section,
          { key: 'end', align: 'end' },
          R.createElement(Button, { text: 'Publish' }),
        ),
      ],
    })
  })
  const root = page.locator('[data-scope="bar"][data-part="root"]')
  const first = page.getByRole('button', { name: 'Save workspace' })
  await expect(first).toBeVisible()
  const bar = (await root.boundingBox())!
  const save = (await first.boundingBox())!
  const open = (await page
    .getByRole('button', { name: 'Open settings' })
    .boundingBox())!
  const publish = (await page
    .getByRole('button', { name: 'Publish', exact: true })
    .boundingBox())!
  expect(save.x).toBeGreaterThanOrEqual(bar.x)
  expect(save.x + save.width).toBeLessThanOrEqual(bar.x + bar.width)
  expect(open.y).toBeGreaterThan(save.y)
  expect(publish.y).toBeGreaterThan(open.y)
})
test('Bar.Section grow independently fills the remaining main axis in both directions', async ({
  page,
}) => {
  for (const orientation of ['horizontal', 'vertical']) {
    for (const dir of ['ltr', 'rtl']) {
      for (const align of ['start', 'end']) {
        const dimensions: number[] = []
        for (const grow of [false, true]) {
          await page.evaluate(
            ({ orientation, dir, grow, align }) => {
              const {
                React: R,
                propComponents: { Bar, Button },
                renderProps,
              } = window as any
              renderProps('Bar', {
                orientation,
                dir,
                style: { width: 380, height: 240 },
                children: [
                  R.createElement(
                    Bar.Section,
                    { key: 'content', grow, align, 'data-testid': 'content' },
                    'Title',
                  ),
                  R.createElement(
                    Bar.Section,
                    { key: 'actions', align: 'end' },
                    R.createElement(Button, { text: 'Save' }),
                  ),
                ],
              })
            },
            { orientation, dir, grow, align },
          )
          const root = page.locator('.uf-bar[data-part="root"]')
          const section = page.getByTestId('content')
          await expect(root).toHaveAttribute('data-orientation', orientation)
          await expect(root).toHaveAttribute('dir', dir)
          await expect(section).toHaveAttribute('data-align', align)
          if (grow) await expect(section).toHaveAttribute('data-grow', '')
          else await expect(section).not.toHaveAttribute('data-grow')
          const box = (await section.boundingBox())!
          dimensions.push(orientation === 'horizontal' ? box.width : box.height)
          const content = (await section.locator('.uf-membrane').boundingBox())!
          const offset =
            orientation === 'vertical'
              ? align === 'start'
                ? content.y - box.y
                : box.y + box.height - content.y - content.height
              : (align === 'start') === (dir === 'ltr')
                ? content.x - box.x
                : box.x + box.width - content.x - content.width
          expect(Math.abs(offset)).toBeLessThan(1)
          const action = page.getByRole('button', { name: 'Save', exact: true })
          const label = await action
            .locator('[data-part="label"]')
            .evaluate((node) => ({
              width: node.clientWidth,
              scroll: node.scrollWidth,
            }))
          expect(label.scroll).toBeLessThanOrEqual(label.width)
          const end = (await action.boundingBox())!
          if (orientation === 'vertical')
            expect(end.y).toBeGreaterThanOrEqual(box.y + box.height)
          else if (dir === 'ltr')
            expect(end.x).toBeGreaterThanOrEqual(box.x + box.width)
          else expect(end.x + end.width).toBeLessThanOrEqual(box.x)
        }
        expect(dimensions[1] - dimensions[0]).toBeGreaterThan(150)
      }
    }
  }
})

test('Bar growing content truncates long text without obscuring end actions', async ({
  page,
}) => {
  for (const dir of ['ltr', 'rtl']) {
    await page.evaluate((dir) => {
      const {
        React: R,
        propComponents: { Bar, Button },
        renderProps,
      } = window as any
      renderProps('Bar', {
        dir,
        children: [
          R.createElement(
            Bar.Section,
            { key: 'title', grow: true },
            'A long workspace title '.repeat(10),
          ),
          R.createElement(
            Bar.Section,
            { key: 'actions', align: 'end' },
            R.createElement(Button, { text: 'Publish changes' }),
          ),
        ],
      })
    }, dir)
    await expect(page.locator('.uf-bar[data-part="root"]')).toHaveAttribute(
      'dir',
      dir,
    )
    const title = page.locator('[data-grow] .uf-text__content')
    await expect(title).toHaveCSS('text-overflow', 'ellipsis')
    expect(
      await title.evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(true)
    const label = await page
      .getByRole('button', { name: 'Publish changes' })
      .locator('[data-part="label"]')
      .evaluate((node) => ({
        width: node.clientWidth,
        scroll: node.scrollWidth,
      }))
    expect(label.scroll).toBeLessThanOrEqual(label.width)
  }
})

test('nested Bars keep their own orientation through consumer section components', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      React: R,
      propComponents: { Bar, Button },
      renderProps,
    } = window as any
    function InnerSection() {
      return R.createElement(
        Bar.Section,
        null,
        R.createElement(Button, { text: 'One' }),
        R.createElement(Button, { text: 'Two' }),
      )
    }
    renderProps('Bar', {
      orientation: 'vertical',
      children: [
        R.createElement(
          Bar,
          { key: 'inner', orientation: 'horizontal' },
          R.createElement(InnerSection),
        ),
        R.createElement(
          Bar.Section,
          { key: 'outer' },
          R.createElement(Button, { text: 'Three' }),
          R.createElement(Button, { text: 'Four' }),
        ),
      ],
    })
  })
  await expect(page.getByRole('button')).toHaveCount(4)
  const one = (await page
    .getByRole('button', { name: 'One', exact: true })
    .boundingBox())!
  const two = (await page
    .getByRole('button', { name: 'Two', exact: true })
    .boundingBox())!
  const three = (await page
    .getByRole('button', { name: 'Three', exact: true })
    .boundingBox())!
  const four = (await page
    .getByRole('button', { name: 'Four', exact: true })
    .boundingBox())!
  expect(two.x).toBeGreaterThan(one.x)
  expect(two.y).toBe(one.y)
  expect(four.y).toBeGreaterThan(three.y)
  expect(four.x).toBe(three.x)
})
