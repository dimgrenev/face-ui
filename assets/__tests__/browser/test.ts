import { test as base } from '@playwright/test'
export { expect } from '@playwright/test'
export type { Browser, BrowserContext, Locator, Page } from '@playwright/test'

/**
 * What a browser test needs the browser for (RFC §7.1). An assertion that
 * would pass with CSS disabled and without layout belongs in jsdom.
 * playwright.config.ts runs each engine on the tags it can decide.
 */
export const capabilities = [
  '@layout',
  '@css',
  '@forced-colors',
  '@focus',
  '@native',
  '@pointer',
  '@intl',
  '@a11y',
  '@hydration',
  '@react',
]

export const test = base.extend<{ capability: void }>({
  capability: [
    async ({}, use, testInfo) => {
      const unknown = testInfo.tags.filter((tag) => !capabilities.includes(tag))
      if (!testInfo.tags.length || unknown.length)
        throw new Error(
          `"${testInfo.title}" ${unknown.length ? `has unknown tag ${unknown.join(' ')}` : 'has no capability tag'}. ` +
            `Tag it with ${capabilities.join(' ')}; logic belongs in jsdom.`,
        )
      await use()
    },
    { auto: true },
  ],
})
