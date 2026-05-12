import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getAdvancedPropParser, type ParsedProp } from './lib/advancedPropParser'
import { extractReactTsPropsFromSource, type ExtractedProp } from './lib/tsPropExtractor'
import { getTypeEnricher, type EnrichedProp } from './lib/typeEnricher'

type VFSFile = { content: string }

export interface FaceJsonProp {
  type: 'string' | 'number' | 'boolean' | 'function' | 'enum' | 'array' | 'object' | 'union' | 'ReactNode' | 'node' | 'any'
  default?: unknown
  required: boolean
  description?: string
  options?: Array<string | number | boolean>
  [key: string]: unknown
}

export interface FaceJsonContract {
  name: string
  description?: string
  props: Record<string, FaceJsonProp>
  states?: Array<{ name: string; props: Record<string, unknown> }>
  [key: string]: unknown
}

interface PropAnalysis {
  name: string
  type: string
  required: boolean
  defaultValue?: unknown
  description?: string
  options?: string[]
  enumValues?: Record<string, string | number>
  isArray?: boolean
  arrayItemType?: string
  isObject?: boolean
  objectShape?: Record<string, string>
  isInherited?: boolean
}

interface ContractOverride {
  omitProps?: string[]
  patchProps?: Record<string, Partial<FaceJsonProp>>
  patchStates?: (states: NonNullable<FaceJsonContract['states']>) => NonNullable<FaceJsonContract['states']>
}

interface ComponentContractEntry {
  componentName: string
  componentDir: string
  sourcePath: string
  contractPath: string
}

interface ContractSyncResult {
  componentName: string
  contractPath: string
  nextContract: FaceJsonContract
  currentContract: FaceJsonContract
  changed: boolean
}

const THIS_FILE = fileURLToPath(import.meta.url)
const CONTRACTS_DIR = path.dirname(THIS_FILE)
const FACE_UI_ROOT = path.resolve(CONTRACTS_DIR, '../..')

const CONTRACT_OVERRIDES: Record<string, ContractOverride> = {
  Accordion: {
    omitProps: ['legacyItems', 'onChange'],
  },
  Badge: {
    patchProps: {
      appearance: {
        type: 'enum',
        default: 'fill',
        options: ['fill', 'outline'],
        description: 'Fill or outline appearance',
      },
    },
    patchStates: (states) => states.map((state) => {
      if (state.props?.variant === 'outline') {
        return {
          ...state,
          props: {
            ...state.props,
            variant: 'default',
            appearance: 'outline',
          },
        }
      }
      return state
    }),
  },
  Button: {
    patchProps: {
      variant: {
        type: 'enum',
        default: 'default',
        options: ['default', 'primary', 'secondary', 'accent', 'outline', 'ghost', 'destructive', 'suggestion'],
        description: 'Visual style variant',
      },
    },
    patchStates: (states) => states.map((state) => {
      if (state.name === 'Delete') {
        return {
          ...state,
          name: 'Destructive',
          props: {
            ...state.props,
            variant: 'destructive',
          },
        }
      }
      if (state.props?.variant === 'delete') {
        return {
          ...state,
          props: {
            ...state.props,
            variant: 'destructive',
          },
        }
      }
      return state
    }),
  },
  Checkbox: {
    omitProps: ['onChange'],
    patchProps: {
      checked: {
        type: 'union',
        required: false,
        description: 'Controlled checked state. Accepts boolean or "indeterminate".',
        options: [true, false, 'indeterminate'],
        default: null,
      },
      defaultChecked: {
        type: 'union',
        required: false,
        description: 'Uncontrolled initial checked state. Accepts boolean or "indeterminate".',
        options: [true, false, 'indeterminate'],
        default: false,
      },
      disabled: {
        description: 'Disable pointer and keyboard interaction.',
      },
      required: {
        description: 'Mark the hidden native input as required.',
      },
      name: {
        description: 'Native form field name for the hidden input.',
      },
      label: {
        type: 'ReactNode',
        description: 'Visible label content rendered through Face UI Text.',
      },
      onCheckedChange: {
        description: 'Callback fired with { checked } when the machine state changes.',
      },
      className: {
        description: 'Additional className on the root label.',
      },
      membrane: {
        description: 'Wrap the control in the standard one-token membrane.',
      },
    },
  },
  Modal: {
    omitProps: ['isOpen', 'onClose', 'disabled', 'label'],
    patchProps: {
      actions: {
        type: 'array',
        required: false,
        description: 'Optional footer actions.',
      },
    },
  },
  Radio: {
    omitProps: ['flow', 'onChange'],
  },
  Select: {
    omitProps: ['onChange'],
  },
  Slider: {
    patchProps: {
      variant: {
        type: 'enum',
        required: false,
        default: 'simple',
        options: ['simple', 'advanced'],
        description: 'Simple machine-driven slider or the advanced legacy slider.',
      },
      scalarValue: {
        type: 'number',
        required: false,
        description: 'Legacy scalar value for the advanced slider.',
      },
      onChange: {
        type: 'function',
        required: false,
        description: 'Legacy scalar callback for the advanced slider.',
      },
      leading: {
        type: 'enum',
        required: false,
        default: 'none',
        options: ['none', 'icon', 'text', 'iconText'],
        description: 'Leading content mode for the advanced slider.',
      },
      leadingIcon: {
        type: 'string',
        required: false,
        description: 'Leading icon name for the advanced slider.',
      },
      leadingText: {
        type: 'string',
        required: false,
        description: 'Leading text for the advanced slider.',
      },
      crop: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Enable crop handles in the advanced slider.',
      },
      defaultCropRange: {
        type: 'object',
        required: false,
        description: 'Uncontrolled initial crop range for the advanced slider.',
      },
      cropRange: {
        type: 'object',
        required: false,
        description: 'Controlled crop range for the advanced slider.',
      },
      cropLocksValue: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Clamp the value to the crop range.',
      },
      onCropChange: {
        type: 'function',
        required: false,
        description: 'Called when the crop range changes.',
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          defaultValue: [50],
        },
      },
      {
        name: 'Range',
        props: {
          defaultValue: [20, 80],
          label: 'Price range',
        },
      },
      {
        name: 'Advanced',
        props: {
          variant: 'advanced',
          defaultValue: [42],
          leading: 'text',
          leadingText: 'Zoom',
        },
      },
      {
        name: 'Crop',
        props: {
          variant: 'advanced',
          defaultValue: [40],
          crop: true,
          defaultCropRange: { min: 20, max: 80 },
          cropLocksValue: true,
          leading: 'text',
          leadingText: 'Crop',
        },
      },
      {
        name: 'Disabled',
        props: {
          defaultValue: [30],
          disabled: true,
        },
      },
    ],
  },
  Switcher: {
    omitProps: ['onChange'],
  },
  Tabs: {
    omitProps: ['tabs', 'activeTab', 'defaultActiveTab', 'onChange'],
  },
  Toc: {
    omitProps: ['onChange'],
  },
  Upload: {
    omitProps: ['size', 'type', 'reason'],
  },
}

const UNCONTROLLED_PROP_PAIRS: Array<[string, string]> = [
  ['value', 'defaultValue'],
  ['checked', 'defaultChecked'],
  ['open', 'defaultOpen'],
  ['collapsed', 'defaultCollapsed'],
  ['selectedId', 'defaultSelectedId'],
  ['expandedIds', 'defaultExpandedIds'],
  ['page', 'defaultPage'],
  ['step', 'defaultStep'],
  ['sizes', 'defaultSizes'],
  ['index', 'defaultIndex'],
  ['activeId', 'defaultActiveId'],
  ['cropRange', 'defaultCropRange'],
]

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function listComponentContracts(componentName?: string): ComponentContractEntry[] {
  return fs.readdirSync(FACE_UI_ROOT)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const componentDir = path.join(FACE_UI_ROOT, name)
      const sourcePath = path.join(componentDir, `${name}.tsx`)
      const contractPath = path.join(componentDir, `${name}.json`)
      return { componentName: name, componentDir, sourcePath, contractPath }
    })
    .filter((entry) => {
      if (componentName && entry.componentName !== componentName) return false
      if (!fs.existsSync(entry.componentDir) || !fs.statSync(entry.componentDir).isDirectory()) return false
      return fs.existsSync(entry.sourcePath) && fs.existsSync(entry.contractPath)
    })
}

function extractSummary(code: string): string | undefined {
  const match = /\/\*\*([\s\S]*?)\*\//.exec(code)
  if (!match) return undefined
  const lines = match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
  return lines[0]
}

function extractBalancedBraces(code: string, start: number): string | null {
  if (code[start] !== '{') return null
  let depth = 0
  for (let index = start; index < code.length; index += 1) {
    if (code[index] === '{') depth += 1
    else if (code[index] === '}') {
      depth -= 1
      if (depth === 0) return code.slice(start + 1, index)
    }
  }
  return null
}

function extractNamedPropsBody(code: string, interfaceName: string): string | null {
  const patterns = [
    new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}\\b[^\\{]*\\{`, 'm'),
    new RegExp(`(?:export\\s+)?type\\s+${interfaceName}\\s*=\\s*\\{`, 'm'),
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(code)
    if (!match) continue
    const braceStart = match.index + match[0].length - 1
    const body = extractBalancedBraces(code, braceStart)
    if (body != null) return body
  }

  return null
}

function buildCanonicalAnalyses(componentName: string, relSourcePath: string, code: string): PropAnalysis[] {
  const interfaceName = `${componentName}Props`
  const targetBody = extractNamedPropsBody(code, interfaceName)
  const canonicalCode = targetBody
    ? `${code}\n\ntype __FaceUiCanonicalProps = {\n${targetBody}\n}\n`
    : code
  const canonicalProps = extractReactTsPropsFromSource({ fileName: relSourcePath, code: canonicalCode }) || []
  const canonicalNames = new Set(canonicalProps.map((prop) => prop.name).filter(Boolean))
  const parser = getAdvancedPropParser()
  const vfs: Record<string, VFSFile> = { [relSourcePath]: { content: code } }
  const parsedProps = parser.parse(relSourcePath, vfs as any, 'react')
  const enrichedProps = getTypeEnricher().enrich(parsedProps)
  const enrichmentMap = new Map<string, EnrichedProp>()

  for (const prop of enrichedProps) {
    if (prop?.name) enrichmentMap.set(prop.name, prop)
  }

  if (canonicalNames.size > 0) {
    const analyses: PropAnalysis[] = []
    for (const canonical of canonicalProps) {
      if (!canonical.name || canonical.name === 'id' || canonical.name === 'key') continue
      const enriched = enrichmentMap.get(canonical.name)
      if (enriched) {
        analyses.push(mergeCanonicalProp(canonical, enriched))
        continue
      }
      analyses.push({
        name: canonical.name,
        type: canonical.type,
        required: canonical.required,
        defaultValue: canonical.defaultValue,
        options: canonical.options,
      })
    }
    return analyses
  }

  return parsedProps
    .filter((prop) => prop.name !== 'id' && prop.name !== 'key')
    .filter((prop) => !prop.isInherited)
    .map((prop) => ({
      name: prop.name,
      type: prop.type,
      required: prop.required,
      defaultValue: prop.defaultValue,
      description: prop.description,
      options: prop.options,
      enumValues: prop.enumValues,
      isArray: prop.isArray,
      arrayItemType: prop.arrayItemType,
      isObject: prop.isObject,
      objectShape: prop.objectShape,
      isInherited: prop.isInherited,
    }))
}

function mergeCanonicalProp(canonical: ExtractedProp, enriched: EnrichedProp): PropAnalysis {
  const next: PropAnalysis = {
    name: enriched.name,
    type: enriched.type,
    required: enriched.required,
    defaultValue: enriched.defaultValue,
    description: enriched.description,
    options: enriched.options,
    enumValues: enriched.enumValues,
    isArray: enriched.isArray,
    arrayItemType: enriched.arrayItemType,
    isObject: enriched.isObject,
    objectShape: enriched.objectShape,
    isInherited: enriched.isInherited,
  }

  if (canonical.defaultValue !== undefined && next.defaultValue === undefined) {
    next.defaultValue = canonical.defaultValue
  }

  if (canonical.options && canonical.options.length > 0 && (!next.options || next.options.length === 0)) {
    next.options = canonical.options
  }

  if (!next.type || next.type === 'any') {
    next.type = canonical.type
  }

  return next
}

function normalizeOptions(input?: string[]): string[] | undefined {
  if (!Array.isArray(input)) return undefined
  const seen = new Set<string>()
  const next = input
    .map((item) => String(item))
    .map((item) => item.trim())
    .filter((item) => item !== '' && item !== 'undefined' && item !== 'null')
    .filter((item) => {
      if (seen.has(item)) return false
      seen.add(item)
      return true
    })
  return next.length > 0 ? next : undefined
}

function normalizeType(prop: PropAnalysis, existing?: FaceJsonProp): Pick<FaceJsonProp, 'type' | 'options'> {
  const typeText = String(prop.type || '').toLowerCase()
  const options = normalizeOptions(prop.options ?? (prop.enumValues ? Object.values(prop.enumValues).map(String) : undefined))

  if (options && options.length > 0) {
    return { type: 'enum', options }
  }
  if (prop.isArray || typeText === 'array' || typeText.endsWith('[]')) {
    return { type: 'array' }
  }
  if (prop.isObject || typeText === 'object' || typeText === 'record' || typeText.startsWith('{')) {
    return { type: 'object' }
  }
  if (typeText.includes('function') || typeText.includes('=>') || typeText.includes('handler')) {
    return { type: 'function' }
  }
  if (typeText.includes('boolean')) {
    return { type: 'boolean' }
  }
  if (typeText.includes('number')) {
    return { type: 'number' }
  }
  if (typeText.includes('string') || typeText.includes('reactnode') || typeText.includes('reactelement') || typeText.includes('key')) {
    return { type: 'string' }
  }

  if (existing?.type) {
    return { type: existing.type, options: existing.options }
  }

  return { type: 'any' }
}

function toFaceProp(prop: PropAnalysis, existing?: FaceJsonProp): FaceJsonProp {
  const normalized = normalizeType(prop, existing)
  const next: FaceJsonProp = {
    ...(existing ?? {}),
    type: normalized.type,
    required: Boolean(prop.required),
    description: prop.description ?? existing?.description ?? `${prop.name} prop`,
  }

  if (normalized.options && normalized.options.length > 0) {
    next.options = normalized.options
  } else if (!existing || existing.type !== normalized.type) {
    delete next.options
  }

  if (prop.defaultValue !== undefined) {
    next.default = prop.defaultValue
  } else if (existing && Object.prototype.hasOwnProperty.call(existing, 'default')) {
    next.default = existing.default
  }

  return next
}

function applyOverrides(componentName: string, props: Record<string, FaceJsonProp>): Record<string, FaceJsonProp> {
  const override = CONTRACT_OVERRIDES[componentName]
  if (!override) return props

  const omitProps = new Set(override.omitProps ?? [])
  const next: Record<string, FaceJsonProp> = {}

  for (const [propName, propDef] of Object.entries(props)) {
    if (omitProps.has(propName)) continue
    next[propName] = { ...propDef, ...(override.patchProps?.[propName] ?? {}) }
  }

  for (const [propName, patch] of Object.entries(override.patchProps ?? {})) {
    if (!next[propName]) continue
    next[propName] = { ...next[propName], ...patch }
  }

  return next
}

export function buildFaceJsonContract(entry: ComponentContractEntry): FaceJsonContract {
  const code = fs.readFileSync(entry.sourcePath, 'utf8')
  const current = readJson<FaceJsonContract>(entry.contractPath)
  const relSourcePath = path.relative(process.cwd(), entry.sourcePath).replace(/\\/g, '/')
  const analyses = buildCanonicalAnalyses(entry.componentName, relSourcePath, code)
  const nextProps: Record<string, FaceJsonProp> = {}

  for (const prop of analyses) {
    nextProps[prop.name] = toFaceProp(prop, current.props?.[prop.name])
  }

  for (const [controlledKey, defaultKey] of UNCONTROLLED_PROP_PAIRS) {
    if (!nextProps[defaultKey]) continue
    if (!nextProps[controlledKey]) continue
    delete nextProps[controlledKey].default
  }

  return {
    ...current,
    name: current.name || entry.componentName,
    description: current.description || extractSummary(code) || `${entry.componentName} component`,
    props: applyOverrides(entry.componentName, nextProps),
    states: CONTRACT_OVERRIDES[entry.componentName]?.patchStates?.(Array.isArray(current.states) ? current.states : [])
      ?? (Array.isArray(current.states) ? current.states : []),
  }
}

export function collectFaceJsonContracts(componentName?: string): ContractSyncResult[] {
  return listComponentContracts(componentName).map((entry) => {
    const currentContract = readJson<FaceJsonContract>(entry.contractPath)
    const nextContract = buildFaceJsonContract(entry)
    return {
      componentName: entry.componentName,
      contractPath: entry.contractPath,
      currentContract,
      nextContract,
      changed: JSON.stringify(currentContract) !== JSON.stringify(nextContract),
    }
  })
}

function printSummary(results: ContractSyncResult[], mode: 'check' | 'write') {
  const changed = results.filter((result) => result.changed)
  if (changed.length === 0) {
    console.log(`face-ui-react contracts are in sync (${results.length} components)`)
    return
  }

  for (const result of changed) {
    console.log(`${mode === 'write' ? 'updated' : 'drift'} ${result.componentName}: ${path.relative(process.cwd(), result.contractPath)}`)
  }

  if (mode === 'check') {
    console.error(`face-ui-react contracts drifted in ${changed.length} component(s)`)
  }
}

export function runContractSync(options?: { write?: boolean; componentName?: string }): number {
  const results = collectFaceJsonContracts(options?.componentName)
  if (options?.write) {
    for (const result of results) {
      if (!result.changed) continue
      writeJson(result.contractPath, result.nextContract)
    }
    printSummary(results, 'write')
    return 0
  }

  printSummary(results, 'check')
  return results.some((result) => result.changed) ? 1 : 0
}

function main() {
  const args = new Set(process.argv.slice(2))
  const componentArgIndex = process.argv.findIndex((arg) => arg === '--component')
  const componentName = componentArgIndex >= 0 ? process.argv[componentArgIndex + 1] : undefined
  const exitCode = runContractSync({
    write: args.has('--write'),
    componentName,
  })
  process.exitCode = exitCode
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main()
}
