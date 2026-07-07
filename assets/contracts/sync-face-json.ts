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
    patchProps: {
      items: {
        description: 'Accordion item definitions. Each item can include icon, matching Button icon input semantics.',
      },
      icon: {
        type: 'string',
        required: false,
        description: 'Default left icon for item triggers. Individual items can override it with item.icon.',
      },
    },
    patchStates: (states) => {
      const withIconsState = {
        name: 'With Icons',
        props: {
          defaultExpandedIds: ['docs'],
          items: [
            {
              value: 'docs',
              label: 'Documentation',
              icon: 'folder',
              content: 'Guides, references, and release notes stay grouped here.',
            },
            {
              value: 'components',
              label: 'Components',
              icon: 'component',
              content: 'Reusable interface primitives and composed patterns.',
            },
            {
              value: 'files',
              label: 'Files',
              icon: 'file',
              content: 'Project assets and implementation examples.',
            },
          ],
        },
      }
      const normalizedStates = states.map((state) => {
        if (state.name === 'Default') {
          return {
            ...state,
            props: {
              ...state.props,
              icon: 'folder',
            },
          }
        }
        return state
      })
      return normalizedStates.some((state) => state.name === withIconsState.name)
        ? normalizedStates.map((state) => state.name === withIconsState.name ? withIconsState : state)
        : [...normalizedStates, withIconsState]
    },
  },
  Badge: {
    patchProps: {
      variant: {
        type: 'enum',
        default: 'default',
        options: ['default', 'primary', 'secondary'],
        description: 'Structural badge variant. Combine with tone for semantic status color.',
      },
      appearance: {
        type: 'enum',
        default: 'outline',
        options: ['fill', 'outline'],
        description: 'Fill or outline appearance',
      },
      tone: {
        type: 'enum',
        default: 'neutral',
        options: ['neutral', 'accent', 'positive', 'warning', 'destructive'],
        description: 'Semantic status tone. Combines with fill or outline appearance.',
      },
    },
    patchStates: () => [
      { name: 'Default', props: { text: 'Badge' } },
      { name: 'Primary Fill', props: { text: 'Primary', variant: 'primary', appearance: 'fill' } },
      { name: 'Secondary Fill', props: { text: 'Secondary', variant: 'secondary', appearance: 'fill' } },
      { name: 'Accent Outline', props: { text: 'Accent', tone: 'accent' } },
      { name: 'Positive Outline', props: { text: 'Positive', tone: 'positive' } },
      { name: 'Warning Outline', props: { text: 'Warning', tone: 'warning' } },
      { name: 'Destructive Outline', props: { text: 'Destructive', tone: 'destructive' } },
      { name: 'Destructive Fill', props: { text: 'Destructive', appearance: 'fill', tone: 'destructive' } },
    ],
  },
  Button: {
    patchProps: {
      variant: {
        type: 'enum',
        default: 'default',
        options: ['default', 'primary', 'secondary', 'accent', 'outline', 'ghost', 'destructive', 'suggestion'],
        description: 'Visual style variant',
      },
      fullWidth: {
        type: 'boolean',
        default: false,
        description: 'Full width button.',
      },
    },
    patchStates: (states) => states.map((state) => {
      if (state.name === 'Default') {
        return {
          ...state,
          props: {
            text: 'Create',
            icon: 'plus',
            fullWidth: false,
          },
        }
      }
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
  Card: {
    patchProps: {
      footer: {
        type: 'object',
        required: false,
        controlType: 'object',
        description: 'Card footer slot. Use a structured component descriptor, for example Button.',
      },
    },
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
  Separator: {
    patchStates: () => [
      {
        name: 'Default',
        props: {
          orientation: 'horizontal',
          decorative: true,
          membrane: true,
        },
      },
      {
        name: 'Vertical',
        props: {
          orientation: 'vertical',
          decorative: true,
          membrane: true,
        },
      },
      {
        name: 'Semantic',
        props: {
          orientation: 'horizontal',
          decorative: false,
          membrane: true,
        },
      },
    ],
  },
  Radio: {
    omitProps: ['flow', 'onChange'],
    patchProps: {
      options: {
        type: 'array',
        required: false,
        description: 'Radio options to render.',
        default: [
          { value: 'one', label: 'Option one' },
          { value: 'two', label: 'Option two' },
          { value: 'three', label: 'Option three', disabled: true },
        ],
      },
      defaultValue: {
        type: 'string',
        required: false,
        description: 'Uncontrolled initial selected value.',
        default: 'one',
      },
      orientation: {
        type: 'enum',
        required: false,
        description: 'Layout orientation.',
        options: ['horizontal', 'vertical'],
        default: 'vertical',
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          options: [
            { value: 'one', label: 'Option one' },
            { value: 'two', label: 'Option two' },
            { value: 'three', label: 'Option three', disabled: true },
          ],
          defaultValue: 'one',
        },
      },
      {
        name: 'Horizontal',
        props: {
          options: [
            { value: 'one', label: 'Option one' },
            { value: 'two', label: 'Option two' },
            { value: 'three', label: 'Option three', disabled: true },
          ],
          defaultValue: 'one',
          orientation: 'horizontal',
        },
      },
      {
        name: 'Disabled',
        props: {
          options: [
            { value: 'one', label: 'Option one' },
            { value: 'two', label: 'Option two' },
            { value: 'three', label: 'Option three', disabled: true },
          ],
          defaultValue: 'one',
          disabled: true,
        },
      },
    ],
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
          label: 'Value',
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
          label: 'Zoom',
          defaultValue: [42],
          leading: 'text',
          leadingText: 'Zoom',
        },
      },
      {
        name: 'Crop',
        props: {
          variant: 'advanced',
          label: 'Crop',
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
  Tile: {
    patchProps: {
      intent: {
        type: 'enum',
        required: false,
        default: 'option',
        options: ['option', 'navigation', 'disclosure', 'tree', 'tab', 'section'],
        description: 'Semantic row intent. Use option for generic rows, navigation for selected app routes, disclosure for parent rows, tree for nested project rows, tab for tab controls, and section for non-interactive headings.',
      },
      density: {
        type: 'enum',
        required: false,
        default: 'default',
        options: ['default', 'compact', 'spacious'],
        description: 'Internal spacing density. Default follows Button text padding; compact tightens tree/sidebar rows; spacious gives inspection rows more breathing room.',
      },
      tone: {
        type: 'enum',
        required: false,
        default: 'neutral',
        options: ['neutral', 'muted', 'accent', 'positive', 'warning', 'destructive'],
        description: 'Semantic visual tone for row foreground and hover treatment.',
      },
      actionVisibility: {
        type: 'enum',
        required: false,
        default: 'reveal',
        options: ['reveal', 'hover', 'always', 'hidden'],
        description: 'How the actions slot is exposed: reveal on hover/focus/active, hover only, always visible, or hidden.',
      },
      leading: {
        type: 'ReactNode',
        required: false,
        description: 'Isolated leading slot for nested controls. Use icon for decorative icons and leading for actionable controls.',
      },
      meta: {
        type: 'ReactNode',
        required: false,
        description: 'Trailing non-interactive metadata rendered before actions.',
      },
      busy: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Marks the row busy with data-busy and aria-busy without disabling it by itself.',
      },
      selectedDescendant: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Marks parent rows that contain the selected descendant, commonly while collapsed.',
      },
      interactive: {
        type: 'boolean',
        required: false,
        description: 'Override interactive semantics. Set false for section/header rows that should not expose button behavior.',
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          text: 'Page title',
          icon: 'file',
        },
      },
      {
        name: 'Navigation Active',
        props: {
          intent: 'navigation',
          text: 'Current page',
          icon: 'file',
          active: true,
        },
      },
      {
        name: 'Disclosure Parent',
        props: {
          intent: 'disclosure',
          text: 'Project',
          icon: 'folder',
          selector: true,
          selectorOpen: true,
          actionVisibility: 'hover',
          actions: '[Button icon=plus]',
        },
      },
      {
        name: 'Tree Row',
        props: {
          intent: 'tree',
          density: 'compact',
          text: 'src/components/Button.tsx',
          icon: 'file',
          level: 2,
        },
      },
      {
        name: 'Tab',
        props: {
          intent: 'tab',
          text: 'Preview',
          icon: 'browser',
          active: true,
          fullWidth: false,
          actionVisibility: 'hover',
          actions: '[Button icon=close]',
        },
      },
      {
        name: 'Section',
        props: {
          intent: 'section',
          text: 'Collections',
          interactive: false,
        },
      },
      {
        name: 'Busy Destructive',
        props: {
          text: 'Delete chat?',
          tone: 'destructive',
          busy: true,
          actionVisibility: 'always',
          actions: '[Button icon=close]',
        },
      },
    ],
  },
  Toc: {
    omitProps: ['onChange'],
  },
  Tree: {
    patchProps: {
      items: {
        type: 'array',
        required: false,
        description: 'Recursive tree nodes. Nodes may use kind "button", "tile", or "custom", plus icon, rightText, actions, content, or render.',
      },
      renderNode: {
        type: 'function',
        required: false,
        description: 'Global render override for custom node bodies. Tree still owns nesting, expansion, focus, and selection.',
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          items: [
            {
              id: 'src',
              label: 'src',
              icon: 'folder',
              children: [
                {
                  id: 'components',
                  label: 'components',
                  icon: 'folder',
                  children: [
                    { id: 'button', label: 'Button.tsx', icon: 'file' },
                    { id: 'tile', label: 'Tile.tsx', icon: 'file', kind: 'tile' },
                  ],
                },
                {
                  id: 'assets',
                  label: 'assets',
                  icon: 'folder',
                  children: [
                    {
                      id: 'icons',
                      label: 'icons',
                      icon: 'folder',
                      children: [
                        { id: 'search-icon', label: 'search.svg', icon: 'file' },
                        { id: 'folder-icon', label: 'folder.svg', icon: 'file' },
                      ],
                    },
                  ],
                },
                { id: 'index', label: 'index.ts', icon: 'file' },
              ],
            },
            { id: 'readme', label: 'README.md', icon: 'file' },
          ],
          defaultExpandedIds: ['src', 'components', 'assets', 'icons'],
          defaultSelectedId: 'button',
        },
      },
      {
        name: 'Mixed Rows',
        props: {
          items: [
            {
              id: 'workspace',
              label: 'Workspace',
              icon: 'folder',
              kind: 'tile',
              children: [
                { id: 'overview', label: 'Overview', icon: 'file', kind: 'tile' },
                { id: 'settings', label: 'Settings', icon: 'settings', rightText: '3' },
                { id: 'tokens', label: 'Tokens', icon: 'theme' },
              ],
            },
          ],
          defaultExpandedIds: ['workspace'],
          defaultSelectedId: 'overview',
        },
      },
    ],
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

function extractsFaceUiProps(interfaceName: string, code: string): boolean {
  const interfacePattern = new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}\\b([^\\{]*)\\{`, 'm')
  const interfaceMatch = interfacePattern.exec(code)
  const interfacePreamble = interfaceMatch?.[1] || ''
  if (/\b(?:HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|TextareaHTMLAttributes|AriaAttributes|DOMAttributes)\b/.test(interfacePreamble)) {
    return false
  }
  if (/\b(?:Omit|Pick|Partial|Required)?\s*<?\s*[A-Z][A-Za-z0-9_]*Props\b/.test(interfacePreamble)) {
    return true
  }

  const typePattern = new RegExp(`(?:export\\s+)?type\\s+${interfaceName}\\s*=\\s*([^\\n;]+)`, 'm')
  const typeMatch = typePattern.exec(code)
  const typeText = typeMatch?.[1] || ''
  return /\b(?:Omit|Pick|Partial|Required)?\s*<?\s*[A-Z][A-Za-z0-9_]*Props\b/.test(typeText)
}

function toPropAnalysis(prop: ParsedProp | EnrichedProp | ExtractedProp): PropAnalysis {
  return {
    name: prop.name,
    type: prop.type,
    required: prop.required,
    defaultValue: prop.defaultValue,
    description: 'description' in prop ? prop.description : undefined,
    options: prop.options,
    enumValues: 'enumValues' in prop ? prop.enumValues : undefined,
    isArray: 'isArray' in prop ? prop.isArray : undefined,
    arrayItemType: 'arrayItemType' in prop ? prop.arrayItemType : undefined,
    isObject: 'isObject' in prop ? prop.isObject : undefined,
    objectShape: 'objectShape' in prop ? prop.objectShape : undefined,
    isInherited: 'isInherited' in prop ? prop.isInherited : undefined,
  }
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
    if (extractsFaceUiProps(interfaceName, code)) {
      const analyses: PropAnalysis[] = []
      const seen = new Set<string>()
      for (const prop of enrichedProps) {
        if (!prop.name || prop.name === 'id' || prop.name === 'key') continue
        if (prop.isInherited) continue
        if (seen.has(prop.name)) continue
        seen.add(prop.name)
        analyses.push(toPropAnalysis(prop))
      }
      if (analyses.length > 0) return analyses
    }

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
  } else {
    delete next.default
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
