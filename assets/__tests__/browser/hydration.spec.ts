import { test, expect } from './test'
import { open } from './helpers'

test('server markup hydrates without recovery and remains interactive', { tag: ['@hydration'] }, async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await open(page, 'hydration')
  await expect(page.getByRole('checkbox', { name: 'Partial selection', exact: true })).toBeChecked({indeterminate:true})
  const serverSwitch = page.getByRole('switch', { name: 'Notifications', exact: true })
  await expect(serverSwitch).toBeChecked()
  await serverSwitch.focus()
  await page.keyboard.press('Space')
  await expect(serverSwitch).not.toBeChecked()
  await expect(page.getByRole('radio', { name: 'Standard', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'Standard', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: 'Professional', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Details trigger' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Details', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open dialog' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Dialog', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
