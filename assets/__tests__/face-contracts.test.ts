import { describe, expect, it } from 'vitest'

import { PRODUCT_SCENARIOS } from '../contracts/product-scenarios'
import { collectFaceJsonContracts, collectProductScenarioContracts } from '../contracts/sync-face-json'
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
      'defaultFiles',
      'labels',
    ]

    expect(upload).toBeDefined()
    if (!upload) throw new Error('Upload contract was not found')

    expect(upload.changed).toBe(false)
    expect(Object.keys(upload.currentContract.props).sort()).toEqual([...expectedProps].sort())
    expect(Object.keys(upload.nextContract.props).sort()).toEqual([...expectedProps].sort())
    expect(upload.currentContract.props).not.toHaveProperty('size')
    expect(upload.currentContract.props).not.toHaveProperty('type')
    expect(upload.currentContract.props).not.toHaveProperty('reason')
  })

  it('keeps composed component contracts aligned to inherited public props', () => {
    const contracts = new Map(
      collectFaceJsonContracts()
        .map((entry) => [entry.componentName, entry.currentContract] as const),
    )

    for (const componentName of ['Modal']) {
      const contract = contracts.get(componentName)
      expect(contract, `${componentName} contract should exist`).toBeDefined()
      if (!contract) throw new Error(`${componentName} contract was not found`)

      for (const propName of ['trigger', 'title', 'description', 'children', 'open', 'closable', 'placement', 'edge']) {
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

    for (const propName of ['children', 'content', 'open', 'defaultOpen', 'side', 'align', 'sideOffset']) {
      expect(popover.props, `Popover should expose ${propName}`).toHaveProperty(propName)
    }
    expect(popover.props).not.toHaveProperty('openDelay')
    expect(popover.props).not.toHaveProperty('closeDelay')
    expect(popover.props).not.toHaveProperty('interactive')

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

  it('publishes exactly two standalone product face contracts for every component', () => {
    const contracts = collectFaceJsonContracts()
    const productContracts = collectProductScenarioContracts()

    expect(Object.keys(PRODUCT_SCENARIOS).sort()).toEqual(
      contracts.map((entry) => entry.componentName).sort(),
    )
    expect(productContracts).toHaveLength(contracts.length * 2)
    expect(new Set(productContracts.map((entry) => entry.contractPath)).size).toBe(productContracts.length)

    for (const entry of contracts) {
      const componentProductContracts = productContracts
        .filter((productContract) => productContract.componentName === entry.componentName)

      expect(
        (entry.currentContract.states || []).filter((state) => state.name.startsWith('Product / ')),
        `${entry.componentName} should not hide product contracts inside states`,
      ).toEqual([])
      expect(componentProductContracts, entry.componentName).toHaveLength(2)
      expect(new Set(componentProductContracts.map((contract) => contract.scenarioName)).size, entry.componentName).toBe(2)

      for (const contract of componentProductContracts) {
        expect(contract.changed, `${entry.componentName}: ${contract.scenarioName}`).toBe(false)
        expect(contract.currentContract, `${entry.componentName}: ${contract.scenarioName}`).not.toBeNull()
        expect(contract.contractPath).toMatch(/\.face\.json$/)
        expect(contract.currentContract?.schema).toBe('face')
        expect(contract.currentContract?.['schema-version']).toBe(1)
        expect(contract.currentContract?.root.type).toBe(entry.componentName)
        expect(contract.currentContract?.meta.kind).toBe('product-scenario')
        expect(Object.keys(contract.currentContract?.currentState.props || {})).not.toHaveLength(0)
      }
    }
  })

  it('keeps gallery samples on public component contracts', () => {
    const contracts = new Map(
      collectFaceJsonContracts()
        .map((entry) => [entry.componentName, entry.currentContract] as const),
    )
    const deprecatedComponents = new Set(['Overlay', 'Toggle'])
    const activeContractNames = Array.from(contracts.keys())
      .filter((name) => !deprecatedComponents.has(name))
      .sort((left, right) => left.localeCompare(right))
    const galleryNames = FELD_GALLERY_META
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right))

    expect(galleryNames).toEqual(activeContractNames)
    expect(galleryNames).not.toContain('Overlay')
    expect(galleryNames).toContain('Modal')
    expect(galleryNames).not.toContain('Drawer')
    expect(galleryNames).not.toContain('Sheet')
    expect(galleryNames).not.toContain('Toggle')
    expect(galleryNames).toContain('Date')

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

  it('keeps implementation escape hatches and removed aliases out of public contracts', () => {
    const hiddenProps = [
      'className',
      'style',
      'id',
      'role',
      'titleAttr',
      'backdropClassName',
      'positionerClassName',
      'controlRef',
      'controlRole',
      'ariaControls',
      'ariaActiveDescendant',
      'ariaAutoComplete',
      'ariaExpanded',
      'ariaHasPopup',
      'ariaLabelledBy',
      'tabIndex',
    ]

    for (const entry of collectFaceJsonContracts()) {
      for (const propName of hiddenProps) {
        expect(entry.currentContract.props, `${entry.componentName} publishes ${propName}`).not.toHaveProperty(propName)
      }
      for (const [propName, prop] of Object.entries(entry.currentContract.props)) {
        expect(prop.type, `${entry.componentName}.${propName} exposes a non-editable callback`).not.toBe('function')
        expect(propName, `${entry.componentName}.${propName} exposes an event handler`).not.toMatch(/^on[A-Z]/)
        expect(propName, `${entry.componentName}.${propName} exposes an implementation ref/class escape hatch`).not.toMatch(/(?:ClassName|Ref)$/)
      }
    }

    const contracts = new Map(
      collectFaceJsonContracts().map((entry) => [entry.componentName, entry.currentContract] as const),
    )
    expect(contracts.get('Card')?.props.variant?.options).toEqual(['default', 'plain', 'code'])
    expect(contracts.get('Card')?.props.padding?.options).toEqual(['default', 'control', 'membrane', 'none'])
    expect(contracts.get('Card')?.props.radius?.options).toEqual(['md', 'lg', 'none'])
    expect(contracts.get('Card')?.props.footerAlign?.options).toEqual(['start', 'end', 'between'])
    expect(contracts.get('Card')?.props.border?.default).toBe(true)
    expect(contracts.get('Button')?.props.iconPosition?.default).toBe('start')
    expect(contracts.get('Button')?.props.iconOnly?.default).toBe(false)
    expect(contracts.get('Button')?.props.disabled?.default).toBe(false)
    expect(contracts.get('Button')?.props.loading?.default).toBe(false)
    expect(contracts.get('Button')?.props.membrane?.default).toBe(true)
    expect(contracts.get('Button')?.props.variant?.options).not.toContain('suggestion')
    expect(contracts.get('Text')?.props.variant?.options).not.toContain('default')
    for (const removed of ['intent', 'selector', 'selectorOpen', 'busy', 'selectedDescendant']) {
      expect(contracts.get('Tile')?.props).not.toHaveProperty(removed)
    }
    expect(contracts.get('Tile')?.props.chevron?.options).toEqual(['down', 'right'])
    expect(contracts.get('Tile')?.props['aria-expanded']?.type).toBe('boolean')
    expect(contracts.get('Tile')?.props['aria-busy']?.type).toBe('boolean')
    expect(contracts.get('Modal')?.props).not.toHaveProperty('variant')
    expect(contracts.get('Modal')?.props.placement?.options).toEqual(['center', 'left', 'right', 'top', 'bottom'])
    expect(contracts.get('Modal')?.props.edge?.options).toEqual(['inset', 'flush'])
    expect(contracts.get('Modal')?.props.edge?.default).toBe('inset')
    expect(contracts.get('Modal')?.props.height?.type).toBe('number')
    expect(contracts.get('Modal')?.props).not.toHaveProperty('surface')
    expect(contracts.get('Modal')?.props).not.toHaveProperty('surfaceBreakpoint')
    expect(contracts.has('Drawer')).toBe(false)
    expect(contracts.has('Sheet')).toBe(false)
    expect(contracts.get('Slider')?.props).not.toHaveProperty('leading')
  })
})
