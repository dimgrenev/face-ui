import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  type ImportDeclaration,
  type ImportSpecifier,
  type JsxAttribute,
  type JsxElement,
  type JsxOpeningElement,
  type JsxSelfClosingElement,
  Node,
  Project,
  type SourceFile,
  SyntaxKind,
  ts,
} from 'ts-morph'
import { loadMigrations } from './generate-migration'
import type { Migration, MigrationTransform } from './migrations/types'

/** `dry-run` reports, `write` applies automatic fixes, `check` reports and fails while usages remain. */
export type MigrateMode = 'dry-run' | 'write' | 'check'

/** One usage of an API listed in the migrations. */
export interface Finding {
  /** Absolute path of the file. */
  file: string
  /** Line number in TSX, JSON pointer in JSON. */
  at: string
  /** The row the usage matches. */
  migration: Migration
  /** `auto`: fixed by `--write`; `manual`: needs a person. */
  fix: 'auto' | 'manual'
  /** Why a usage of an automatic row still needs a person. */
  reason?: string
}

/** What a run found. */
export interface MigrateResult {
  /** Usages in file order; with `write`, the automatic ones are already fixed. */
  findings: Finding[]
  /** Files the automatic rows rewrite, saved only in `write` mode. */
  changed: string[]
  /** Number of source and JSON files scanned. */
  scanned: number
}

/** Options for {@link migrate}. */
export interface MigrateOptions {
  /** Files or directories to scan; directories honour .gitignore inside a git work tree. */
  paths: string[]
  /** Defaults to `dry-run`. */
  mode?: MigrateMode
  /** Rows to apply; defaults to `scripts/migrations/*.ts`. */
  migrations?: Migration[]
  /** Paths to skip in addition to ignored files and nested Face UI snapshots. */
  exclude?: string[]
}

type Value = { literal: string | number | boolean | null } | { code: string; raw?: unknown }
type Report = (fix: Finding['fix'], reason?: string) => void
type Found = (row: Migration, fix: Finding['fix'], reason?: string) => void

/** A component usage whose props the rows read and rewrite: a JSX element or a JSON node. */
interface Usage {
  component: string
  at: string
  /** Whether an expression can be written, which only TSX allows. */
  code: boolean
  has(prop: string): boolean
  get(prop: string): Value | undefined
  set(prop: string, value: Value): void
  remove(prop: string): void
  rename(from: string, to: string): void
  hasItemField(prop: string, field: string): boolean
  hasChildren(): boolean
  setChildren(value: Value): void
  mergeLabel(key: string, value: Value): string | undefined
  retag(component: string): void
}

const PACKAGE = '@userface/face-ui-react'
// @userface/app-ui/<Name> re-exports the Face UI component of the same name.
const APP_UI = /^@userface\/app-ui\/([A-Z]\w*)(?:\/\1)?$/
const ITEM_FIELD = /^(\w+)\[\]\.(\w+)$/
const SKIPPED = new Set(['node_modules', 'dist', 'build', 'coverage', 'out'])
const COMPOUND_EXPORTS: Record<string, string> = { BarSection: 'Bar.Section' }

const isPart = (name: string) => !name.includes('#') && name.includes('.')
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const rawOf = (value: Value) => ('literal' in value ? value.literal : value.raw)

/** JavaScript source of a value. */
function source(value: Value): string {
  if (!('literal' in value)) return value.code
  const { literal } = value
  return typeof literal === 'string' && !/['\\\n]/.test(literal) ? `'${literal}'` : JSON.stringify(literal)
}
/** The same, safe as an operand. */
const js = (value: Value | undefined) =>
  !value ? 'undefined' : 'literal' in value ? source(value) : `(${value.code})`

/** Parses the JSX attributes of a `values` replacement such as `iconOnly fullWidth={false}`. */
function parseAttributes(text: string): Map<string, Value> {
  const attributes = new Map<string, Value>()
  for (const [, name, string, expression] of text.matchAll(/([\w-]+)(?:="([^"]*)"|=\{([^}]*)\})?/g))
    attributes.set(
      name,
      string !== undefined
        ? { literal: string }
        : expression !== undefined
          ? { literal: JSON.parse(expression) as string | number | boolean | null }
          : { literal: true },
    )
  return attributes
}

const same = (a: Value | undefined, b: Value) =>
  !!a && 'literal' in a && 'literal' in b && a.literal === b.literal

/** Replaces a removed prop by the attributes its value maps to; returns why it could not. */
function replaceByValue(usage: Usage, prop: string, values: Record<string, string>): string | undefined {
  const value = usage.get(prop)!
  if ('literal' in value) {
    const replacement = values[String(value.literal)]
    if (replacement === undefined) return `no rule for ${JSON.stringify(value.literal)}`
    const attributes = parseAttributes(replacement)
    for (const [name, next] of attributes)
      if (usage.has(name) && !same(usage.get(name), next)) return `${name} is already set`
    usage.remove(prop)
    for (const [name, next] of attributes) if (!usage.has(name)) usage.set(name, next)
    return undefined
  }
  const whenTrue = parseAttributes(values.true ?? '')
  const whenFalse = parseAttributes(values.false ?? '')
  const names = new Set([...whenTrue.keys(), ...whenFalse.keys()])
  if (!usage.code || names.size > 1 || Object.keys(values).some((key) => key !== 'true' && key !== 'false'))
    return 'the value is computed'
  const [name] = names
  if (name && usage.has(name)) return `${name} is already set`
  usage.remove(prop)
  if (name) usage.set(name, { code: `${js(value)} ? ${js(whenTrue.get(name))} : ${js(whenFalse.get(name))}` })
  return undefined
}

const NON_FINITE = /^-?(Infinity|NaN|Number\.(POSITIVE_INFINITY|NEGATIVE_INFINITY|NaN))$/

// Rewrites for rows whose new value depends on more than one prop or on a range of values.
// Each returns why it could not migrate.
const transforms: Record<MigrationTransform, (usage: Usage) => string | undefined> = {
  'button-chevron'(usage) {
    const shown = usage.get('selector') ?? { literal: false }
    const side = usage.get('selectorDirection') ?? { literal: 'vertical' }
    if ((!('literal' in shown) || !('literal' in side)) && !usage.code) return 'the value is computed'
    if (!usage.has('chevron') && !('literal' in shown && !shown.literal)) {
      const direction: Value =
        'literal' in side
          ? { literal: side.literal === 'side' ? 'end' : 'down' }
          : { code: `${js(side)} === 'side' ? 'end' : 'down'` }
      usage.set('chevron', 'literal' in shown ? direction : { code: `${js(shown)} ? ${js(direction)} : undefined` })
    }
    usage.remove('selector')
    usage.remove('selectorDirection')
    return undefined
  },
  'switcher-label'(usage) {
    const text = usage.get('text')
    const shown = usage.get('withText') ?? { literal: true }
    if (text && !usage.has('label') && !('literal' in shown && !shown.literal)) {
      if ('literal' in shown) usage.set('label', text)
      else if (!usage.code) return 'the value is computed'
      else usage.set('label', { code: `${js(shown)} ? ${js(text)} : undefined` })
    }
    usage.remove('text')
    usage.remove('withText')
    return undefined
  },
  // The old check `collapseAfter >= 3` coerced the value, and anything else never collapsed:
  // `maxItems` spells that `null`.
  'breadcrumb-max-items'(usage) {
    const value = usage.get('collapseAfter')!
    if (!('literal' in value) && !NON_FINITE.test(value.code)) return 'the value is computed'
    if (usage.has('maxItems')) return 'maxItems is already set'
    const count = 'literal' in value ? Number(value.literal) : Infinity
    const next = count >= 3 && count <= Number.MAX_SAFE_INTEGER ? Math.floor(count) : null
    usage.rename('collapseAfter', 'maxItems')
    if (!('literal' in value) || next !== value.literal) usage.set('maxItems', { literal: next })
    return undefined
  },
}

/** The prop a row reads, if it names one. */
const propOf = (row: Migration) =>
  row.kind === 'rename-prop' || row.kind === 'move-to-labels' || row.kind === 'text-to-children'
    ? row.from
    : 'prop' in row
      ? row.prop
      : undefined

function applyRow(usage: Usage, row: Migration, report: Report) {
  switch (row.kind) {
    case 'rename-prop':
      if (!usage.has(row.from)) return
      if (row.codemod === 'manual') return report('manual')
      if (usage.has(row.to)) return report('manual', `${row.to} is already set`)
      usage.rename(row.from, row.to)
      return report('auto')
    case 'remove-prop': {
      const item = ITEM_FIELD.exec(row.prop)
      if (item) return usage.hasItemField(item[1], item[2]) ? report('manual') : undefined
      if (!usage.has(row.prop)) return
      if (row.codemod === 'manual') return report('manual')
      const reason = row.values ? replaceByValue(usage, row.prop, row.values) : void usage.remove(row.prop)
      return report(reason ? 'manual' : 'auto', reason)
    }
    case 'rename-value': {
      const value = usage.get(row.prop)
      if (!value) return
      if (!('literal' in value)) {
        const quoted = Object.keys(row.values).some((old) => ["'", '"', '`'].some((q) => value.code.includes(q + old + q)))
        return quoted ? report('manual', 'the value is computed') : undefined
      }
      const next = row.values[String(value.literal)]
      if (next === undefined) return
      usage.set(row.prop, { literal: next })
      return report('auto')
    }
    case 'retype-prop': {
      const value = usage.get(row.prop)
      const text = value && ('literal' in value ? String(value.literal) : value.code)
      return text !== undefined && row.legacy && new RegExp(row.legacy).test(text) ? report('manual') : undefined
    }
    case 'move-to-labels': {
      if (!usage.has(row.from)) return
      const reason = usage.mergeLabel(row.key, usage.get(row.from)!)
      if (!reason) usage.remove(row.from)
      return report(reason ? 'manual' : 'auto', reason)
    }
    case 'text-to-children': {
      if (!usage.has(row.from)) return
      if (usage.hasChildren()) return report('manual', 'children are already set')
      const value = usage.get(row.from)!
      usage.remove(row.from)
      usage.setChildren(value)
      return report('auto')
    }
  }
}

/** Applies the part renames and prop rows that match one usage. */
function applyRows(usage: Usage, rows: Migration[], found: Found) {
  const part = rows.find((row) => row.kind === 'export' && row.from === usage.component)
  if (part?.kind === 'export') {
    if (part.codemod === 'manual' || !part.to) return found(part, 'manual')
    const [component, ...attributes] = part.to.split(' ')
    usage.retag(component)
    for (const [name, value] of parseAttributes(attributes.join(' '))) if (!usage.has(name)) usage.set(name, value)
    found(part, 'auto')
  }
  const own = rows.filter((row) => row.kind !== 'export' && row.kind !== 'behavior' && row.component === usage.component)
  const applied = new Set<MigrationTransform>()
  for (const row of own) {
    const transform = 'transform' in row ? row.transform : undefined
    if (!transform) {
      applyRow(usage, row, (fix, reason) => found(row, fix, reason))
      continue
    }
    if (applied.has(transform)) continue
    applied.add(transform)
    const joint = own.filter((other) => 'transform' in other && other.transform === transform && usage.has(propOf(other)!))
    const reason = joint.length ? transforms[transform](usage) : undefined
    for (const other of joint) found(other, reason ? 'manual' : 'auto', reason)
  }
}

// ---------------------------------------------------------------------------
// TSX
// ---------------------------------------------------------------------------

type JsxTag = JsxOpeningElement | JsxSelfClosingElement

/** Replaces a node's text as given; ts-morph would otherwise re-indent every line after the first. */
function replaceVerbatim(node: Node, text: string) {
  return node.replaceWithText((writer) => {
    writer.queueIndentationLevel(0)
    writer.write(text)
  })
}

/** The whitespace that starts the line a node starts on. */
function lineIndent(node: Node) {
  const text = node.getSourceFile().getFullText()
  return /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', node.getStart()) + 1))![0]
}

function jsxValue(attribute: JsxAttribute): Value {
  const initializer = attribute.getInitializer()
  if (!initializer) return { literal: true }
  if (Node.isStringLiteral(initializer)) return { literal: initializer.getLiteralValue() }
  const expression = Node.isJsxExpression(initializer) ? initializer.getExpression() : initializer
  if (!expression) return { code: 'undefined' }
  if (Node.isStringLiteral(expression) || Node.isNoSubstitutionTemplateLiteral(expression))
    return { literal: expression.getLiteralValue() }
  if (Node.isNumericLiteral(expression)) return { literal: expression.getLiteralValue() }
  if (
    Node.isPrefixUnaryExpression(expression) &&
    expression.getOperatorToken() === SyntaxKind.MinusToken &&
    Node.isNumericLiteral(expression.getOperand())
  )
    return { literal: -Number(expression.getOperand().getText()) }
  if (Node.isTrueLiteral(expression) || Node.isFalseLiteral(expression))
    return { literal: expression.getLiteralValue() }
  if (Node.isNullLiteral(expression)) return { literal: null }
  return { code: expression.getText() }
}

function jsxInitializer(value: Value): string | undefined {
  if (!('literal' in value)) return `{${value.code}}`
  const { literal } = value
  if (literal === true) return undefined
  return typeof literal === 'string' && !/["\\\n]/.test(literal) ? `"${literal}"` : `{${JSON.stringify(literal)}}`
}

class JsxUsage implements Usage {
  readonly code = true
  constructor(
    public element: JsxTag,
    public component: string,
  ) {}
  get at() {
    return String(this.element.getStartLineNumber())
  }
  private attribute(name: string) {
    return this.element
      .getAttributes()
      .find((node): node is JsxAttribute => Node.isJsxAttribute(node) && node.getNameNode().getText() === name)
  }
  private body() {
    const parent = this.element.getParent()
    return Node.isJsxOpeningElement(this.element) && Node.isJsxElement(parent) ? parent : undefined
  }
  has(prop: string) {
    return !!this.attribute(prop) || (prop === 'children' && this.hasChildren())
  }
  get(prop: string) {
    const attribute = this.attribute(prop)
    return attribute && jsxValue(attribute)
  }
  set(prop: string, value: Value) {
    const initializer = jsxInitializer(value)
    const attribute = this.attribute(prop)
    if (!attribute) this.element.addAttribute({ name: prop, initializer })
    else if (initializer === undefined) attribute.removeInitializer()
    else attribute.setInitializer(initializer)
  }
  remove(prop: string) {
    this.attribute(prop)?.remove()
  }
  rename(from: string, to: string) {
    this.attribute(from)?.setName(to)
  }
  hasItemField(prop: string, field: string) {
    const initializer = this.attribute(prop)?.getInitializer()
    const list = Node.isJsxExpression(initializer) ? initializer.getExpression() : undefined
    return (
      Node.isArrayLiteralExpression(list) &&
      list.getElements().some((item) => Node.isObjectLiteralExpression(item) && !!item.getProperty(field))
    )
  }
  hasChildren() {
    return !!this.body()?.getJsxChildren().some((child) => !Node.isJsxText(child) || child.getText().trim() !== '')
  }
  setChildren(value: Value) {
    const plain = 'literal' in value && typeof value.literal === 'string' ? value.literal : undefined
    const text =
      plain !== undefined && /^[^{}<>&\n]+$/.test(plain) && plain.trim() === plain
        ? plain
        : `{${'literal' in value ? JSON.stringify(value.literal) : value.code}}`
    const body = this.body()
    if (body) return void body.setBodyTextInline(text)
    const tag = this.element.getTagNameNode().getText()
    const element = replaceVerbatim(
      this.element,
      this.element.getText().replace(/\s*\/>$/, `>${text}</${tag}>`),
    ) as JsxElement
    this.element = element.getOpeningElement()
  }
  mergeLabel(key: string, value: Value) {
    const initializer = source(value)
    const labels = this.attribute('labels')
    if (!labels) return void this.set('labels', { code: `{ ${key}: ${initializer} }` })
    const current = labels.getInitializer()
    const expression = Node.isJsxExpression(current) ? current.getExpression() : undefined
    if (!expression) return 'labels is not an expression'
    if (Node.isObjectLiteralExpression(expression)) {
      if (expression.getProperty(key)) return `labels.${key} is already set`
      const last = expression.getProperties().at(-1)
      if (!last) return void expression.replaceWithText(`{ ${key}: ${initializer} }`)
      // Append after the last entry in the object's own layout, keeping a trailing comma.
      const text = expression.getText()
      const entry = `${text.includes('\n') ? `\n${lineIndent(last)}` : ' '}${key}: ${initializer}`
      const end = last.getEnd() - expression.getStart()
      const comma = /^\s*,/.exec(text.slice(end))?.[0]
      replaceVerbatim(
        expression,
        comma
          ? `${text.slice(0, end + comma.length)}${entry},${text.slice(end + comma.length)}`
          : `${text.slice(0, end)},${entry}${text.slice(end)}`,
      )
      return undefined
    }
    this.set('labels', { code: `{ ...${expression.getText()}, ${key}: ${initializer} }` })
    return undefined
  }
  retag(component: string) {
    const part = component.split('.').pop()!
    const rename = (node: Node) => node.replaceWithText(node.getText().replace(/[^.]+$/, part))
    rename(this.element.getTagNameNode())
    const closing = this.body()?.getClosingElement()
    if (closing) rename(closing.getTagNameNode())
    this.component = component
  }
}

const faceRoots = new Map<string, boolean>()
/** Whether a directory is a Face UI package root: its own source tree or a synced snapshot. */
function isFaceRoot(directory: string) {
  let result = faceRoots.get(directory)
  if (result === undefined) {
    result =
      existsSync(path.join(directory, 'component-registry.json')) &&
      existsSync(path.join(directory, 'face-ui-react.json'))
    faceRoots.set(directory, result)
  }
  return result
}
function faceRootOf(target: string) {
  for (let directory = target; ; directory = path.dirname(directory)) {
    if (isFaceRoot(directory)) return directory
    if (path.dirname(directory) === directory) return undefined
  }
}

/** The Face UI module an import specifier names, relative to the package root, or undefined. */
function faceModule(specifier: string, file: string): string | undefined {
  if (specifier === PACKAGE) return ''
  if (specifier.startsWith(`${PACKAGE}/`)) return specifier.slice(PACKAGE.length + 1)
  const appUi = APP_UI.exec(specifier)
  if (appUi) return appUi[1]
  if (!specifier.startsWith('.')) return undefined
  const target = path.resolve(path.dirname(file), specifier)
  const root = faceRootOf(target)
  return root === undefined ? undefined : path.relative(root, target).split(path.sep).join('/')
}
const normalizeModule = (module: string) =>
  module.replace(/(^|\/)index$/, '').replace(/^([A-Z]\w*)$/, '$1/$1')

function exportRow(rows: Migration[], module: string, name: string) {
  return rows.find((row) => {
    if (row.kind !== 'export' || isPart(row.from)) return false
    const [from, exported] = row.from.includes('#') ? row.from.split('#') : [undefined, row.from]
    return exported === name && (from === undefined || normalizeModule(from) === normalizeModule(module))
  })
}

/** Rewrites one import of a removed export; returns why it could not. */
function moveImport(declaration: ImportDeclaration, specifier: ImportSpecifier, to: string): string | undefined {
  const [target, name] = to.includes('#') ? to.split('#') : [undefined, to]
  const rename = () => {
    if (name === specifier.getName()) return
    const node = specifier.getNameNode()
    if (specifier.getAliasNode() || !Node.isIdentifier(node)) specifier.setName(name)
    else node.rename(name)
  }
  if (target === undefined) return void rename()
  const current = declaration.getModuleSpecifierValue()
  let moved: string
  if (current.startsWith(PACKAGE)) moved = `${PACKAGE}/${target}`
  else if (current.startsWith('.')) {
    const directory = path.dirname(declaration.getSourceFile().getFilePath())
    const root = faceRootOf(path.resolve(directory, current))!
    moved = path.relative(directory, path.join(root, target)).split(path.sep).join('/')
    if (!moved.startsWith('.')) moved = `./${moved}`
  } else return `cannot rewrite ${current}`
  const source = declaration.getSourceFile()
  const alias = specifier.getAliasNode()?.getText() ?? (name === specifier.getName() ? undefined : specifier.getName())
  const typeOnly = declaration.isTypeOnly()
  // Join an import of the target module, so no file imports one module twice.
  const existing = source.getImportDeclaration(
    (other) =>
      other !== declaration &&
      other.getModuleSpecifierValue() === moved &&
      !other.getNamespaceImport() &&
      (typeOnly || !other.isTypeOnly()),
  )
  if (existing) {
    // Imports are rewritten last to first, so inserting in front keeps their order.
    existing.insertNamedImport(0, { name, alias, isTypeOnly: (typeOnly && !existing.isTypeOnly()) || specifier.isTypeOnly() })
    if (declaration.getNamedImports().length > 1 || declaration.getDefaultImport()) specifier.remove()
    else declaration.remove()
    return undefined
  }
  if (declaration.getNamedImports().length === 1 && !declaration.getDefaultImport()) {
    declaration.setModuleSpecifier(moved)
    return void rename()
  }
  declaration.getProject().manipulationSettings.set({ quoteKind: declaration.getModuleSpecifier().getQuoteKind() })
  // Above the original, since ts-morph separates an import from a following statement with a blank line.
  const created = source.insertImportDeclaration(declaration.getChildIndex(), {
    moduleSpecifier: moved,
    namedImports: [{ name, alias, isTypeOnly: specifier.isTypeOnly() }],
    isTypeOnly: typeOnly,
  })
  // ts-morph ends the statement with a semicolon; follow the file instead.
  if (!declaration.getText().endsWith(';')) replaceVerbatim(created, created.getText().replace(/;$/, ''))
  specifier.remove()
  return undefined
}

function migrateTsx(source: SourceFile, rows: Migration[], found: (row: Migration, at: string, fix: Finding['fix'], reason?: string) => void) {
  const file = source.getFilePath()
  // Face UI's own negative type tests keep their removed props; consumers get no such exemption.
  const expected = new Set<number>()
  if (faceRootOf(path.dirname(file)))
    source
      .getFullText()
      .split('\n')
      .forEach((line, index) => line.includes('@ts-expect-error') && expected.add(index + 2))
  const components = new Map<string, string>()
  const namespaces = new Set<string>()
  const imports: (() => void)[] = []
  for (const declaration of source.getImportDeclarations()) {
    const module = faceModule(declaration.getModuleSpecifierValue(), file)
    if (module === undefined) continue
    const namespace = declaration.getNamespaceImport()?.getText()
    if (namespace) namespaces.add(namespace)
    const main = /^([A-Z]\w*)(?:\/\1)?$/.exec(module)?.[1]
    const fallback = declaration.getDefaultImport()?.getText()
    if (main && fallback) components.set(fallback, main)
    for (const specifier of declaration.getNamedImports()) {
      const name = specifier.getName()
      components.set(specifier.getAliasNode()?.getText() ?? name, COMPOUND_EXPORTS[name] ?? name)
      const row = exportRow(rows, module, name)
      const line = specifier.getStartLineNumber()
      if (row?.kind !== 'export' || expected.has(line)) continue
      if (row.codemod === 'manual' || !row.to) found(row, String(line), 'manual')
      else
        imports.push(() => {
          const reason = moveImport(declaration, specifier, row.to!)
          found(row, String(line), reason ? 'manual' : 'auto', reason)
        })
    }
  }
  // Elements go last to first and imports after them, so no rewrite moves a node still to be visited.
  const elements = [
    ...source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...source.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ].sort((a, b) => b.getStart() - a.getStart())
  for (const element of components.size || namespaces.size ? elements : []) {
    const [head, ...rest] = element.getTagNameNode().getText().split('.')
    const component = namespaces.has(head)
      ? rest.join('.')
      : components.has(head)
        ? [components.get(head), ...rest].join('.')
        : undefined
    if (!component) continue
    const lines = [element, ...element.getAttributes()].map((node) => node.getStartLineNumber())
    if (lines.some((line) => expected.has(line))) continue
    const usage = new JsxUsage(element, component)
    applyRows(usage, rows, (row, fix, reason) => found(row, usage.at, fix, reason))
  }
  for (const rewrite of imports.reverse()) rewrite()
}

// ---------------------------------------------------------------------------
// JSON: descriptors `{ "__componentName__": … }` and face nodes `{ "type", "props" }`
// ---------------------------------------------------------------------------

class JsonUsage implements Usage {
  readonly code = false
  constructor(
    private props: Record<string, unknown>,
    public component: string,
    public at: string,
    private node?: Record<string, unknown>,
    private nameKey?: string,
  ) {}
  private childNodes() {
    return this.node && this.node !== this.props && Array.isArray(this.node.children) ? this.node.children : []
  }
  has(prop: string) {
    return Object.hasOwn(this.props, prop) || (prop === 'children' && this.hasChildren())
  }
  get(prop: string): Value | undefined {
    const value = this.props[prop]
    if (value === undefined) return undefined
    return typeof value === 'object' && value !== null
      ? { code: JSON.stringify(value), raw: value }
      : { literal: value as string | number | boolean }
  }
  set(prop: string, value: Value) {
    this.props[prop] = rawOf(value)
  }
  remove(prop: string) {
    delete this.props[prop]
  }
  rename(from: string, to: string) {
    const entries = Object.entries(this.props)
    for (const [key] of entries) delete this.props[key]
    for (const [key, value] of entries) this.props[key === from ? to : key] = value
  }
  hasItemField(prop: string, field: string) {
    const list = this.props[prop]
    return Array.isArray(list) && list.some((item) => isObject(item) && Object.hasOwn(item, field))
  }
  hasChildren() {
    const children = this.props.children
    return (children !== undefined && children !== null && children !== '') || this.childNodes().length > 0
  }
  setChildren(value: Value) {
    this.props.children = rawOf(value)
  }
  mergeLabel(key: string, value: Value) {
    const labels = this.props.labels
    if (labels === undefined) this.props.labels = { [key]: rawOf(value) }
    else if (!isObject(labels) || '$ref' in labels) return 'labels is bound'
    else if (Object.hasOwn(labels, key)) return `labels.${key} is already set`
    else labels[key] = rawOf(value)
    return undefined
  }
  retag(component: string) {
    if (this.node && this.nameKey) this.node[this.nameKey] = component
    this.component = component
  }
}

function jsonUsages(document: unknown): JsonUsage[] {
  const usages: JsonUsage[] = []
  const walk = (value: unknown, pointer: string) => {
    if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${pointer}/${index}`))
    if (!isObject(value)) return
    if (typeof value.__componentName__ === 'string')
      usages.push(new JsonUsage(value, value.__componentName__, pointer || '/', value, '__componentName__'))
    else if (typeof value.type === 'string' && isObject(value.props))
      usages.push(new JsonUsage(value.props, value.type, pointer || '/', value, 'type'))
    for (const [key, child] of Object.entries(value))
      walk(child, `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`)
  }
  walk(document, '')
  if (!isObject(document)) return usages
  // A face document keeps the root component's current prop values beside the tree.
  if (document.schema === 'face' && isObject(document.root) && isObject(document.currentState)) {
    const { type } = document.root
    const { props } = document.currentState
    if (typeof type === 'string' && isObject(props)) usages.push(new JsonUsage(props, type, '/currentState/props'))
  }
  // A component contract lists example prop values per state.
  const { name, states } = document
  if (typeof name === 'string' && !isObject(document.root) && Array.isArray(states))
    states.forEach((state, index) => {
      if (isObject(state) && isObject(state.props))
        usages.push(new JsonUsage(state.props, name, `/states/${index}/props`))
    })
  return usages
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const SOURCE = /\.(tsx?|json)$/
const inside = (file: string, directory: string) => file === directory || file.startsWith(`${directory}${path.sep}`)

function listFiles(root: string): string[] {
  if (statSync(root).isFile()) return [root]
  let files: string[] = []
  try {
    files = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\0')
      .filter(Boolean)
      .map((file) => path.join(root, file))
  } catch {}
  if (!files.length) {
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || SKIPPED.has(entry.name)) continue
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) visit(entryPath)
        else if (entry.isFile()) files.push(entryPath)
      }
    }
    visit(root)
  }
  return files.filter((file) => {
    if (!SOURCE.test(file) || file.endsWith('.d.ts') || !existsSync(file)) return false
    // Synced Face UI snapshots are regenerated from the package, never migrated in place.
    for (let directory = path.dirname(file); directory !== root; directory = path.dirname(directory))
      if (isFaceRoot(directory)) return false
    return true
  })
}

/** Scans the paths for usages of migrated APIs and, in `write` mode, applies the automatic rows. */
export async function migrate(options: MigrateOptions): Promise<MigrateResult> {
  const mode = options.mode ?? 'dry-run'
  const rows = options.migrations ?? (await loadMigrations())
  const exclude = (options.exclude ?? []).map((entry) => path.resolve(entry))
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve },
  })
  const findings: Finding[] = []
  const changed: string[] = []
  const files = [...new Set(options.paths.flatMap((entry) => listFiles(path.resolve(entry))))]
    .filter((file) => !exclude.some((directory) => inside(file, directory)))
    .sort()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const local: Finding[] = []
    const found = (row: Migration, at: string, fix: Finding['fix'], reason?: string) =>
      local.push({ file, at, migration: row, fix, ...(reason ? { reason } : {}) })
    let next = text
    if (file.endsWith('.json')) {
      if (!text.includes('__componentName__') && !text.includes('"props"')) continue
      let document: unknown
      try {
        document = JSON.parse(text)
      } catch {
        continue
      }
      for (const usage of jsonUsages(document))
        applyRows(usage, rows, (row, fix, reason) => found(row, usage.at, fix, reason))
      // Keep the file's indentation, or none for a single-line document.
      const indent = text.trim().includes('\n') ? (/^([ \t]+)"/m.exec(text)?.[1] ?? '  ') : undefined
      if (JSON.stringify(document) !== JSON.stringify(JSON.parse(text)))
        next = JSON.stringify(document, null, indent) + (text.endsWith('\n') ? '\n' : '')
    } else {
      if (!faceRootOf(path.dirname(file)) && !/@userface\/(face-ui-react|app-ui\/)|face-ui/.test(text)) continue
      const source = project.createSourceFile(file, text, { overwrite: true })
      migrateTsx(source, rows, found)
      next = source.getFullText()
      project.removeSourceFile(source)
      // Elements are visited last to first so rewrites never invalidate pending nodes.
      local.sort((a, b) => Number(a.at) - Number(b.at))
    }
    findings.push(...local)
    if (next === text) continue
    changed.push(file)
    if (mode === 'write') writeFileSync(file, next)
  }
  return { findings, changed, scanned: files.length }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/** A one-line description of a row for reports. */
function describeMigration(row: Migration): string {
  switch (row.kind) {
    case 'rename-prop':
      return `${row.component} ${row.from} → ${row.to}`
    case 'remove-prop':
      return `${row.component} ${row.prop} removed`
    case 'rename-value':
      return `${row.component} ${row.prop} values`
    case 'move-to-labels':
      return `${row.component} ${row.from} → labels.${row.key}`
    case 'text-to-children':
      return `${row.component} ${row.from} → children`
    case 'retype-prop':
      return `${row.component} ${row.prop} type`
    case 'export':
      return `${row.from} ${row.codemod === 'auto' && row.to ? `→ ${row.to}` : 'removed'}`
    case 'behavior':
      return `${row.component} behavior`
  }
}

async function main(argv: string[]) {
  const paths: string[] = []
  const exclude: string[] = []
  let mode: MigrateMode = 'dry-run'
  let migrations: Migration[] | undefined
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--write') mode = 'write'
    else if (argument === '--check') mode = 'check'
    else if (argument === '--exclude') exclude.push(argv[++index])
    else if (argument === '--migrations')
      migrations = (JSON.parse(readFileSync(argv[++index], 'utf8')) as { migrations: Migration[] }).migrations
    else if (argument.startsWith('--')) throw new Error(`Unknown option ${argument}`)
    else paths.push(argument)
  }
  if (!paths.length)
    throw new Error('Usage: pnpm migrate [--write | --check] [--exclude <path>] [--migrations <migrations.json>] <paths…>')
  const { findings, changed, scanned } = await migrate({ paths, mode, migrations, exclude })
  const shown = (file: string) => (inside(file, process.cwd()) ? path.relative(process.cwd(), file) : file)
  for (const finding of findings) {
    const note = finding.reason ? `manual: ${finding.reason}` : finding.fix
    console.log(`${shown(finding.file)}:${finding.at}  ${describeMigration(finding.migration)}  [${note}]`)
  }
  const counts = new Map<string, number>()
  for (const finding of findings) {
    const key = `${describeMigration(finding.migration)} [${finding.fix}]`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  if (counts.size) console.log('\nBy row:')
  for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)))
    console.log(`${String(count).padStart(6)}  ${key}`)
  const manual = findings.filter((finding) => finding.fix === 'manual').length
  const files = new Set(findings.map((finding) => finding.file)).size
  console.log(
    `${findings.length ? '\n' : ''}${findings.length} usages in ${files} of ${scanned} files: ` +
      `${findings.length - manual} automatic, ${manual} manual.` +
      (mode === 'write'
        ? ` Updated ${changed.length} files.`
        : mode === 'dry-run' && changed.length
          ? ` Run with --write to update ${changed.length} files.`
          : ''),
  )
  if (mode === 'check' && findings.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2))
