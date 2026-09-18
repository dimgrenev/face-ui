/**
 * Shared plumbing for the RFC §0 governance gates: the 46 registry components,
 * the `FACE_UI_COMPONENT` filter, shrink-only pending sets, the production
 * module graph and the TypeScript view of every component's props.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ComponentType } from 'react'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Absolute path of the package root. */
export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Every component in `component-registry.json`, sorted. */
export const COMPONENTS: readonly string[] = Object.keys(
  JSON.parse(readFileSync(join(repo, 'component-registry.json'), 'utf8'))
    .components,
).sort()

const requested = (process.env.FACE_UI_COMPONENT ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)
const unknown = requested.filter((name) => !COMPONENTS.includes(name))
if (unknown.length)
  throw new Error(`FACE_UI_COMPONENT names unknown components: ${unknown.join(', ')}`)

/** True when `FACE_UI_COMPONENT` narrows the run; checks that are not per component are skipped then. */
export const filtered = requested.length > 0
/** The components this run evaluates: all of them, or those named by `FACE_UI_COMPONENT` (comma-separated). */
export const SELECTED: readonly string[] = filtered ? requested : COMPONENTS

/**
 * Declares one test per unit. A unit outside `pending` must have no
 * violations; a pending unit must still have at least one, so a pending set
 * can only shrink: fixing a unit fails the gate until its entry is removed.
 * `FACE_UI_GATE_REPORT=1` prints every unit's violations.
 */
export function describeGate(
  title: string,
  pending: readonly string[],
  violations: (unit: string) => readonly string[] | Promise<readonly string[]>,
) {
  const waiting = new Set(pending)
  describe(title, () => {
    it('pending set names components once', () => {
      expect(pending.filter((unit) => !COMPONENTS.includes(unit))).toEqual([])
      expect(waiting.size).toBe(pending.length)
    })
    it.each([...SELECTED])('%s', async (unit) => {
      const found = await violations(unit)
      if (process.env.FACE_UI_GATE_REPORT && found.length)
        console.log(`[${title}] ${unit}\n  ${found.join('\n  ')}`)
      if (waiting.has(unit))
        expect(
          found.length,
          `${unit} now passes "${title}": remove it from the pending set`,
        ).toBeGreaterThan(0)
      else expect(found, `${unit} violates "${title}"`).toEqual([])
    })
  })
}

// ---------------------------------------------------------------------------
// Production sources and their import graph

const NOT_SOURCE = new Set([
  'node_modules',
  'dist',
  '__tests__',
  'contracts',
  'scripts',
  'docs',
  'design-system',
  'test-results',
  'playwright-report',
])

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(join(repo, dir))) {
    if (NOT_SOURCE.has(entry) || entry.startsWith('.')) continue
    const path = dir ? posix.join(dir, entry) : entry
    if (statSync(join(repo, path)).isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts') && path !== 'vitest.config.ts')
      out.push(path)
  }
  return out
}

/** Repo-relative paths of every production `.ts`/`.tsx` module. */
export const SOURCES: readonly string[] = walk('', []).sort()
const sourceSet = new Set(SOURCES)

const parsed = new Map<string, ts.SourceFile>()
/** The parsed production module at a repo-relative path. */
function sourceFile(path: string): ts.SourceFile {
  let file = parsed.get(path)
  if (!file) {
    file = ts.createSourceFile(
      path,
      readFileSync(join(repo, path), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    parsed.set(path, file)
  }
  return file
}

/** `file:line` of a node, for violation messages. */
export const at = (node: ts.Node) =>
  `${node.getSourceFile().fileName}:${node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1}`

const imports = new Map<string, readonly string[]>()
/** Production modules a module imports or re-exports (relative specifiers only). */
function importsOf(path: string): readonly string[] {
  let found = imports.get(path)
  if (!found) {
    const { importedFiles } = ts.preProcessFile(sourceFile(path).text, true, true)
    found = importedFiles.flatMap(({ fileName }) => {
      if (!fileName.startsWith('.')) return []
      const base = posix.join(posix.dirname(path), fileName)
      const hit = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(
        (candidate) => sourceSet.has(candidate),
      )
      return hit ? [hit] : []
    })
    imports.set(path, found)
  }
  return found
}

/** Modules reachable from `entries`; `enter(path)` may stop the walk at a module. */
export function reachable(
  entries: readonly string[],
  enter: (path: string) => boolean = () => true,
): Set<string> {
  const seen = new Set<string>()
  const stack = [...entries]
  while (stack.length) {
    const path = stack.pop()!
    if (seen.has(path) || !enter(path)) continue
    seen.add(path)
    stack.push(...importsOf(path))
  }
  return seen
}

/** The component that owns a module: `<Name>/**` belongs to Name. */
export const ownerOf = (path: string) => {
  const top = path.split('/')[0]!
  return COMPONENTS.includes(top) && path.includes('/') ? top : undefined
}

/**
 * The modules that make up a component's own implementation: everything its
 * entry reaches without entering another component's directory. A shared
 * module counts for every component that uses it directly or through other
 * shared modules; a component used by another is judged on its own.
 */
export function modulesOf(name: string): readonly string[] {
  return [
    ...reachable([`${name}/${name}.tsx`], (path) => {
      const owner = ownerOf(path)
      return owner === undefined || owner === name
    }),
  ].sort()
}

/** Calls `visit` for every node of a module. */
export function eachNode(path: string, visit: (node: ts.Node) => void) {
  const walkNode = (node: ts.Node) => {
    visit(node)
    ts.forEachChild(node, walkNode)
  }
  walkNode(sourceFile(path))
}

// ---------------------------------------------------------------------------
// Component props through the TypeScript checker

export interface ComponentProp {
  /** Prop name. */
  name: string
  /** The prop's type in each branch of the props union that declares it. */
  types: readonly ts.Type[]
  /** Declared by Face UI, not inherited from React's DOM attribute types. */
  own: boolean
}

export interface ComponentPart {
  /** `Card`, or `Card.Title` for a compound part. */
  name: string
  props: readonly ComponentProp[]
}

let checkerProgram: ts.Program | undefined
/** The type checker over all 46 components, built once per test file. */
export function checker(): ts.TypeChecker {
  checkerProgram ??= ts.createProgram(
    COMPONENTS.map((name) => join(repo, name, `${name}.tsx`)),
    {
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      resolveJsonModule: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
    },
  )
  return checkerProgram.getTypeChecker()
}

/** Whether a declaration is authored in Face UI rather than a dependency. */
export const isOwn = (declaration: ts.Declaration) =>
  !declaration.getSourceFile().fileName.includes('/node_modules/')

/** The props type a component accepts: its first call parameter. */
function propsTypeOf(type: ts.Type): ts.Type | undefined {
  const parameter = type.getCallSignatures()[0]?.getParameters()[0]
  return parameter && checker().getTypeOfSymbol(parameter)
}

function propsOf(propsType: ts.Type): ComponentProp[] {
  const check = checker()
  const byName = new Map<string, ComponentProp & { types: ts.Type[] }>()
  for (const branch of propsType.isUnion() ? propsType.types : [propsType]) {
    for (const symbol of check.getPropertiesOfType(branch)) {
      const declaration = symbol.declarations?.[0]
      if (!declaration) continue
      const entry = byName.get(symbol.name) ?? { name: symbol.name, types: [], own: isOwn(declaration) }
      entry.types.push(check.getTypeOfSymbol(symbol))
      byName.set(symbol.name, entry)
    }
  }
  return [...byName.values()]
}

const parts = new Map<string, readonly ComponentPart[]>()
/**
 * The props of a component's export, of its compound parts (`Card.Title`)
 * and of the other components its module exports (`ButtonGroup`, `Toaster`).
 */
export function componentParts(name: string): readonly ComponentPart[] {
  let found = parts.get(name)
  if (!found) {
    const check = checker()
    const file = checkerProgram!.getSourceFile(join(repo, name, `${name}.tsx`))
    const module = file && check.getSymbolAtLocation(file)
    const exported = new Map(
      (module ? check.getExportsOfModule(module) : []).map((symbol) => [
        symbol.name,
        symbol.flags & ts.SymbolFlags.Alias ? check.getAliasedSymbol(symbol) : symbol,
      ]),
    )
    const main = exported.get(name)
    if (!main) throw new Error(`${name}/${name}.tsx does not export ${name}`)
    const type = check.getTypeOfSymbol(main)
    const candidates: Array<[string, ts.Type]> = [
      [name, type],
      ...check
        .getPropertiesOfType(type)
        .filter((part) => /^[A-Z]/.test(part.name))
        .map((part): [string, ts.Type] => [`${name}.${part.name}`, check.getTypeOfSymbol(part)]),
      ...[...exported]
        .filter(([exportName, symbol]) => /^[A-Z]/.test(exportName) && symbol.flags & ts.SymbolFlags.Value)
        .map(([exportName, symbol]): [string, ts.Type] => [exportName, check.getTypeOfSymbol(symbol)]),
    ]
    const seen = new Set<ts.Type>()
    found = candidates.flatMap(([partName, partType]) => {
      const propsType = propsTypeOf(partType)
      if (!propsType || seen.has(propsType)) return []
      seen.add(propsType)
      const props = propsOf(propsType)
      return props.length ? [{ name: partName, props }] : []
    })
    parts.set(name, found)
  }
  return found
}

/** A type without `undefined`/`null`, split into its union members. */
export function members(type: ts.Type): ts.Type[] {
  return (type.isUnion() ? type.types : [type]).filter(
    (member) => !(member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)),
  )
}

/** Whether every non-nullish member of a type is callable. */
export const isCallable = (type: ts.Type) => {
  const list = members(type)
  return list.length > 0 && list.every((member) => member.getCallSignatures().length > 0)
}

// ---------------------------------------------------------------------------
// Rendering components

/** `Name: first line of the message` of a thrown value. */
export const errorText = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message.split('\n')[0]}` : String(error)

/** Props as a face document passes them. */
export type Props = Record<string, unknown>

/** A component's export, the props of its two product scenarios (`assets/contracts/scenarios/<Name>.ts`) and its whole module. */
export async function loadComponent(name: string) {
  const [module, scenarios] = await Promise.all([
    import(`../../../${name}/${name}.tsx`) as Promise<Record<string, unknown>>,
    import(`../../contracts/scenarios/${name}.ts`) as Promise<{
      default: ReadonlyArray<{ name: string; props: Props }>
    }>,
  ])
  return {
    Component: module[name] as ComponentType<Props>,
    scenarios: scenarios.default,
    module,
  }
}
