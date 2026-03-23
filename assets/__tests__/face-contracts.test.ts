import { describe, expect, it } from 'vitest'

import { collectFaceJsonContracts } from '../contracts/sync-face-json'

describe('face-ui-react contracts', () => {
  it('stay in sync with component props', { timeout: 30_000 }, () => {
    const drift = collectFaceJsonContracts().filter((entry) => entry.changed)
    expect(drift, drift.map((entry) => `${entry.componentName}: ${entry.contractPath}`).join('\n')).toEqual([])
  })
})
