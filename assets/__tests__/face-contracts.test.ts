import { describe, expect, it } from 'vitest'

import { collectFaceJsonContracts } from '../contracts/sync-face-json'

describe('face-ui-react contracts', () => {
  it('stay in sync with component props', { timeout: 30_000 }, () => {
    const drift = collectFaceJsonContracts().filter((entry) => entry.changed)
    expect(drift, drift.map((entry) => `${entry.componentName}: ${entry.contractPath}`).join('\n')).toEqual([])
  })

  it('keeps Upload contract props aligned to the public component API', () => {
    const [upload] = collectFaceJsonContracts('Upload')
    const expectedProps = [
      'accept',
      'multiple',
      'maxSize',
      'maxFiles',
      'disabled',
      'files',
      'onFilesChange',
      'onReject',
      'className',
    ]

    expect(upload).toBeDefined()
    if (!upload) throw new Error('Upload contract was not found')

    expect(upload.changed).toBe(false)
    expect(Object.keys(upload.currentContract.props)).toEqual(expectedProps)
    expect(Object.keys(upload.nextContract.props)).toEqual(expectedProps)
    expect(upload.currentContract.props).not.toHaveProperty('size')
    expect(upload.currentContract.props).not.toHaveProperty('type')
    expect(upload.currentContract.props).not.toHaveProperty('reason')
  })
})
