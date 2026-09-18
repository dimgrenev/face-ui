import { test, expect } from './test'
import { open } from './helpers'

test('native navigation activation and modal sheets share keyboard behavior', { tag: ['@focus', '@native'] }, async ({
  page,
}) => {
  await open(page, 'navigation')
  await page.getByRole('button', { name: 'Run panel', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Navigation actions')).toHaveText('1')
  await page
    .getByRole('menuitem', { name: 'Run navigation', exact: true })
    .focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Navigation actions')).toHaveText('2')
  await page
    .getByRole('menuitem', { name: 'Navigation group', exact: true })
    .focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('menuitem', { name: 'Child action', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('menuitem', { name: 'Navigation group', exact: true }),
  ).toBeFocused()
  for (const [trigger, title] of [
    ['Open panel', 'Project panel'],
    ['Open navigation', 'Project navigation'],
  ]) {
    await page.getByRole('button', { name: trigger, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: title, exact: true })
    await expect(dialog).toBeVisible()
    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole('button', { name: trigger, exact: true }),
    ).toBeFocused()
  }
})
