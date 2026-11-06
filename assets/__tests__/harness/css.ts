import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { flattenCss } = require('../../../scripts/build-npm.cjs') as {
  flattenCss: (filePath: string) => string
}

/** Absolute path of `assets/styles` (path-based: jsdom's global URL is not file-aware). */
export const stylesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../styles')

let cached: string | undefined

/**
 * The component stylesheet exactly as published in dist: `components.css`
 * with its ordered `@import` list (text.css, components/*.css, interaction.css)
 * inlined by the same `flattenCss` the npm build uses.
 */
export function libraryCss(): string {
  cached ??= flattenCss(resolve(stylesDir, 'components.css'))
  return cached
}
