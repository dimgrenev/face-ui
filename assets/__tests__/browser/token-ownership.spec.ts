import { expect, test } from './test'
import { open } from './helpers'

test('foundation motion aliases keep runtime values and follow reduced motion @css', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await open(page, 'markdown')
  const values = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const token = (name: string) => root.getPropertyValue(name).trim()
    const milliseconds = (name: string) => {
      const value = token(name)
      return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000)
    }
    return {
      fast: milliseconds('--uf-motion-fast'),
      snappy: milliseconds('--uf-motion-snappy'),
      normal: milliseconds('--uf-motion-normal'),
      slow: milliseconds('--uf-motion-slow'),
      easeOut: token('--uf-ease-out'),
      easeInOut: token('--uf-ease-in-out'),
      zDropdown: token('--uf-z-dropdown'),
      zOverlay: token('--uf-z-overlay'),
      zModal: token('--uf-z-modal'),
      zToast: token('--uf-z-toast'),
    }
  })
  expect(await values()).toEqual({
    fast: 120,
    snappy: 150,
    normal: 200,
    slow: 250,
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    zDropdown: '2300',
    zOverlay: '1900',
    zModal: '2100',
    zToast: '2400',
  })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await values()
  for (const duration of [reduced.fast, reduced.snappy, reduced.normal, reduced.slow])
    expect(duration).toBeLessThan(0.1)
})
