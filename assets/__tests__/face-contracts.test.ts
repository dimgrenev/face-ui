import { describe, expect, it } from 'vitest'

import { collectFaceJsonContracts } from '../contracts/sync-face-json'
import { FELD_GALLERY_META } from '../../utils/__generated__/render_gallery.meta.generated'

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

  it('keeps wrapper component contracts aligned to inherited public props', () => {
    const contracts = new Map(
      collectFaceJsonContracts()
        .map((entry) => [entry.componentName, entry.currentContract] as const),
    )

    for (const componentName of ['Drawer', 'Sheet']) {
      const contract = contracts.get(componentName)
      expect(contract, `${componentName} contract should exist`).toBeDefined()
      if (!contract) throw new Error(`${componentName} contract was not found`)

      for (const propName of ['trigger', 'title', 'description', 'children', 'open', 'closable', 'onOpenChange']) {
        expect(contract.props, `${componentName} should expose ${propName}`).toHaveProperty(propName)
      }

      for (const state of contract.states || []) {
        for (const propName of Object.keys(state.props || {})) {
          expect(contract.props, `${componentName} state "${state.name}" uses unknown prop ${propName}`).toHaveProperty(propName)
        }
      }
    }

    const popover = contracts.get('Popover')
    expect(popover).toBeDefined()
    if (!popover) throw new Error('Popover contract was not found')

    for (const propName of ['children', 'content', 'open', 'openDelay', 'closeDelay', 'side', 'align', 'sideOffset', 'onOpenChange']) {
      expect(popover.props, `Popover should expose ${propName}`).toHaveProperty(propName)
    }

    for (const state of popover.states || []) {
      for (const propName of Object.keys(state.props || {})) {
        expect(popover.props, `Popover state "${state.name}" uses unknown prop ${propName}`).toHaveProperty(propName)
      }
    }
  })

  it('does not publish illustrative samples as required prop defaults', () => {
    const offenders: string[] = []

    for (const entry of collectFaceJsonContracts()) {
      for (const [propName, prop] of Object.entries(entry.currentContract.props || {})) {
        if (prop.required && Object.prototype.hasOwnProperty.call(prop, 'default')) {
          offenders.push(`${entry.componentName}.${propName}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('keeps gallery samples on public component contracts', () => {
    const contracts = new Map(
      collectFaceJsonContracts()
        .map((entry) => [entry.componentName, entry.currentContract] as const),
    )
    const deprecatedComponents = new Set(['Date', 'Overlay', 'Sheet', 'Toggle'])
    const activeContractNames = Array.from(contracts.keys())
      .filter((name) => !deprecatedComponents.has(name))
      .sort((left, right) => left.localeCompare(right))
    const galleryNames = FELD_GALLERY_META
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right))

    expect(galleryNames).toEqual(activeContractNames)
    expect(galleryNames).not.toContain('Overlay')
    expect(galleryNames).not.toContain('Sheet')
    expect(galleryNames).not.toContain('Toggle')
    expect(galleryNames).not.toContain('Date')

    for (const entry of FELD_GALLERY_META) {
      const contract = contracts.get(entry.name)
      expect(contract, `${entry.name} should have a component contract`).toBeDefined()
      if (!contract) continue

      for (const propName of Object.keys(entry.sampleProps || {})) {
        expect(
          contract.props,
          `${entry.name} gallery sample uses unknown prop ${propName}`,
        ).toHaveProperty(propName)
      }
    }
  })
})
