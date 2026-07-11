import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getAdvancedPropParser, type ParsedProp } from './lib/advancedPropParser'
import { PRODUCT_SCENARIOS, type ProductScenario } from './product-scenarios'
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

const CONTRACT_OVERRIDES: Record<string, ContractOverride> = {
  Accordion: {
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
      { name: 'Neutral Fill', props: { text: 'Neutral', appearance: 'fill' } },
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
      title: {
        type: 'ReactNode',
        required: false,
        description: 'Convenience title slot rendered through Card.Title and Face UI Text.',
      },
      description: {
        type: 'ReactNode',
        required: false,
        description: 'Convenience description slot rendered through Card.Description and Face UI Text.',
      },
      content: {
        type: 'ReactNode',
        required: false,
        description: 'Convenience body slot rendered through Card.Content; primitive values use Face UI Text.',
      },
      footer: {
        type: 'object',
        required: false,
        controlType: 'object',
        description: 'Convenience footer slot. Use React content or a structured component descriptor.',
      },
      footerLayout: {
        description: 'Layout used by the convenience footer slot. Compound usage configures Card.Footer directly.',
      },
    },
    patchStates: () => [
      {
        name: 'Default',
        props: {
          title: 'Card Title',
          content: 'Workspace settings and recent activity stay grouped in one place',
          footer: {
            __componentName__: 'Button',
            text: 'Open',
            icon: 'arrow-right',
            iconPosition: 'right',
            membrane: true,
            fullWidth: false,
          },
        },
      },
      {
        name: 'Dialog Geometry',
        props: {
          radius: 'lg',
          footerLayout: 'between',
          title: 'Confirm publish',
          content: 'Review the final settings before sending this workspace live.',
          footer: [
            { __componentName__: 'Button', text: 'Cancel', variant: 'outline', membrane: true, fullWidth: false },
            { __componentName__: 'Button', text: 'Publish', variant: 'accent', membrane: true, fullWidth: false },
          ],
        },
      },
      {
        name: 'Floating Geometry',
        props: {
          padding: 'membrane',
          radius: 'base',
          content: 'Compact overlay surface for menus, selects and date pickers.',
        },
      },
      {
        name: 'Code Surface',
        props: {
          variant: 'code',
          padding: 'none',
          radius: 'md',
          border: false,
          content: "const surface = 'code'",
        },
      },
      {
        name: 'Showcase Surface',
        props: {
          variant: 'showcase',
          border: false,
          content: 'Gallery preview surface',
        },
      },
      {
        name: 'Plain',
        props: {
          variant: 'plain',
          padding: 'none',
          radius: 'none',
          border: false,
          content: 'Unframed content for composition inside another surface.',
        },
      },
      {
        name: 'Interactive',
        props: {
          interactive: true,
          title: 'Deploy preview',
          content: 'Interactive surfaces can react to hover while click behavior stays with their children.',
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
  Icon: {
    patchStates: () => [
      { name: 'Default', props: { name: 'settings' } },
      { name: 'Direction Left', props: { name: 'left' } },
      { name: 'Direction Right', props: { name: 'right' } },
      { name: 'Unknown Fallback', props: { name: 'unknown-icon' } },
      { name: 'Accessible', props: { name: 'account', label: 'Account' } },
    ],
  },
  Checkbox: {
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
    omitProps: ['disabled', 'label'],
    patchProps: {
      actions: {
        type: 'array',
        required: false,
        description: 'Optional footer actions.',
      },
    },
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
          name: 'Responsive Sheet',
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
    patchProps: {
      required: {
        description: 'Show the required indicator (*).',
      },
    },
  },
  Progress: {
    patchStates: () => [
      {
        name: 'Default',
        props: {
          value: 28,
          max: 100,
          tone: 'neutral',
          shape: 'linear',
          showValue: true,
          label: 'Typography',
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
        props: { value: 82, tone: 'warning', showValue: true, label: 'Storage used' },
      },
      {
        name: 'Destructive',
        props: { value: 96, tone: 'destructive', showValue: true, label: 'Quota used' },
      },
      {
        name: 'Circle',
        props: { value: 28, shape: 'circle', showValue: true, ariaLabel: 'Context progress' },
      },
      {
        name: 'Indeterminate',
        props: { indeterminate: true, label: 'Loading assets' },
      },
    ],
  },
  Radio: {
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
      disabled: {
        description: 'Disabled state for the entire group.',
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
  Slider: {
    patchProps: {
      variant: {
        type: 'enum',
        required: false,
        default: 'simple',
        options: ['simple', 'advanced'],
        description: 'Standard track/thumb presentation or enhanced value-thumb presentation.',
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
        options: ['default', 'spacious'],
        description: 'Internal spacing density. Default follows the shared control rhythm; spacious gives inspection rows more breathing room.',
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

  const props = applyOverrides(entry.componentName, nextProps)

  return {
    ...current,
    name: current.name || entry.componentName,
    description: current.description || extractSummary(code) || `${entry.componentName} component`,
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
  const exitCode = runContractSync({
    write: args.has('--write'),
    componentName,
  })
  process.exitCode = exitCode
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main()
}
