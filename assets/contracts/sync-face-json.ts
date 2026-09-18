import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { getAdvancedPropParser, type ParsedProp } from './lib/advancedPropParser'
import {
  extractComponentDescription,
  extractReactTsPropsFromSource,
  getPropOptions,
  type ExtractedProp,
  type SourceBundle,
} from './lib/tsPropExtractor'
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

export interface ProductScenario {
  name: string
  props: Record<string, unknown>
}

export type ProductScenarioPair = readonly [ProductScenario, ProductScenario]

export interface ProductScenarioFaceContract {
  schema: 'face'
  'schema-version': 1
  name: string
  description: string
  framework: 'react'
  root: {
    type: string
    props: Record<string, { $ref: string }>
    children: []
  }
  currentState: { props: Record<string, unknown> }
  controls: Array<Record<string, unknown>>
  meta: {
    name: string
    component: string
    kind: 'product-scenario'
  }
  generated: true
  generatedBy: typeof PRODUCT_SCENARIO_GENERATOR
  source: {
    path: string
    contract: string
  }
}

interface PropAnalysis {
  name: string
  type: string
  required: boolean
  defaultValue?: unknown
  description?: string
  options?: Array<string | number | boolean>
  enumValues?: Record<string, string | number>
  isArray?: boolean
  arrayItemType?: string
  isObject?: boolean
  objectShape?: Record<string, string>
  isInherited?: boolean
}

interface ContractOverride {
  omitProps?: string[]
  /** Editor metadata only: a prop's description comes from its JSDoc. */
  patchProps?: Record<string, Partial<FaceJsonProp> & { description?: never }>
  patchStates?: (states: NonNullable<FaceJsonContract['states']>) => NonNullable<FaceJsonContract['states']>
}

/** A component directory with its `<Name>.tsx` source and `<Name>.json` contract. */
export interface ComponentContractEntry {
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

export interface ProductScenarioContractSyncResult {
  componentName: string
  scenarioName: string
  contractPath: string
  nextContract: ProductScenarioFaceContract
  currentContract: ProductScenarioFaceContract | null
  changed: boolean
}

const THIS_FILE = fileURLToPath(import.meta.url)
const CONTRACTS_DIR = path.dirname(THIS_FILE)
const FACE_UI_ROOT = path.resolve(CONTRACTS_DIR, '../..')
const PRODUCT_SCENARIO_GENERATOR = 'face-ui-product-scenario@1' as const
const PRODUCT_SCENARIOS_DIR = path.join(CONTRACTS_DIR, 'scenarios')

/** Product scenarios per component, discovered from `scenarios/<Name>.ts` (default export). */
export const PRODUCT_SCENARIOS: Record<string, ProductScenarioPair> = Object.fromEntries(
  await Promise.all(
    fs.readdirSync(PRODUCT_SCENARIOS_DIR)
      .filter((fileName) => fileName.endsWith('.ts'))
      .sort()
      .map(async (fileName) => [
        path.basename(fileName, '.ts'),
        (await import(pathToFileURL(path.join(PRODUCT_SCENARIOS_DIR, fileName)).href)).default as ProductScenarioPair,
      ]),
  ),
)
const GLOBAL_CONTRACT_OMIT_PROPS = new Set([
  'className',
  'style',
  'id',
  'role',
  'titleAttr',
  'backdropClassName',
  'positionerClassName',
  'controlRole',
  'ariaControls',
  'ariaActiveDescendant',
  'ariaAutoComplete',
  'ariaExpanded',
  'ariaHasPopup',
  'ariaLabelledBy',
  'tabIndex',
])

function isPlaygroundImplementationProp(propName: string, prop: FaceJsonProp): boolean {
  if (GLOBAL_CONTRACT_OMIT_PROPS.has(propName)) return true
  if (prop.type === 'function') return true
  if (/^on[A-Z]/.test(propName)) return true
  return /(?:ClassName|Ref)$/.test(propName)
}

/** Props whose union branches still document them differently. Any other
 * disagreement fails the generator; an entry leaves once its JSDoc is unified. */
const PENDING_UNION_DOC_CONFLICTS: Record<string, string[]> = {
  Calendar: ['value', 'defaultValue', 'onValueChange'],
  Date: ['selection', 'valueFormat', 'onValueChange'],
  Input: ['multiline', 'type'],
  Overlay: ['trigger'],
  Radio: ['name', 'required'],
  Rating: ['name', 'required'],
  SegmentedControl: ['multiple', 'value', 'defaultValue', 'onValueChange'],
  Select: ['multiple', 'value', 'defaultValue'],
  Tabs: ['renderPanels', 'items'],
}

// Defaults for the shared range presentation live in its internal component,
// outside either public wrapper's source (the contract parser reads the wrapper).
const RANGE_PRESENTATION_DEFAULTS = {
  tone: { default: 'neutral' }, shape: { default: 'linear' },
  showValue: { default: false }, membrane: { default: true },
}
const CONTRACT_OVERRIDES: Record<string, ContractOverride> = {
  Accordion: {
    patchProps: {
      icon: {
        type: 'string',
      },
    },
    patchStates: (states) => {
      const demoItems = [
        {
          value: 'getting-started',
          label: 'Getting Started',
          icon: 'folder',
          content: 'Install the package, configure the provider, and begin with the default components.',
        },
        {
          value: 'usage',
          label: 'Usage Guide',
          icon: 'folder',
          content: 'Composition and controlled-state guidance for production interfaces.',
        },
        {
          value: 'api',
          label: 'API Reference',
          icon: 'file',
          content: 'Props, events, keyboard behavior, and accessibility contracts.',
        },
      ]
      const withIconsState = {
        name: 'With Icons',
        props: {
          defaultExpanded: ['docs'],
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
        return {
          ...state,
          props: {
            items: demoItems,
            ...state.props,
          },
        }
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
        default: 'outline',
        options: ['fill', 'outline'],
      },
      tone: {
        type: 'enum',
        default: 'neutral',
        options: ['neutral', 'accent', 'positive', 'warning', 'destructive'],
      },
    },
    patchStates: () => [
      { name: 'Default', props: { children: 'Badge' } },
      { name: 'Neutral Fill', props: { children: 'Neutral', variant: 'fill' } },
      { name: 'Accent Outline', props: { children: 'Accent', tone: 'accent' } },
      { name: 'Positive Outline', props: { children: 'Positive', tone: 'positive' } },
      { name: 'Warning Outline', props: { children: 'Warning', tone: 'warning' } },
      { name: 'Destructive Outline', props: { children: 'Destructive', tone: 'destructive' } },
      { name: 'Destructive Fill', props: { children: 'Destructive', variant: 'fill', tone: 'destructive' } },
    ],
  },
  Button: {
    patchProps: {
      'aria-expanded': {
        type: 'boolean',
        required: false,
      },
      variant: {
        type: 'enum',
        default: 'default',
        options: ['default', 'primary', 'secondary', 'accent', 'outline', 'ghost', 'destructive'],
      },
      fullWidth: {
        type: 'boolean',
        default: false,
      },
    },
    patchStates: (states) => states.map((state) => {
      if (state.name === 'Default') {
        return {
          ...state,
          props: {
            children: 'Create',
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
      title: {
        type: 'ReactNode',
        required: false,
      },
      description: {
        type: 'ReactNode',
        required: false,
      },
      footer: {
        type: 'ReactNode',
        required: false,
        controlType: 'object',
      },
      variant: {
        options: ['default', 'plain', 'code'],
      },
      padding: {
        options: ['default', 'control', 'membrane', 'none'],
      },
      radius: {
        options: ['md', 'lg', 'none'],
      },
      footerAlign: {
        options: ['start', 'end', 'between'],
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          title: 'Card Title',
          children: 'Workspace settings and recent activity stay grouped in one place',
          footer: {
            __componentName__: 'Button',
            children: 'Open',
            icon: 'arrow-right',
            iconPosition: 'end',
            membrane: true,
            fullWidth: false,
          },
        },
      },
      {
        name: 'Code Surface',
        props: {
          variant: 'code',
          padding: 'none',
          radius: 'md',
          border: false,
          children: "const surface = 'code'",
        },
      },
      {
        name: 'Plain',
        props: {
          variant: 'plain',
          padding: 'none',
          radius: 'none',
          border: false,
          children: 'Unframed content for composition inside another surface.',
        },
      },
      {
        name: 'Hover highlight',
        props: {
          hoverable: true,
          title: 'Deploy preview',
          children: 'The surface highlights on hover or focus within; its children own their actions.',
        },
      },
    ],
  },
  Carousel: {
    patchStates: (states) => states.map((state) => state.name === 'Default'
      ? {
          ...state,
          props: {
            ...state.props,
            ariaLabel: 'Office gallery',
            slides: [
              {
                src: '/assets/media/examples/office-core/lobby-day.webp',
                alt: 'Bright office lobby with glass-block wall, seating, and plants',
              },
              {
                src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
                alt: 'Office lobby with glass-block wall, seating, and a person by the window',
              },
              {
                src: '/assets/media/examples/office-core/skyline-window-day.webp',
                alt: 'Two people looking out from a high-rise office window',
              },
            ],
          },
        }
      : state),
  },
  Date: {
    patchStates: (states) => states.map((state) => {
      if (state.props.mode !== 'week') return state
      const props = { ...state.props }
      delete props.selection
      return { ...state, props }
    }),
  },
  Icon: {
    patchStates: () => [
      { name: 'Default', props: { name: 'settings' } },
      { name: 'Direction Left', props: { name: 'left' } },
      { name: 'Direction Right', props: { name: 'right' } },
      { name: 'Accessible', props: { name: 'account', 'aria-label': 'Account' } },
    ],
  },
  Modal: {
    omitProps: ['disabled', 'label'],
    patchProps: {
      placement: {
        type: 'enum',
        required: false,
        default: 'center',
        options: ['center', 'left', 'right', 'top', 'bottom'],
      },
      edge: {
        type: 'enum',
        required: false,
        default: 'inset',
        options: ['inset', 'flush'],
      },
      width: {
        type: 'number',
        required: false,
      },
      height: {
        type: 'number',
        required: false,
      },
      actions: {
        type: 'array',
        required: false,
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          open: true,
          portal: false,
          autoFocusOnOpen: false,
          placement: 'center',
          edge: 'inset',
          title: 'Modal',
          description: 'Focused work surface',
          children: 'Review the workspace details before creating it.',
          actions: [
            { label: 'Cancel', variant: 'outline' },
            { label: 'Create', variant: 'accent' },
          ],
        },
      },
      {
        name: 'Right edge workspace',
        props: {
          open: true,
          portal: false,
          autoFocusOnOpen: false,
          placement: 'right',
          edge: 'flush',
          width: 420,
          title: 'Customer details',
          description: 'Account health and recent activity',
          children: 'Plan: Enterprise. Last active 12 minutes ago.',
          actions: [{ label: 'Edit customer', variant: 'accent' }],
        },
      },
    ],
  },
  Panel: {
    patchStates: () => {
      const items = [
        { id: 'overview', label: 'Overview', icon: 'layout-sidebar-left-open' },
        { id: 'projects', label: 'Projects', icon: 'folder' },
        { id: 'automations', label: 'Automations', icon: 'component' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
      ]
      return [
        {
          name: 'Default',
          props: {
            items,
            defaultSelectedId: 'overview',
            surface: 'inline',
            width: 260,
          },
        },
        {
          name: 'Collapsed',
          props: {
            items,
            defaultSelectedId: 'projects',
            surface: 'inline',
            defaultCollapsed: true,
          },
        },
        {
          name: 'Compact overlay',
          props: {
            items,
            defaultSelectedId: 'automations',
            surface: 'sheet',
            defaultOpen: true,
            surfaceTitle: 'Workspace',
          },
        },
      ]
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
  Input: {
    patchStates: (states) => states.map((state) => ({
      ...state,
      props: state.props?.type === 'default'
        ? { ...state.props, type: 'text' }
        : state.props,
    })),
  },
  Progress: {
    patchProps: RANGE_PRESENTATION_DEFAULTS,
    patchStates: () => [
      {
        name: 'Default',
        props: {
          value: 28,
          max: 100,
          tone: 'neutral',
          shape: 'linear',
          showValue: true,
          label: 'Uploading assets',
        },
      },
      {
        name: 'Complete',
        props: { value: 100, showValue: true, label: 'Deployment' },
      },
      {
        name: 'Positive',
        props: { value: 100, tone: 'positive', showValue: true, label: 'Checks passed' },
      },
      {
        name: 'Warning',
        props: { value: 82, tone: 'warning', showValue: true, label: 'Upload paused' },
      },
      {
        name: 'Destructive',
        props: { value: 96, tone: 'destructive', showValue: true, label: 'Upload failed' },
      },
      {
        name: 'Circle',
        props: { value: 28, shape: 'circle', showValue: true, 'aria-label': 'Import progress' },
      },
      {
        name: 'Indeterminate',
        props: { indeterminate: true, label: 'Loading assets' },
      },
    ],
  },
  Meter: {
    patchProps: RANGE_PRESENTATION_DEFAULTS,
    patchStates: () => [
      { name: 'Default', props: { value: 28, label: 'Storage used', showValue: true } },
      { name: 'Empty', props: { value: 0, label: 'Daily quota', showValue: true } },
      { name: 'Full', props: { value: 100, tone: 'destructive', label: 'Storage full', showValue: true } },
      { name: 'Warning', props: { value: 82, tone: 'warning', label: 'Daily quota', showValue: true } },
      { name: 'Positive', props: { value: 35, tone: 'positive', label: 'Storage used', showValue: true } },
      { name: 'Circle', props: { value: 74, shape: 'circle', 'aria-label': 'Context used', showValue: true } },
    ],
  },
  Radio: {
    patchStates: () => [
      {
        name: 'Default',
        props: {
          'aria-label': 'Example choice',
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
          'aria-label': 'Example choice',
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
          'aria-label': 'Example choice',
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
  Rating: {
    patchProps: {
      max: { min: 1, max: 10, step: 1 },
    },
  },
  Slider: {
    patchProps: {
      min: { default: 0 }, max: { default: 100 }, step: { default: 1 },
      disabled: { default: false }, orientation: { default: 'horizontal' },
      showValue: { default: false }, crop: { default: false },
      clampToCrop: { default: true }, membrane: { default: true }, autoFocus: { default: false },
    },
    patchStates: () => [
      { name: 'Default', props: { label: 'Value', defaultValue: [50] } },
      { name: 'Range', props: { defaultValue: [20, 80], label: 'Price range', labels: { thumbs: ['Minimum price', 'Maximum price'] } } },
      { name: 'Value', props: { showValue: true, label: 'Zoom', defaultValue: 42 } },
      { name: 'Crop', props: { showValue: true, label: 'Crop', defaultValue: 40, crop: true, defaultCropRange: { min: 20, max: 80 } } },
      { name: 'Disabled', props: { label: 'Unavailable value', defaultValue: 30, disabled: true } },
    ],
  },
  Tile: {
    patchProps: {
      'aria-expanded': {
        type: 'boolean', required: false,
      },
      'aria-busy': {
        type: 'boolean', required: false,
      },
      density: {
        type: 'enum',
        required: false,
        default: 'default',
        options: ['default', 'spacious'],
      },
      tone: {
        type: 'enum',
        required: false,
        default: 'neutral',
        options: ['neutral', 'muted', 'accent', 'positive', 'warning', 'destructive'],
      },
      actionVisibility: {
        type: 'enum',
        required: false,
        default: 'reveal',
        options: ['reveal', 'hover', 'always', 'hidden'],
      },
      leading: {
        type: 'ReactNode',
        required: false,
      },
      meta: {
        type: 'ReactNode',
        required: false,
      },
      interactive: {
        type: 'boolean',
        required: false,
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          children: 'Page title',
          icon: 'file',
        },
      },
      {
        name: 'Navigation Active',
        props: {
          children: 'Current page',
          icon: 'file',
          active: true,
        },
      },
      {
        name: 'Disclosure Parent',
        props: {
          children: 'Project',
          icon: 'folder',
          chevron: 'down',
          'aria-expanded': true,
          actionVisibility: 'hover',
          actions: '[Button icon=plus]',
        },
      },
      {
        name: 'Tree Row',
        props: {
          children: 'src/components/Button.tsx',
          icon: 'file',
          indent: 2,
        },
      },
      {
        name: 'Section',
        props: {
          tone: 'muted',
          children: 'Collections',
          interactive: false,
        },
      },
      {
        name: 'Busy Destructive',
        props: {
          children: 'Delete chat?',
          tone: 'destructive',
          'aria-busy': true,
          actionVisibility: 'always',
          actions: '[Button icon=close]',
        },
      },
    ],
  },
  Text: {
    patchProps: {
      variant: {
        options: ['body', 'heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'kbd', 'code', 'markdown', 'muted', 'blockquote'],
        default: 'body',
      },
    },
    patchStates: (states) => states.map((state) => state.name === 'Default (Body)'
      ? { ...state, props: { ...state.props, variant: 'body' } }
      : state),
  },
  Toast: {
    patchStates: () => [
      {
        name: 'Default',
        props: {
          title: 'Workspace updated',
          description: 'Your changes are available to collaborators.',
          tone: 'neutral',
          dismissible: true,
        },
      },
      {
        name: 'Positive',
        props: {
          title: 'Deployment completed',
          description: 'Production is healthy and serving the new release.',
          tone: 'positive',
          dismissible: true,
        },
      },
      {
        name: 'Warning',
        props: {
          title: 'Usage is near the limit',
          description: 'This workspace has used 82% of its monthly quota.',
          tone: 'warning',
          dismissible: true,
        },
      },
      {
        name: 'Destructive',
        props: {
          title: 'Deployment failed',
          description: 'Review the build log before retrying.',
          tone: 'destructive',
          dismissible: true,
        },
      },
    ],
  },
  Tree: {
    patchProps: {
      items: {
        type: 'array',
        required: false,
      },
      renderNode: {
        type: 'function',
        required: false,
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
  ['expanded', 'defaultExpanded'],
  ['page', 'defaultPage'],
  ['step', 'defaultStep'],
  ['sizes', 'defaultSizes'],
  ['index', 'defaultIndex'],
  ['activeId', 'defaultActiveId'],
  ['cropRange', 'defaultCropRange'],
  ['files', 'defaultFiles'],
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

function authoredSource(fileName: string, code: string): SourceBundle {
  return {
    fileName, code,
    resolveImport(specifier: string): SourceBundle | undefined {
      if (!specifier.startsWith('.')) return undefined
      const base = path.resolve(FACE_UI_ROOT, path.dirname(fileName), specifier)
      const resolved = [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.ts')]
        .find(candidate => candidate.startsWith(`${FACE_UI_ROOT}${path.sep}`) && fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      return resolved ? authoredSource(path.relative(FACE_UI_ROOT, resolved), fs.readFileSync(resolved, 'utf8')) : undefined
    },
  }
}

function assertUnionDocs(componentName: string, docConflicts: ExtractedProp[]) {
  const pending = new Set(PENDING_UNION_DOC_CONFLICTS[componentName])
  const conflicts = docConflicts.filter((prop) => !pending.has(prop.name))
  if (conflicts.length === 0) return
  throw new Error(
    `${componentName}: union branches must share one JSDoc per prop:\n${conflicts
      .map((prop) => `  ${prop.name}: ${prop.docConflict!.map((doc) => JSON.stringify(doc)).join(' vs ')}`)
      .join('\n')}`,
  )
}

function buildCanonicalAnalyses(
  interfaceName: string,
  { fileName: relSourcePath, code }: SourceBundle,
  canonicalProps: ExtractedProp[],
): PropAnalysis[] {
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
    if (extractsFaceUiProps(interfaceName, code) && !new RegExp(`type\\s+${interfaceName}\\s*=`).test(code)) {
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
        description: canonical.description,
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
  return {
    name: enriched.name,
    type: canonical.type === 'any' ? enriched.type : canonical.type,
    required: canonical.required,
    defaultValue: canonical.defaultValue !== undefined ? canonical.defaultValue : enriched.defaultValue,
    description: canonical.description ?? enriched.description,
    options: getPropOptions(canonical.options, enriched.options),
    enumValues: enriched.enumValues,
    isArray: canonical.type === 'any' ? enriched.isArray : canonical.type === 'array',
    arrayItemType: canonical.type === 'any' || canonical.type === 'array' ? enriched.arrayItemType : undefined,
    isObject: canonical.type === 'any' ? enriched.isObject : canonical.type === 'object',
    objectShape: enriched.objectShape,
    isInherited: enriched.isInherited,
  }

}

function normalizeOptions(input?: Array<string | number | boolean>): Array<string | number | boolean> | undefined {
  if (!Array.isArray(input)) return undefined
  const seen = new Set<string | number | boolean>()
  const next = input
    .map((item) => typeof item === 'string' ? item.trim() : item)
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

  if (typeText.includes('reactnode') || typeText.includes('reactelement')) return { type: 'ReactNode' }
  if (options && options.length > 0) {
    return { type: new Set(options.map(option => typeof option)).size > 1 ? 'union' : 'enum', options }
  }
  if (typeText.includes('|')) return { type: 'any' }
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
  if (typeText.includes('number') && typeText.includes('string')) {
    return { type: 'any' }
  }
  if (typeText.includes('number')) {
    return { type: 'number' }
  }
  if (typeText.includes('string') || typeText.includes('key')) {
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
  const override = CONTRACT_OVERRIDES[componentName] ?? {}

  const omitProps = new Set(override.omitProps ?? [])
  const next: Record<string, FaceJsonProp> = {}

  for (const [propName, propDef] of Object.entries(props)) {
    if (isPlaygroundImplementationProp(propName, propDef) || omitProps.has(propName)) continue
    next[propName] = { ...propDef, ...override.patchProps?.[propName] }
  }

  return next
}

function normalizeContractStates(
  componentName: string,
  currentStates: NonNullable<FaceJsonContract['states']>,
  props: Record<string, FaceJsonProp>,
): NonNullable<FaceJsonContract['states']> {
  const knownProps = new Set(Object.keys(props))
  const canonicalStates = currentStates.map((state) => ({
    ...state,
    props: Object.fromEntries(
      Object.entries(state.props ?? {}).filter(([propName]) => knownProps.has(propName)),
    ),
  }))
  const patchedStates = CONTRACT_OVERRIDES[componentName]?.patchStates?.(canonicalStates) ?? canonicalStates
  const normalizedStates = patchedStates.filter((state) => !state.name.startsWith('Product / '))

  for (const state of normalizedStates) {
    for (const [propName, value] of Object.entries(state.props ?? {})) {
      if (!knownProps.has(propName)) {
        throw new Error(`${componentName} contract state "${state.name}" uses unknown prop "${propName}"`)
      }
      const options = props[propName]?.options
      if (
        Array.isArray(options)
        && options.length > 0
        && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        && !options.some((option) => Object.is(option, value) || String(option) === String(value))
      ) {
        throw new Error(
          `${componentName} contract state "${state.name}" uses invalid value ${JSON.stringify(value)} for "${propName}"; expected one of ${options.map((option) => JSON.stringify(option)).join(', ')}`,
        )
      }
    }
  }

  return normalizedStates
}

function productScenarioDisplayName(scenarioName: string): string {
  return scenarioName.replace(/^Product\s*\/\s*/i, '').trim()
}

function productScenarioSlug(scenarioName: string): string {
  const slug = productScenarioDisplayName(scenarioName)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  if (!slug) throw new Error(`Unable to build a file name for product scenario: ${scenarioName}`)
  return slug
}

function productScenarioContractPath(entry: ComponentContractEntry, scenario: ProductScenario): string {
  return path.join(entry.componentDir, `${entry.componentName}.${productScenarioSlug(scenario.name)}.face.json`)
}

function productScenarioControlType(prop: FaceJsonProp): string {
  if (prop.type === 'enum') return 'select'
  if (prop.type === 'ReactNode' || prop.type === 'node' || prop.type === 'union') return 'any'
  return prop.type
}

function buildProductScenarioControl(name: string, prop: FaceJsonProp): Record<string, unknown> {
  const control: Record<string, unknown> = {
    name,
    type: productScenarioControlType(prop),
    required: Boolean(prop.required),
  }
  if (prop.description) control.description = prop.description
  if (Array.isArray(prop.options) && prop.options.length > 0) control.options = structuredClone(prop.options)
  if (Object.prototype.hasOwnProperty.call(prop, 'default')) control.defaultValue = structuredClone(prop.default)
  for (const key of ['controlType', 'min', 'max', 'step', 'suggestions']) {
    if (Object.prototype.hasOwnProperty.call(prop, key)) control[key] = structuredClone(prop[key])
  }
  return control
}

function buildProductScenarioFaceContract(
  entry: ComponentContractEntry,
  scenario: ProductScenario,
  componentContract: FaceJsonContract,
): ProductScenarioFaceContract {
  const displayName = productScenarioDisplayName(scenario.name)
  const propNames = Object.keys(componentContract.props)
  const sourcePath = path.relative(FACE_UI_ROOT, entry.sourcePath).replace(/\\/g, '/')
  const contractPath = path.relative(FACE_UI_ROOT, entry.contractPath).replace(/\\/g, '/')

  for (const [propName, value] of Object.entries(scenario.props)) {
    const prop = componentContract.props[propName]
    if (!prop) {
      throw new Error(`${entry.componentName} product scenario "${scenario.name}" uses unknown prop "${propName}"`)
    }
    if (
      Array.isArray(prop.options)
      && prop.options.length > 0
      && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      && !prop.options.some((option) => Object.is(option, value) || String(option) === String(value))
    ) {
      throw new Error(
        `${entry.componentName} product scenario "${scenario.name}" uses invalid value ${JSON.stringify(value)} for "${propName}"; expected one of ${prop.options.map((option) => JSON.stringify(option)).join(', ')}`,
      )
    }
  }

  return {
    schema: 'face',
    'schema-version': 1,
    name: `${entry.componentName} / ${displayName}`,
    description: `${displayName} product scenario for the ${entry.componentName} component.`,
    framework: 'react',
    root: {
      type: entry.componentName,
      props: Object.fromEntries(propNames.map((propName) => [propName, { $ref: `props.${propName}` }])),
      children: [],
    },
    currentState: {
      props: structuredClone(scenario.props),
    },
    controls: Object.entries(componentContract.props)
      .map(([propName, prop]) => buildProductScenarioControl(propName, prop)),
    meta: {
      name: displayName,
      component: entry.componentName,
      kind: 'product-scenario',
    },
    generated: true,
    generatedBy: PRODUCT_SCENARIO_GENERATOR,
    source: {
      path: sourcePath,
      contract: contractPath,
    },
  }
}

function readProductScenarioContract(filePath: string): ProductScenarioFaceContract | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return readJson<ProductScenarioFaceContract>(filePath)
  } catch {
    return null
  }
}

function listGeneratedProductScenarioContractPaths(entries: ComponentContractEntry[]): string[] {
  return entries.flatMap((entry) => fs.readdirSync(entry.componentDir)
    .filter((fileName) => fileName.endsWith('.face.json'))
    .map((fileName) => path.join(entry.componentDir, fileName))
    .filter((filePath) => readProductScenarioContract(filePath)?.generatedBy === PRODUCT_SCENARIO_GENERATOR))
}

function validateProductScenarioCatalog(entries: ComponentContractEntry[]) {
  const componentNames = new Set(entries.map((entry) => entry.componentName))
  const scenarioComponentNames = new Set(Object.keys(PRODUCT_SCENARIOS))
  const missing = [...componentNames].filter((name) => !scenarioComponentNames.has(name))
  const extra = [...scenarioComponentNames].filter((name) => !componentNames.has(name))

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Product scenario catalog coverage mismatch. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
    )
  }

  for (const [componentName, scenarios] of Object.entries(PRODUCT_SCENARIOS)) {
    if (scenarios.length !== 2) {
      throw new Error(`${componentName} must define exactly two product scenarios; received ${scenarios.length}`)
    }
    const names = new Set<string>()
    const slugs = new Set<string>()
    for (const scenario of scenarios) {
      if (!scenario.name.startsWith('Product / ')) {
        throw new Error(`${componentName} product scenario name must start with "Product / ": ${scenario.name}`)
      }
      if (names.has(scenario.name)) {
        throw new Error(`${componentName} has duplicate product scenario name: ${scenario.name}`)
      }
      const slug = productScenarioSlug(scenario.name)
      if (slugs.has(slug)) {
        throw new Error(`${componentName} has product scenarios with the same file slug: ${slug}`)
      }
      if (Object.keys(scenario.props).length < 2) {
        throw new Error(`${componentName} product scenario "${scenario.name}" must combine at least two props`)
      }
      names.add(scenario.name)
      slugs.add(slug)
    }
  }
}

/** Read a component's authored props, its declaration JSDoc and the props
 * whose union branches disagree on JSDoc. */
function analyzeComponent(entry: ComponentContractEntry) {
  const interfaceName = `${entry.componentName}Props`
  const source = authoredSource(
    path.relative(process.cwd(), entry.sourcePath).replace(/\\/g, '/'),
    fs.readFileSync(entry.sourcePath, 'utf8'),
  )
  const canonicalProps = extractReactTsPropsFromSource(source, interfaceName)
  return {
    analyses: buildCanonicalAnalyses(interfaceName, source, canonicalProps),
    description: extractComponentDescription(source),
    docConflicts: canonicalProps.filter((prop) => prop.docConflict),
  }
}

/** Build a component contract; JSDoc owns the component and prop descriptions. */
export function buildFaceJsonContract(entry: ComponentContractEntry): FaceJsonContract {
  const current = readJson<FaceJsonContract>(entry.contractPath)
  const { analyses, description, docConflicts } = analyzeComponent(entry)
  assertUnionDocs(entry.componentName, docConflicts)
  const nextProps: Record<string, FaceJsonProp> = {}

  for (const prop of analyses) {
    nextProps[prop.name] = toFaceProp(prop, current.props?.[prop.name])
  }

  for (const [controlledKey, defaultKey] of UNCONTROLLED_PROP_PAIRS) {
    if (!nextProps[defaultKey]) continue
    if (!nextProps[controlledKey]) continue
    delete nextProps[controlledKey].default
  }

  const props = applyOverrides(entry.componentName, nextProps)

  return {
    ...current,
    name: current.name || entry.componentName,
    description: description ?? (current.description || `${entry.componentName} component`),
    props,
    states: normalizeContractStates(
      entry.componentName,
      Array.isArray(current.states) ? current.states : [],
      props,
    ),
  }
}

export function collectFaceJsonContracts(componentName?: string): ContractSyncResult[] {
  validateProductScenarioCatalog(listComponentContracts())
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

export function collectProductScenarioContracts(componentName?: string): ProductScenarioContractSyncResult[] {
  const entries = listComponentContracts(componentName)
  validateProductScenarioCatalog(listComponentContracts())
  return entries.flatMap((entry) => {
    const componentContract = buildFaceJsonContract(entry)
    return (PRODUCT_SCENARIOS[entry.componentName] ?? []).map((scenario) => {
      const contractPath = productScenarioContractPath(entry, scenario)
      const currentContract = readProductScenarioContract(contractPath)
      const nextContract = buildProductScenarioFaceContract(entry, scenario, componentContract)
      return {
        componentName: entry.componentName,
        scenarioName: scenario.name,
        contractPath,
        currentContract,
        nextContract,
        changed: JSON.stringify(currentContract) !== JSON.stringify(nextContract),
      }
    })
  })
}

/** Components and public props still missing JSDoc, and props whose union
 * branches disagree: `Name (component)`, `Name.prop` or
 * `Name.prop (union branches differ)`, one per line. */
export function collectJsdocReport(entries = listComponentContracts()): string[] {
  return entries.flatMap((entry) => {
    const { analyses, description, docConflicts } = analyzeComponent(entry)
    const omitted = new Set(CONTRACT_OVERRIDES[entry.componentName]?.omitProps)
    return [
      ...(description ? [] : [`${entry.componentName} (component)`]),
      ...analyses
        .filter((prop) => !prop.description && !omitted.has(prop.name))
        .map((prop) => `${entry.componentName}.${prop.name}`),
      ...docConflicts.map((prop) => `${entry.componentName}.${prop.name} (union branches differ)`),
    ]
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
  const productResults = collectProductScenarioContracts(options?.componentName)
  const componentEntries = listComponentContracts(options?.componentName)
  const expectedProductPaths = new Set(productResults.map((result) => result.contractPath))
  const staleProductPaths = listGeneratedProductScenarioContractPaths(componentEntries)
    .filter((filePath) => !expectedProductPaths.has(filePath))
  if (options?.write) {
    for (const result of results) {
      if (!result.changed) continue
      writeJson(result.contractPath, result.nextContract)
    }
    for (const result of productResults) {
      if (!result.changed) continue
      writeJson(result.contractPath, result.nextContract)
    }
    for (const filePath of staleProductPaths) fs.rmSync(filePath)
    printSummary(results, 'write')
    const changedProductResults = productResults.filter((result) => result.changed)
    console.log(`face-ui-react product scenario contracts synced (${productResults.length} contracts, ${changedProductResults.length} updated, ${staleProductPaths.length} removed)`)
    return 0
  }

  printSummary(results, 'check')
  const changedProductResults = productResults.filter((result) => result.changed)
  if (changedProductResults.length === 0 && staleProductPaths.length === 0) {
    console.log(`face-ui-react product scenario contracts are in sync (${productResults.length} contracts)`)
  } else {
    for (const result of changedProductResults) {
      console.log(`drift ${result.componentName} / ${result.scenarioName}: ${path.relative(process.cwd(), result.contractPath)}`)
    }
    for (const filePath of staleProductPaths) {
      console.log(`stale product scenario contract: ${path.relative(process.cwd(), filePath)}`)
    }
    console.error(`face-ui-react product scenario contracts drifted (${changedProductResults.length} changed, ${staleProductPaths.length} stale)`)
  }
  return results.some((result) => result.changed) || changedProductResults.length > 0 || staleProductPaths.length > 0 ? 1 : 0
}

function main() {
  const args = new Set(process.argv.slice(2))
  const componentArgIndex = process.argv.findIndex((arg) => arg === '--component')
  const componentName = componentArgIndex >= 0 ? process.argv[componentArgIndex + 1] : undefined
  if (args.has('--report-jsdoc')) {
    // Report only: W4-03 turns missing JSDoc into a generator error.
    const report = collectJsdocReport(listComponentContracts(componentName))
    console.log(`JSDoc report: ${report.length} missing or inconsistent${report.map((line) => `\n  ${line}`).join('')}`)
    return
  }
  const exitCode = runContractSync({
    write: args.has('--write'),
    componentName,
  })
  process.exitCode = exitCode
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main()
}
