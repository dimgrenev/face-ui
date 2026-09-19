/**
 * RFC §0 D2, D3, D5: one state paradigm, one implementation per cross-cutting
 * behaviour, no throw on data. Each rule scans the modules of a component's
 * own implementation (its directory plus the shared modules it uses).
 */
import ts from 'typescript'
import { at, describeGate, eachNode, modulesOf } from './gates'

/** Collects `message(node)` for every node of every module of `component` that `match` accepts. */
function scan(
  component: string,
  allowed: (path: string) => boolean,
  match: (node: ts.Node) => string | false,
): string[] {
  const found: string[] = []
  for (const path of modulesOf(component)) {
    if (allowed(path)) continue
    eachNode(path, (node) => {
      const message = match(node)
      if (message) found.push(`${at(node)}: ${message}`)
    })
  }
  return found
}

const only =
  (...paths: string[]) =>
  (path: string) =>
    paths.includes(path)

const COMPARISONS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
])
/** A string literal compared with `===`/`!==` or used as a `case`. */
const compared = (node: ts.Node, values: ReadonlySet<string>) =>
  ts.isStringLiteralLike(node) &&
  values.has(node.text) &&
  ((ts.isBinaryExpression(node.parent) && COMPARISONS.has(node.parent.operatorToken.kind)) ||
    ts.isCaseClause(node.parent))

/** Primitives: framework-free runtime modules and shared hooks, not components or machines. */
const isPrimitive = (path: string) =>
  /^assets\/(runtime|adapters\/react)\/[\w-]+\.ts$/.test(path)
/** The frozen Date/Calendar exception (RFC §1.1 p.7): their machines and 2-D grids. */
const DATE_EXCEPTION = [
  'assets/machines/date.machine.ts',
  'assets/machines/calendar.machine.ts',
  'assets/internal/CalendarGrid.tsx',
  'assets/internal/DateChoiceGrid.tsx',
]

// D2: throw only for internal invariants
const throws = (component: string) =>
  scan(
    component,
    only('assets/runtime/civil-date.ts', 'assets/runtime/create-machine.ts'),
    (node) => ts.isThrowStatement(node) && 'throw on data; normalize and report with invalidProp (§2)',
  )

// D3: only the Date/Calendar machines remain
const machines = (component: string) =>
  modulesOf(component)
    .filter((path) => /^assets\/machines\/(?!(date|calendar)\.machine\.ts$)/.test(path))
    .map((path) => `${path}: state belongs to React hooks (§1.1)`)

// D3: one isomorphic layout effect declaration
const layoutEffects = (component: string) =>
  scan(component, only('assets/adapters/react/use-isomorphic-layout-effect.ts'), (node) => {
    if (!ts.isConditionalExpression(node)) return false
    const branches = [node.whenTrue, node.whenFalse].map((branch) => branch.getText()).sort()
    return (
      branches.join() === 'useEffect,useLayoutEffect' &&
      'redeclares useIsomorphicLayoutEffect'
    )
  })

// D3: direction is read in one place
const directions = (component: string) =>
  scan(
    component,
    only('assets/runtime/keyboard.ts', 'assets/adapters/react/use-floating-position.ts'),
    (node) => compared(node, new Set(['rtl'])) && "compares with 'rtl'; use readDirection/keyToMove",
  )

// D3: focus availability is checked by the primitives and layers.ts
const connections = (component: string) =>
  scan(
    component,
    isPrimitive,
    (node) =>
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'isConnected' &&
      'reads .isConnected; use useFocusRecovery/isAvailable',
  )

// D3: the machine-era controllable hooks are gone
const legacyHooks = (component: string) =>
  modulesOf(component)
    .filter((path) => /use-controllable-(machine-prop|open-state)\.ts$/.test(path))
    .map((path) => `${path}: use useControllableState`)

// D5: one implementation per behaviour, recognised by its signature
const FIELDS = new Set(['Date', 'Input', 'Radio', 'Rating', 'SegmentedControl', 'Select', 'Slider'])
const HOME_END = new Set(['Home', 'End'])
/** The identifier a variable, function or property declaration introduces; '' otherwise. */
const declaredName = (node: ts.Node) =>
  (ts.isVariableDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isPropertyDeclaration(node)) &&
  node.name &&
  ts.isIdentifier(node.name)
    ? node.name.text
    : ''
const oneImplementation = (component: string) =>
  scan(component, () => false, (node) => {
    const path = node.getSourceFile().fileName
    const named = declaredName(node)
    if (
      /^(is)?[cC]ontrolled$/.test(named) &&
      /[!=]==\s*undefined/.test(node.getText()) &&
      path !== 'assets/adapters/react/use-controllable-state.ts'
    )
      return 'controlled state outside useControllableState'
    if (
      compared(node, HOME_END) &&
      path !== 'assets/runtime/keyboard.ts' &&
      !DATE_EXCEPTION.includes(path)
    )
      return 'own Home/End handling; use useRovingFocus, keyToMove or stepIntent'
    if (
      (/typeahead/i.test(named) || (ts.isStringLiteral(node) && node.text === 'TYPEAHEAD')) &&
      !['assets/runtime/collection.ts', 'assets/adapters/react/use-roving-focus.ts'].includes(path)
    )
      return 'own typeahead; use typeahead() from runtime/collection'
    if (
      ts.isFunctionDeclaration(node) &&
      /^(read|normalize)\w*(Items|Options|Nodes|Ids|IdArray)$/.test(named) &&
      path !== 'assets/runtime/collection.ts'
    )
      return 'own collection reader; use readCollection/readKeys'
    if (
      ts.isCallExpression(node) &&
      /(^|\.)setTimeout$/.test(node.expression.getText()) &&
      /open|close|hover/i.test((ts.findAncestor(node, ts.isStatement) ?? node).getText()) &&
      path !== 'assets/adapters/react/use-hover-intent.ts'
    )
      return 'own open/close delay; use useHoverIntent'
    if (
      /^(label|description|error)Id$/.test(named) &&
      FIELDS.has(component) &&
      path !== 'assets/internal/field.tsx'
    )
      return 'own field anatomy; use useField/FieldLayout'
    if (
      ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind) &&
      /labels\??\.\w+$/i.test(node.left.getText()) &&
      ts.isStringLiteralLike(node.right) &&
      path !== 'assets/runtime/labels.ts'
    )
      return 'own label fallback; use resolveLabels'
    return false
  })

/** Components that still violate each rule; only the wave-closing WP edits these, and they only shrink. */
const PENDING = {
  'D2 throw': [],
  'D3 machines': [
    'Carousel', 'Command', 'Navigation', 'Panel', 'Table', 'Toc', 'Upload',
  ],
  'D3 isomorphic layout effect': [],
  'D3 direction': [],
  'D3 isConnected': [],
  'D3 machine-era hooks': ['Carousel', 'Command', 'Navigation', 'Panel', 'Toc'],
  'D5 one implementation': ['Command', 'Navigation', 'Panel', 'Upload'],
} satisfies Record<string, readonly string[]>

describeGate('state-architecture D2 throw', PENDING['D2 throw'], throws)
describeGate('state-architecture D3 machines', PENDING['D3 machines'], machines)
describeGate('state-architecture D3 isomorphic layout effect', PENDING['D3 isomorphic layout effect'], layoutEffects)
describeGate('state-architecture D3 direction', PENDING['D3 direction'], directions)
describeGate('state-architecture D3 isConnected', PENDING['D3 isConnected'], connections)
describeGate('state-architecture D3 machine-era hooks', PENDING['D3 machine-era hooks'], legacyHooks)
describeGate('state-architecture D5 one implementation', PENDING['D5 one implementation'], oneImplementation)
