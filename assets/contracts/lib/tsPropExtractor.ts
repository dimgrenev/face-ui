import ts from 'typescript'

export type ExtractedProp = {
  name: string
  type: string
  required: boolean
  options?: Array<string | number | boolean>
  defaultValue?: unknown
  description?: string
  /** Distinct JSDoc texts ('' for none) of union branches that disagree. */
  docConflict?: string[]
}

/** One authored source file and the resolver for its relative imports. */
export type SourceBundle = {
  fileName: string
  code: string
  /** Resolve authored local types; platform declarations stay outside the editor. */
  resolveImport?: (specifier: string) => SourceBundle | undefined
}

/** Preserve authored order; checker union order depends on which library types
 * TypeScript interns first and must not affect generated controls. */
export function getPropOptions(
  authored: ExtractedProp['options'],
  enriched: ExtractedProp['options'],
): ExtractedProp['options'] {
  return (
    authored ??
    enriched?.slice().sort((left, right) => {
      const a = `${typeof left}:${left}`,
        b = `${typeof right}:${right}`
      return a < b ? -1 : a > b ? 1 : 0
    })
  )
}

/** A declaration's JSDoc on one line without tags; undefined when absent. */
function readDoc(node: ts.Node): string | undefined {
  const text = ts
    .getJSDocCommentsAndTags(node)
    .filter(ts.isJSDoc)
    .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || undefined
}

function parse({ fileName, code }: SourceBundle): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
}

/** The component a file is named after: `Tile.tsx` exports `Tile`. */
function componentNameOf(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')
}

/** Top-level functions and variables by name. */
function topLevelBindings(source: ts.SourceFile) {
  const bindings = new Map<
    string,
    ts.FunctionDeclaration | ts.VariableDeclaration
  >()
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name)
      bindings.set(statement.name.text, statement)
    if (ts.isVariableStatement(statement)) {
      for (const variable of statement.declarationList.declarations) {
        if (ts.isIdentifier(variable.name))
          bindings.set(variable.name.text, variable)
      }
    }
  }
  return bindings
}

/** Read the JSDoc of the component declaration a file exports under its own
 * name, following `export { Name } from './local'` to the declaring file. */
export function extractComponentDescription(
  bundle: SourceBundle,
  componentName = componentNameOf(bundle.fileName),
): string | undefined {
  const source = parse(bundle)
  const declaration = topLevelBindings(source).get(componentName)
  if (declaration) return readDoc(declaration)
  for (const statement of source.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    )
      continue
    const specifier = statement.exportClause.elements.find(
      (element) => element.name.text === componentName,
    )
    // An alias documented at its export (a compat name) keeps its own description.
    const own = specifier && readDoc(specifier)
    if (own) return own
    const target =
      specifier && bundle.resolveImport?.(statement.moduleSpecifier.text)
    if (target)
      return extractComponentDescription(
        target,
        (specifier.propertyName ?? specifier.name).text,
      )
  }
  return undefined
}

/** Read the authored TypeScript contract without interpreting comments as code. */
export function extractReactTsPropsFromSource(
  { fileName, code, resolveImport }: SourceBundle,
  interfaceName?: string,
  visited = new Set<string>(),
): ExtractedProp[] {
  const identity = `${fileName}#${interfaceName ?? ''}`
  if (visited.has(identity)) return []
  const nextVisited = new Set([...visited, identity])
  const source = parse({ fileName, code })
  const declarations = source.statements.filter(
    (node): node is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node),
  )
  const declaration = interfaceName
    ? declarations.find((node) => node.name.text === interfaceName)
    : ([...declarations]
        .reverse()
        .find((node) => /Props$/i.test(node.name.text)) ??
      [...declarations].reverse().find((node) => /Props/i.test(node.name.text)))
  if (!declaration) return []

  const aliases = new Map(
    declarations
      .filter(ts.isTypeAliasDeclaration)
      .map((node) => [node.name.text, node.type]),
  )
  const enums = new Map(
    source.statements
      .filter(ts.isEnumDeclaration)
      .map((node) => [node.name.text, node]),
  )
  const named = new Map(declarations.map((node) => [node.name.text, node]))
  const imports = new Map<string, { specifier: string; name: string }>()
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const binding of bindings.elements)
      imports.set(binding.name.text, {
        specifier: statement.moduleSpecifier.text,
        name: (binding.propertyName ?? binding.name).text,
      })
  }
  function imported(name: string): ExtractedProp[] {
    const entry = imports.get(name)
    const bundle = entry && resolveImport?.(entry.specifier)
    return bundle
      ? extractReactTsPropsFromSource(bundle, entry!.name, nextVisited).map(
          ({ defaultValue, ...prop }) => prop,
        )
      : []
  }

  function literal(node: ts.Expression | undefined): unknown {
    if (!node) return undefined
    if (ts.isStringLiteralLike(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (node.kind === ts.SyntaxKind.NullKeyword) return null
    if (
      ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand)
    )
      return -Number(node.operand.text)
    if (ts.isArrayLiteralExpression(node)) {
      const values = node.elements.map((element) => literal(element))
      return values.some((value) => value === undefined) ? undefined : values
    }
    if (ts.isObjectLiteralExpression(node)) {
      const result: Record<string, unknown> = {}
      for (const property of node.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !property.name ||
          ts.isComputedPropertyName(property.name)
        )
          return undefined
        const value = literal(property.initializer)
        if (value === undefined) return undefined
        result[property.name.getText(source).replace(/^['"]|['"]$/g, '')] =
          value
      }
      return result
    }
    return undefined
  }

  function classify(
    node: ts.TypeNode | undefined,
    seen = new Set<string>(),
  ): Pick<ExtractedProp, 'type' | 'options'> {
    if (!node) return { type: 'any' }
    if (
      ts.isParenthesizedTypeNode(node) ||
      (ts.isTypeOperatorNode(node) &&
        node.operator === ts.SyntaxKind.ReadonlyKeyword)
    )
      return classify(node.type, seen)
    if (ts.isLiteralTypeNode(node)) {
      if (ts.isStringLiteral(node.literal))
        return { type: 'select', options: [node.literal.text] }
      if (
        node.literal.kind === ts.SyntaxKind.TrueKeyword ||
        node.literal.kind === ts.SyntaxKind.FalseKeyword
      )
        return { type: 'boolean' }
      if (ts.isNumericLiteral(node.literal)) return { type: 'number' }
    }
    if (ts.isUnionTypeNode(node)) {
      const types = node.types.filter(
        (type) =>
          type.kind !== ts.SyntaxKind.UndefinedKeyword &&
          !(
            ts.isLiteralTypeNode(type) &&
            type.literal.kind === ts.SyntaxKind.NullKeyword
          ),
      )
      if (types.length === 1) return classify(types[0], seen)
      if (
        types.every(
          (type) =>
            ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal),
        )
      ) {
        return {
          type: 'select',
          options: types.map(
            (type) =>
              ((type as ts.LiteralTypeNode).literal as ts.StringLiteral).text,
          ),
        }
      }
      if (
        types.every(
          (type) =>
            ts.isLiteralTypeNode(type) &&
            (type.literal.kind === ts.SyntaxKind.TrueKeyword ||
              type.literal.kind === ts.SyntaxKind.FalseKeyword),
        )
      )
        return { type: 'boolean' }
      const finiteValues = types.map((type) => {
        if (type.kind === ts.SyntaxKind.BooleanKeyword) return [true, false]
        if (!ts.isLiteralTypeNode(type)) return undefined
        const value = literal(type.literal)
        return typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
          ? [value]
          : undefined
      })
      if (finiteValues.every((values) => values !== undefined))
        return { type: 'select', options: [...new Set(finiteValues.flat())] }
      const classified = types.map((type) => classify(type, new Set(seen)))
      if (classified.every((type) => type.type === 'select'))
        return {
          type: 'select',
          options: [
            ...new Set(classified.flatMap((type) => type.options ?? [])),
          ],
        }
      if (classified.every((type) => type.type === classified[0]?.type))
        return classified[0] ?? { type: 'any' }
      // Preserve mixed primitive contracts instead of silently narrowing them.
      if (
        classified.every((type) =>
          ['string', 'number', 'boolean', 'array', 'object'].includes(
            type.type,
          ),
        )
      )
        return { type: classified.map((type) => type.type).join(' | ') }
      return { type: 'any' }
    }
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText(source)
      if (seen.has(name)) return { type: 'any' }
      const next = new Set([...seen, name])
      const alias = aliases.get(name)
      if (alias) return classify(alias, next)
      const enumeration = enums.get(name)
      if (enumeration) {
        const values = enumeration.members.map((member) =>
          literal(member.initializer),
        )
        if (values.every((value) => typeof value === 'string'))
          return { type: 'select', options: values as string[] }
        return { type: 'number' }
      }
      if (['Array', 'ReadonlyArray'].includes(name)) return { type: 'array' }
      if (
        [
          'ReactNode',
          'React.ReactNode',
          'ReactElement',
          'React.ReactElement',
        ].includes(name)
      )
        return { type: 'ReactNode' }
      return { type: 'any' }
    }
    if (ts.isArrayTypeNode(node) || ts.isTupleTypeNode(node))
      return { type: 'array' }
    if (ts.isFunctionTypeNode(node)) return { type: 'function' }
    if (ts.isTypeLiteralNode(node)) return { type: 'object' }
    if (node.kind === ts.SyntaxKind.StringKeyword) return { type: 'string' }
    if (node.kind === ts.SyntaxKind.NumberKeyword) return { type: 'number' }
    if (node.kind === ts.SyntaxKind.BooleanKeyword) return { type: 'boolean' }
    if (node.kind === ts.SyntaxKind.ObjectKeyword) return { type: 'object' }
    return { type: 'any' }
  }

  const defaults = new Map<string, unknown>()
  type ComponentFunction =
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.ArrowFunction
  const bindings = topLevelBindings(source)
  function resolveComponent(
    node: ts.Node | undefined,
    seen = new Set<ts.Node>(),
  ): ComponentFunction | undefined {
    if (!node || seen.has(node)) return undefined
    seen.add(node)
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    )
      return node
    if (ts.isVariableDeclaration(node))
      return resolveComponent(node.initializer, seen)
    if (ts.isIdentifier(node))
      return resolveComponent(bindings.get(node.text), seen)
    if (
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isNonNullExpression(node)
    )
      return resolveComponent(node.expression, seen)
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source)
      if (
        [
          'forwardRef',
          'React.forwardRef',
          'memo',
          'React.memo',
          'Object.assign',
        ].includes(callee)
      )
        return resolveComponent(node.arguments[0], seen)
    }
    return undefined
  }
  const component = resolveComponent(bindings.get(componentNameOf(fileName)))
  function readBindingDefaults(binding: ts.BindingName) {
    if (!ts.isObjectBindingPattern(binding)) return
    for (const element of binding.elements) {
      const name = element.propertyName ?? element.name
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
        const value = literal(element.initializer)
        if (value !== undefined) defaults.set(name.text, value)
      }
    }
  }
  const propsParameter = component?.parameters[0]
  if (propsParameter) {
    readBindingDefaults(propsParameter.name)
    // Only a direct destructure of this function's props parameter establishes
    // prop defaults. Nested callbacks and unrelated objects have their own API.
    if (
      ts.isIdentifier(propsParameter.name) &&
      component?.body &&
      ts.isBlock(component.body)
    ) {
      for (const statement of component.body.statements) {
        if (!ts.isVariableStatement(statement)) continue
        for (const variable of statement.declarationList.declarations) {
          if (
            variable.initializer &&
            ts.isIdentifier(variable.initializer) &&
            variable.initializer.text === propsParameter.name.text
          )
            readBindingDefaults(variable.name)
        }
      }
    }
  }

  function readMember(member: ts.TypeElement): ExtractedProp[] {
    if (
      !ts.isPropertySignature(member) ||
      member.type?.kind === ts.SyntaxKind.NeverKeyword
    )
      return []
    if (!member.name || ts.isComputedPropertyName(member.name)) return []
    const name = member.name.getText(source).replace(/^['"]|['"]$/g, '')
    const description = readDoc(member)
    return [
      {
        name,
        ...classify(member.type),
        ...(description ? { description } : {}),
        required:
          !member.questionToken &&
          !(
            member.type &&
            ts.isUnionTypeNode(member.type) &&
            member.type.types.some(
              (type) => type.kind === ts.SyntaxKind.UndefinedKeyword,
            )
          ),
        ...(defaults.has(name) ? { defaultValue: defaults.get(name) } : {}),
      },
    ]
  }

  function merge(groups: ExtractedProp[][], union: boolean): ExtractedProp[] {
    const names = [
      ...new Set(groups.flatMap((group) => group.map((prop) => prop.name))),
    ]
    return names.map((name) => {
      const props = groups.flatMap((group) =>
        group.filter((prop) => prop.name === name),
      )
      const last = props[props.length - 1]
      const sameType = props.every((prop) => prop.type === last.type)
      // A contract has one description per prop, so union branches must agree;
      // a disagreement inside a nested union survives any outer merge.
      const docs = [
        ...new Set(
          props.flatMap((prop) => prop.docConflict ?? [prop.description ?? '']),
        ),
      ]
      const conflict =
        docs.length > 1 && (union || props.some((prop) => prop.docConflict))
      return {
        ...last,
        description: props.find((prop) => prop.description)?.description,
        ...(conflict ? { docConflict: docs } : {}),
        type: sameType
          ? last.type
          : props.every((prop) =>
                ['string', 'number', 'boolean', 'array', 'object'].includes(
                  prop.type,
                ),
              )
            ? [...new Set(props.map((prop) => prop.type))].join(' | ')
            : 'any',
        // A partly unresolved union needs checker enrichment. Options from its
        // last resolved branch would silently narrow the entire contract.
        options:
          sameType && last.type === 'select'
            ? [...new Set(props.flatMap((prop) => prop.options ?? []))]
            : undefined,
        required: union
          ? props.length === groups.length &&
            props.every((prop) => prop.required)
          : props.some((prop) => prop.required),
      }
    })
  }

  function read(
    node: ts.Node | undefined,
    seen = new Set<ts.Node>(),
  ): ExtractedProp[] {
    if (!node || seen.has(node)) return []
    const next = new Set([...seen, node])
    if (ts.isInterfaceDeclaration(node)) {
      const inherited =
        node.heritageClauses?.flatMap((clause) =>
          clause.types.flatMap((base) =>
            readReference(
              base.expression.getText(source),
              base.typeArguments,
              next,
            ),
          ),
        ) ?? []
      // Authored members override inherited declarations. Platform attributes
      // stay in React's types; only explicitly authored fields enter the editor.
      const result = new Map(inherited.map((prop) => [prop.name, prop]))
      for (const member of node.members.flatMap(readMember))
        result.set(member.name, member)
      return [...result.values()]
    }
    if (ts.isTypeAliasDeclaration(node) || ts.isParenthesizedTypeNode(node))
      return read(node.type, next)
    if (ts.isTypeReferenceNode(node))
      return readReference(
        node.typeName.getText(source),
        node.typeArguments,
        next,
      )
    if (ts.isTypeLiteralNode(node)) return node.members.flatMap(readMember)
    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node))
      return merge(
        node.types.map((type) => read(type, next)),
        ts.isUnionTypeNode(node),
      )
    return []
  }
  function readReference(
    name: string,
    args: readonly ts.TypeNode[] | undefined,
    seen: Set<ts.Node>,
  ): ExtractedProp[] {
    if (['Omit', 'Pick'].includes(name) && args?.length === 2) {
      const keys =
        args[1].kind === ts.SyntaxKind.NeverKeyword
          ? []
          : classify(args[1]).options
      if (!keys) return []
      return read(args[0], seen).filter((prop) =>
        name === 'Pick' ? keys.includes(prop.name) : !keys.includes(prop.name),
      )
    }
    if (
      ['Partial', 'Required', 'Readonly'].includes(name) &&
      args?.length === 1
    )
      return read(args[0], seen).map((prop) =>
        name === 'Readonly' ? prop : { ...prop, required: name === 'Required' },
      )
    return named.has(name) ? read(named.get(name), seen) : imported(name)
  }
  return read(declaration).map((prop) =>
    defaults.has(prop.name)
      ? { ...prop, defaultValue: defaults.get(prop.name) }
      : prop,
  )
}
