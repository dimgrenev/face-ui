/**
 * RFC §0 A1–A5: the §3.1 naming conventions (rules R-*) over every
 * component's TypeScript props and its rendered strings.
 */
import ts from 'typescript'
import {
  at,
  checker,
  componentParts,
  describeGate,
  eachNode,
  isCallable,
  isOwn,
  members,
  modulesOf,
} from './gates'

/** A prop, a prop of a compound part, or a field of an item/object prop. */
interface Field {
  /** `Tabs value`, `Card.Title text`, `Tree items[].id`. */
  path: string
  name: string
  types: readonly ts.Type[]
  nested: boolean
  /** Names of the sibling fields (the part's props, or the item's fields). */
  siblings: ReadonlySet<string>
  /** The top-level prop a nested field belongs to: `items` for `items[].id`; structural definitions such as `columns` keep `id`. */
  collection?: string
}

const typeText = (type: ts.Type) =>
  checker().typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation)

const literals = (types: readonly ts.Type[]) =>
  types.flatMap(members).flatMap((type) => (type.isStringLiteral() ? [type.value] : []))

/** Own object types reachable through a prop: array elements and object fields. */
function nestedFields(
  owner: string,
  collection: string,
  type: ts.Type,
  depth: number,
  seen: Set<ts.Type>,
): Field[] {
  const check = checker()
  if (depth > 3) return []
  return members(type).flatMap((member) => {
    if (seen.has(member) || isCallable(member)) return []
    seen.add(member)
    if (check.isArrayType(member) || check.isTupleType(member))
      return check
        .getTypeArguments(member as ts.TypeReference)
        .flatMap((element) => nestedFields(`${owner}[]`, collection, element, depth, seen))
    if (!(member.flags & ts.TypeFlags.Object) || !member.symbol?.declarations?.some(isOwn))
      return []
    const properties = check.getPropertiesOfType(member)
    const siblings = new Set(properties.map((property) => property.name))
    return properties.flatMap((property) => {
      const declaration = property.declarations?.[0]
      if (!declaration || !isOwn(declaration)) return []
      const propertyType = check.getTypeOfSymbol(property)
      const path = `${owner}.${property.name}`
      return [
        { path, name: property.name, types: [propertyType], nested: true, siblings, collection },
        ...nestedFields(path, collection, propertyType, depth + 1, seen),
      ]
    })
  })
}

const fieldCache = new Map<string, readonly Field[]>()
/** Every own prop of a component and its parts, plus the fields of its item types (not of `labels`). */
function fields(component: string): readonly Field[] {
  let found = fieldCache.get(component)
  if (!found) {
    found = componentParts(component).flatMap((part) => {
      const siblings = new Set(part.props.map((prop) => prop.name))
      return part.props
        .filter((prop) => prop.own)
        .flatMap((prop) => [
          { path: `${part.name} ${prop.name}`, name: prop.name, types: prop.types, nested: false, siblings },
          ...(prop.name === 'labels'
            ? []
            : prop.types.flatMap((type) =>
                nestedFields(`${part.name} ${prop.name}`, prop.name, type, 1, new Set()),
              )),
        ])
    })
    fieldCache.set(component, found)
  }
  return found
}

/** Props of the main export and its parts, by part name. */
const partProps = (component: string) =>
  componentParts(component).map((part) => ({
    part: part.name,
    props: new Map(part.props.map((prop) => [prop.name, prop])),
  }))

// ---------------------------------------------------------------------------
// R-triple (K1, K2, K6, A2): x / defaultX / onXChange({ x }), onXCommit({ x })

/** State triples each component must expose (RFC §3.2 "State → target"). */
const STATES: Record<string, readonly string[]> = {
  Accordion: ['expanded'],
  Calendar: ['value'],
  Carousel: ['index'],
  Checkbox: ['checked'],
  Code: ['collapsed'],
  Command: ['search', 'open'],
  Date: ['value', 'open'],
  Input: ['value'],
  Menu: ['open'],
  Modal: ['open'],
  Navigation: ['value', 'open'],
  Overlay: ['open'],
  Pagination: ['page'],
  Panel: ['value', 'collapsed', 'open'],
  Popover: ['open'],
  Radio: ['value'],
  Rating: ['value'],
  SegmentedControl: ['value'],
  Select: ['value', 'open'],
  Slider: ['value', 'cropRange'],
  Steps: ['step'],
  Switcher: ['checked'],
  Table: ['sort', 'selectedRows'],
  Tabs: ['value'],
  Toc: ['value'],
  Toggle: ['value'],
  Tooltip: ['open'],
  Tree: ['value', 'expanded'],
  Upload: ['files'],
}

const capital = (name: string) => name[0]!.toUpperCase() + name.slice(1)
const lower = (name: string) => name[0]!.toLowerCase() + name.slice(1)

/** Payload keys of a callback prop: the fields of its first parameter, per callable member. */
function payloadKeys(type: ts.Type): Array<readonly string[] | null> {
  const check = checker()
  return members(type).flatMap((member) =>
    member.getCallSignatures().map((signature) => {
      const parameter = signature.getParameters()[0]
      if (!parameter) return null
      const payload = check.getTypeOfSymbol(parameter)
      return payload.flags & ts.TypeFlags.Object && !check.isArrayLikeType(payload)
        ? check.getPropertiesOfType(payload).map((property) => property.name)
        : null
    }),
  )
}

function tripleViolations(component: string): string[] {
  const found: string[] = []
  for (const { part, props } of partProps(component)) {
    const has = (name: string) => props.has(name)
    const own = [...props.values()].filter((prop) => prop.own)
    for (const prop of own) {
      const change = /^on([A-Z]\w*)Change$/.exec(prop.name)
      const commit = /^on([A-Z]\w*)Commit$/.exec(prop.name)
      const initial = /^default([A-Z]\w*)$/.exec(prop.name)
      const match = (change ?? commit ?? initial)?.[1]
      if (!match) continue
      const state = lower(match)
      const where = `${part} ${prop.name}`
      if (initial) {
        if (!has(state) || !has(`on${capital(state)}Change`))
          found.push(`${where}: defaultX needs ${state} and on${capital(state)}Change (K1)`)
        continue
      }
      if (!has(state)) found.push(`${where}: no ${state} prop (K1)`)
      if (change && !has(`default${capital(state)}`))
        found.push(`${where}: no default${capital(state)} prop (K1)`)
      for (const keys of prop.types.flatMap(payloadKeys))
        if (!keys?.includes(state))
          found.push(`${where}: payload is ${keys ? `{ ${keys.join(', ')} }` : 'not a details object'}, expected { ${state} } (K1/K6)`)
    }
    if (part !== component) continue
    for (const state of STATES[component] ?? [])
      for (const name of [state, `default${capital(state)}`, `on${capital(state)}Change`])
        if (!has(name)) found.push(`${part}: state ${state} lacks ${name} (A2)`)
  }
  return found
}

// ---------------------------------------------------------------------------
// R-names (K2–K4, K9, K12, K19–K23, K25): one concept, one name

/** Names outside the library vocabulary, with the canonical replacement. */
const RENAMED: Record<string, string> = {
  appearance: 'variant (K20)',
  autoFocusOnOpen: 'the layer focus contract: [data-autofocus] (K28)',
  closeOnOverlayClick: 'closeOnBackdropClick (K22)',
  dismissible: 'closable (K21)',
  emptyContent: 'labels.empty (K13)',
  groups: 'group items { type: "group", items } (K9)',
  leadingIcon: 'icon (K12)',
  labelOrientation: 'labelPosition (K25)',
  options: 'items (K9)',
  rightText: 'meta (K12)',
  rowStyle: 'variant (K20)',
  selectionMode: 'multiple (K4)',
  showClear: 'clearable (K21)',
  sortColumn: 'sort (K2)',
  sortDirection: 'sort (K2)',
  surfaceBreakpoint: 'nothing: one 900px boundary (K20)',
  surfaceTitle: 'label or aria-label (K13)',
  titleAttr: 'the native title attribute (K16)',
  trailingIcon: 'icon + iconPosition (K12)',
}
/** `*Id` names that do reference DOM ids (K9). */
const DOM_ID_REFERENCES = new Set(['panelId'])

function nameViolations(component: string): string[] {
  return fields(component).flatMap(({ path, name, types, nested, siblings, collection }) => {
    const found: string[] = []
    if (RENAMED[name]) found.push(`${path}: use ${RENAMED[name]}`)
    if (/[a-z]Ids?$/.test(name) && !DOM_ID_REFERENCES.has(name))
      found.push(`${path}: an Id suffix names a DOM id reference only (K9)`)
    if (nested && name === 'id' && collection === 'items' && !siblings.has('value'))
      found.push(`${path}: items are keyed by value (K9)`)
    if (/Ms$/.test(name)) found.push(`${path}: milliseconds carry no suffix (K23)`)
    if (name === 'level' && component !== 'Toc')
      found.push(`${path}: use indent; level is the Toc outline level (K19)`)
    if (name === 'type' && literals(types).includes('multiple'))
      found.push(`${path}: use multiple: boolean (K4)`)
    if (name === 'trigger' && literals(types).length)
      found.push(`${path}: an interaction mode is openOn; trigger is an element (K22)`)
    return found
  })
}

// ---------------------------------------------------------------------------
// R-dup (A3, K10): two inputs for one meaning

/** Content is `children`; `content` is a secondary region only where `children` is the trigger. */
const CONTENT_REGION = new Set(['Overlay', 'Popover', 'Tooltip'])
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['text', 'children'],
  ['content', 'children'],
  ['rightText', 'meta'],
  ['withLine', 'lineSide'],
  ['indeterminate', 'value'],
  ['surfaceTitle', 'label'],
  ['slides', 'children'],
]

function duplicateViolations(component: string): string[] {
  return partProps(component).flatMap(({ part, props }) => {
    const found = PAIRS.filter(
      ([a, b]) =>
        props.get(a)?.own &&
        props.has(b) &&
        !(a === 'content' && CONTENT_REGION.has(component)),
    ).map(([a, b]) => `${part}: ${a} duplicates ${b} (A3)`)
    for (const name of ['code', 'content'])
      if (props.get(name)?.own && !props.has('children') && !CONTENT_REGION.has(component))
        found.push(`${part}: main content ${name} belongs in children (K10)`)
    return found
  })
}

// ---------------------------------------------------------------------------
// R-label (K13), R-aria (K15), R-logical (K17), R-bool (K21)

const labelViolations = (component: string) =>
  fields(component)
    .filter(({ name }) => /^[a-z]\w*Label$/.test(name) && !/^aria[A-Z]/.test(name))
    .map(({ path }) => `${path}: component strings live in labels (K13)`)

const ariaViolations = (component: string) =>
  fields(component)
    .filter(({ name }) => /^aria[A-Z]/.test(name))
    .map(({ path, name }) => `${path}: use the native aria-${name.slice(4).toLowerCase()} (K15)`)

const logicalViolations = (component: string) =>
  fields(component).flatMap(({ path, name, types }) =>
    name === 'side'
      ? []
      : literals(types)
          .filter((value) => /(^|-)(left|right)($|-)/.test(value))
          .map((value) => `${path}: '${value}' is physical; use start/end (K17)`),
  )

const booleanViolations = (component: string) =>
  fields(component)
    .filter(({ name }) => /^show[A-Z]|[a-z]able$/.test(name))
    .filter(({ types }) =>
      types.flatMap(members).some((type) => !(type.flags & ts.TypeFlags.BooleanLike)),
    )
    .map(({ path, types }) => `${path}: show*/-able are booleans, got ${types.map(typeText).join(' | ')} (K21)`)

// ---------------------------------------------------------------------------
// R-field (A4, K25): the seven fields share label, description, error, labelPosition

const FIELDS = new Set(['Date', 'Input', 'Radio', 'Rating', 'SegmentedControl', 'Select', 'Slider'])

function fieldViolations(component: string): string[] {
  if (!FIELDS.has(component)) return []
  const props = partProps(component)[0]!.props
  const found = ['label', 'description', 'error', 'labelPosition']
    .filter((name) => !props.has(name))
    .map((name) => `${component}: field lacks ${name} (A4)`)
  const position = props.get('labelPosition')
  // Union-typed props (single | multiple) list the prop once per branch.
  if (position && [...new Set(literals(position.types))].sort().join('|') !== 'start|top')
    found.push(`${component} labelPosition: expected 'top' | 'start' (K25)`)
  return found
}

// ---------------------------------------------------------------------------
// R-strings (A5, K14): user-visible literals only in default*Labels

const NAMING_ATTRIBUTES = new Set(['aria-label', 'aria-roledescription', 'placeholder', 'title'])
/** Props that must not default to English text (K14). */
const CONTENT_PROP = /^(label|placeholder|title|description|surfaceTitle|aria-?[lL]abel|\w+Label)$/
/** Readable words once `{placeholder}` tokens are removed. */
const hasWords = (text: string) => /\p{L}{2}/u.test(text.replace(/\{\w+\}/g, ''))
const COMPARISONS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
])
/** A literal that is compared or used as a key rather than shown. */
const isOperand = (node: ts.Node) =>
  (ts.isBinaryExpression(node.parent) && COMPARISONS.has(node.parent.operatorToken.kind)) ||
  (ts.isElementAccessExpression(node.parent) && node.parent.argumentExpression === node) ||
  ts.isCaseClause(node.parent)

/** Visible text literals inside an expression. */
function literalTexts(node: ts.Node): string[] {
  const texts: string[] = []
  const visit = (child: ts.Node) => {
    if (ts.isStringLiteralLike(child) && !isOperand(child)) texts.push(child.text)
    else if (ts.isTemplateExpression(child))
      texts.push(child.head.text, ...child.templateSpans.map((span) => span.literal.text))
    ts.forEachChild(child, visit)
  }
  visit(node)
  return texts.filter(hasWords)
}

function stringViolations(component: string): string[] {
  const found: string[] = []
  for (const path of modulesOf(component).filter((file) => file.endsWith('.tsx'))) {
    eachNode(path, (node) => {
      if (ts.isJsxText(node) && hasWords(node.text))
        found.push(`${at(node)}: JSX text ${JSON.stringify(node.text.trim())} (A5)`)
      if (ts.isJsxAttribute(node) && NAMING_ATTRIBUTES.has(node.name.getText()) && node.initializer)
        for (const text of literalTexts(node.initializer))
          found.push(`${at(node)}: ${node.name.getText()} ${JSON.stringify(text)} (A5)`)
      if (
        ts.isBindingElement(node) &&
        node.initializer &&
        CONTENT_PROP.test((node.propertyName ?? node.name).getText().replace(/['"]/g, ''))
      )
        for (const text of literalTexts(node.initializer))
          found.push(`${at(node)}: ${node.name.getText()} defaults to ${JSON.stringify(text)} (K14)`)
    })
  }
  return found
}

// ---------------------------------------------------------------------------

/** Components that still violate each rule; only the wave-closing WP edits these, and they only shrink. */
const PENDING = {
  'R-triple': ['Accordion', 'Code', 'Command', 'Menu', 'Modal', 'Navigation', 'Panel', 'Slider', 'Table', 'Toc', 'Tree'],
  'R-names': [
    'Accordion', 'Avatar', 'Code', 'Command', 'Date', 'Menu', 'Modal', 'Navigation', 'Pagination', 'Panel', 'Select',
    'Table', 'Toast', 'Toc', 'Tree',
  ],
  'R-dup': ['Carousel', 'Code', 'Date', 'Markdown', 'Progress', 'Select', 'Toc'],
  'R-label': ['Breadcrumb', 'Modal', 'Select', 'Toast'],
  'R-aria': ['Carousel', 'Media', 'Scroll', 'Table'],
  'R-logical': ['Modal', 'Table', 'Toast', 'Toc'],
  'R-bool': [],
  'R-field': ['Date', 'Input', 'Radio', 'Rating', 'Select', 'Slider'],
  'R-strings': [
    'Breadcrumb', 'Carousel', 'Code', 'Command', 'Date', 'Menu', 'Navigation', 'Panel', 'Scroll', 'Select', 'Toast',
  ],
} satisfies Record<string, readonly string[]>

describeGate('api-conventions R-triple', PENDING['R-triple'], tripleViolations)
describeGate('api-conventions R-names', PENDING['R-names'], nameViolations)
describeGate('api-conventions R-dup', PENDING['R-dup'], duplicateViolations)
describeGate('api-conventions R-label', PENDING['R-label'], labelViolations)
describeGate('api-conventions R-aria', PENDING['R-aria'], ariaViolations)
describeGate('api-conventions R-logical', PENDING['R-logical'], logicalViolations)
describeGate('api-conventions R-bool', PENDING['R-bool'], booleanViolations)
describeGate('api-conventions R-field', PENDING['R-field'], fieldViolations)
describeGate('api-conventions R-strings', PENDING['R-strings'], stringViolations)

