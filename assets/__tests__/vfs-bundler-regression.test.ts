import { describe, expect, it } from 'vitest'
import { bundleFromVfs } from '@userface/engine/bundler'

describe('bundleFromVfs regressions', () => {
  it('follows multiline imports when building the dependency graph', () => {
    const vfs = {
      'face-ui-react/entry.js': {
        name: 'face-ui-react/entry.js',
        type: 'text/plain',
        content: `
import { value } from './lib.js'

export const result = value
        `.trim(),
      },
      'face-ui-react/lib.js': {
        name: 'face-ui-react/lib.js',
        type: 'text/plain',
        content: `
import {
  deepValue,
} from './deep.js'

export const value = deepValue
        `.trim(),
      },
      'face-ui-react/deep.js': {
        name: 'face-ui-react/deep.js',
        type: 'text/plain',
        content: `export const deepValue = 42`,
      },
    }

    const result = bundleFromVfs('face-ui-react/entry.js', vfs)

    expect(result.filesUsed).toEqual([
      'face-ui-react/deep.js',
      'face-ui-react/lib.js',
      'face-ui-react/entry.js',
    ])
    expect(result.moduleErrors).toEqual([])
    expect(result.error).toBe('bundle_transpile_failed: Babel is not available (cannot transpile TS bundle)')
  })

  it('registers named entry components without overwriting native globals', () => {
    const vfs = {
      'face-ui-react/Date/Date.js': {
        name: 'face-ui-react/Date/Date.js',
        type: 'text/plain',
        content: `
export default function DateField() {
  return null
}
        `.trim(),
      },
    }

    const result = bundleFromVfs('face-ui-react/Date/Date.js', vfs, {
      Babel: {
        availablePresets: { typescript: {}, react: {} },
        transform(source: string) {
          return { code: source }
        },
      },
    })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.code).toContain('window.__UF_COMPONENTS__')
    expect(result.code).not.toContain("window['Date'] =")
    expect(result.code).not.toContain('window.Date =')
  })
})
