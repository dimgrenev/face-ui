import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it } from 'vitest'

import {
  buildFaceJsonContract,
  collectFaceJsonContracts,
  collectJsdocReport,
  collectProductScenarioContracts,
  PRODUCT_SCENARIOS,
} from '../../contracts/sync-face-json'
import { FELD_GALLERY_META } from '../../../utils/__generated__/render_gallery.meta.generated'

describe('face-ui-react contracts', () => {
  it('stay in sync with component props', { timeout: 30_000 }, () => {
    const drift = collectFaceJsonContracts().filter((entry) => entry.changed)
    expect(drift, drift.map((entry) => `${entry.componentName}: ${entry.contractPath}`).join('\n')).toEqual([])
  })

  it('keeps Upload contract props aligned to the public component API', () => {
    const [upload] = collectFaceJsonContracts('Upload')
    const expectedProps = [
      'label',
      'description',
      'error',
      'labelPosition',
      'files',
      'defaultFiles',
      'accept',
      'multiple',
      'maxSize',
      'maxFiles',
      'disabled',
      'name',
      'form',
      'required',
      'autoFocus',
      'aria-label',
      'aria-labelledby',
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

  it('publishes the floating surfaces own positioning defaults', () => {
    // Tooltip, Popover and Overlay take theirs from the shared internal implementation,
    // which the parser never reads, so an editor would offer the props with no value.
    const expected: Record<string, Record<string, unknown>> = {
      Popover: { defaultOpen: false, side: 'top', align: 'center', sideOffset: 2 },
      Tooltip: { defaultOpen: false, side: 'top', align: 'center', sideOffset: 2, openDelay: 200, closeDelay: 0 },
      Overlay: { defaultOpen: false, side: 'top', align: 'center', sideOffset: 2, openDelay: 200, closeDelay: 0 },
      Menu: { defaultOpen: false, side: 'bottom', align: 'end', sideOffset: 4 },
    }
    for (const [componentName, defaults] of Object.entries(expected)) {
      const [entry] = collectFaceJsonContracts(componentName)
      if (!entry) throw new Error(`${componentName} contract was not found`)
      for (const [propName, value] of Object.entries(defaults))
        expect(entry.currentContract.props[propName], `${componentName}.${propName}`).toMatchObject({
          default: value,
        })
    }
  })

  it('publishes every default a prop description promises', () => {
    // A default resolved anywhere but the wrapper's destructuring — in a shared internal
    // component, or through readNumber — is invisible to the parser and needs an override.
    // Both spellings count: a closing sentence "Default <x>." and an inline "defaults to <x>".
    // The first stays case-sensitive, or "names the default trigger" would match it too.
    const PROMISE = [/\bDefault [^.]+\.\s*$/, /\bdefaults to\b|\bby default\b/i]
    // Defaults the contract cannot carry because the component computes them, each with the
    // word its description has to name, so the exemption stays tied to a truthful sentence.
    const COMPUTED: Record<string, string> = {
      'Date.closeOnSelect': 'single date',
      'Slider.defaultValue': 'min',
      'Slider.defaultCropRange': 'scale',
      'Table.rowKey': 'id',
    }
    const promised: string[] = []
    for (const { componentName, currentContract } of collectFaceJsonContracts())
      for (const [propName, prop] of Object.entries(currentContract.props)) {
        const id = `${componentName}.${propName}`
        const description = prop.description ?? ''
        if (!PROMISE.some((promise) => promise.test(description))) continue
        if ('default' in prop || description.includes(COMPUTED[id] ?? '\0')) continue
        promised.push(`${id}: ${description}`)
      }
    expect(promised, promised.join('\n')).toEqual([])
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
    for (const removed of ['intent', 'selector', 'selectorOpen', 'busy', 'selectedDescendant', 'text', 'rightText', 'level']) {
      expect(contracts.get('Tile')?.props).not.toHaveProperty(removed)
    }
    expect(contracts.get('Tile')?.props.chevron?.options).toEqual(['down', 'end'])
    expect(contracts.get('Tile')?.props['aria-expanded']?.type).toBe('boolean')
    expect(contracts.get('Tile')?.props['aria-busy']?.type).toBe('boolean')
    expect(contracts.get('Modal')?.props).not.toHaveProperty('variant')
    expect(contracts.get('Modal')?.props.placement?.options).toEqual(['center', 'start', 'end', 'top', 'bottom'])
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

describe('contract generator', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'face-contract-'))
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }))
  function fixture(source: string, contract: Record<string, unknown> = {}) {
    const componentDir = path.join(fs.mkdtempSync(path.join(root, 'case-')), 'Fixture')
    fs.mkdirSync(componentDir)
    const entry = {
      componentName: 'Fixture',
      componentDir,
      sourcePath: path.join(componentDir, 'Fixture.tsx'),
      contractPath: path.join(componentDir, 'Fixture.json'),
    }
    fs.writeFileSync(entry.sourcePath, source)
    fs.writeFileSync(entry.contractPath, JSON.stringify({ name: 'Fixture', props: {}, ...contract }))
    return entry
  }

  it('takes component and prop descriptions from JSDoc, and refuses to invent one', () => {
    const stored = {
      description: 'Stored component text.',
      props: {
        tone: { type: 'enum', required: false, description: 'Stored tone text.' },
        size: { type: 'number', required: false, description: 'Stored size text.' },
      },
    }
    const documented = fixture(`
      export interface FixtureProps {
        /** Semantic tone of the row. */
        tone?: 'neutral' | 'accent'
        /** Height of the row in pixels. */
        size?: number
      }
      /** Row with an optional primary action. */
      export function Fixture(props: FixtureProps) { return null }
    `, stored)
    const contract = buildFaceJsonContract(documented)
    expect(contract.description).toBe('Row with an optional primary action.')
    expect(contract.props.tone.description).toBe('Semantic tone of the row.')
    expect(contract.props.size.description).toBe('Height of the row in pixels.')
    expect(collectJsdocReport([documented])).toEqual([])

    // The stored contract is no second home: an undocumented prop stops the generator.
    const undocumentedProp = fixture(`
      export interface FixtureProps {
        /** Semantic tone of the row. */
        tone?: 'neutral' | 'accent'
        size?: number
      }
      /** Row with an optional primary action. */
      export function Fixture(props: FixtureProps) { return null }
    `, stored)
    expect(() => buildFaceJsonContract(undocumentedProp)).toThrow(/Undocumented:\n {2}size/)
    expect(collectJsdocReport([undocumentedProp])).toEqual(['Fixture.size'])

    const undocumentedComponent = fixture(`
      export interface FixtureProps {
        /** Semantic tone of the row. */
        tone?: 'neutral' | 'accent'
      }
      export function Fixture(props: FixtureProps) { return null }
    `, stored)
    expect(() => buildFaceJsonContract(undocumentedComponent)).toThrow(/Undocumented:\n {2}the component declaration/)
    expect(collectJsdocReport([undocumentedComponent])).toEqual(['Fixture (component)'])
  })

  it('fails when union branches document the same prop differently', () => {
    const entry = fixture(`
      interface Single {
        /** Select one option. */
        multiple?: false
      }
      interface Multiple {
        /** Select any number of options. */
        multiple: true
      }
      export type FixtureProps = Single | Multiple
      /** Option picker. */
      export function Fixture(props: FixtureProps) { return null }
    `)
    expect(() => buildFaceJsonContract(entry)).toThrow(
      'Fixture: union branches must share one JSDoc per prop:\n  multiple: "Select one option." vs "Select any number of options."',
    )
    expect(collectJsdocReport([entry])).toEqual(['Fixture.multiple (union branches differ)'])
  })

  it('renders every disclosure example as a focusable control, not an inert element with aria-expanded', async () => {
    const examples = [
      ...collectFaceJsonContracts().flatMap(({ componentName, nextContract }) =>
        (nextContract.states ?? []).map((state) => ({ componentName, name: state.name, props: state.props }))),
      ...collectProductScenarioContracts().map(({ componentName, scenarioName, nextContract }) =>
        ({ componentName, name: scenarioName, props: nextContract.currentState.props })),
    ].filter(({ props }) => 'aria-expanded' in props)
    expect(examples.length).toBeGreaterThan(0)

    for (const { componentName, name, props } of examples) {
      const module = await import(`../../../${componentName}/${componentName}.tsx`)
      const html = renderToStaticMarkup(createElement(module[componentName] as ComponentType, props))
      const inert = (html.match(/<[a-z]+\b[^>]*\saria-expanded="[^"]*"[^>]*>/g) ?? [])
        .filter((tag) => !tag.startsWith('<button') && !/\stabindex="0"/.test(tag))
      expect(inert, `${componentName}: ${name}`).toEqual([])
    }
  })
})
