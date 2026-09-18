import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project, ts } from 'ts-morph'

const root = fileURLToPath(new URL('..', import.meta.url))
const project = new Project({
  tsConfigFilePath: path.join(root, 'tsconfig.build.esm.json'),
})
const relative = (file) => path.relative(root, file).replaceAll('\\', '/')
const output = path.join(root, 'docs/audit/props/inventory.json')
const entryFiles = project.getSourceFiles().filter((source) => {
  const file = relative(source.getFilePath())
  return (
    /^[A-Z][^/]*\/[^/]+\.tsx$/.test(file) ||
    /^assets\/adapters\/react\/[^/]+\.tsx$/.test(file) ||
    file === 'face-ui-react.tsx'
  )
})
const records = new Map()
function recordProps(source, type, recordName, kind) {
  const key = `${relative(source.getFilePath())}#${recordName}`
  const library = []
  const native = []
  for (const symbol of type.getProperties()) {
    const property = symbol.getDeclarations()[0]
    if (!property) continue
    const sourcePath = relative(property.getSourceFile().getFilePath())
    if (sourcePath.includes('node_modules/')) {
      native.push(symbol.getName())
      continue
    }
    library.push({
      name: symbol.getName(),
      type: symbol
        .getTypeAtLocation(property)
        .getText(property, ts.TypeFormatFlags.NoTruncation),
      optional: symbol.isOptional(),
      source: `${sourcePath}:${property.getStartLineNumber()}`,
      description: ts.displayPartsToString(
        symbol.compilerSymbol.getDocumentationComment(
          project.getTypeChecker().compilerObject,
        ),
      ),
    })
  }
  records.set(key, {
    entry: relative(source.getFilePath()),
    name: recordName,
    kind,
    library,
    native: native.sort(),
  })
}
// Resolve re-exports (Icon) and local aliases (Sidebar) as well as interfaces.
for (const source of entryFiles) {
  const exported = source.getExportedDeclarations()
  for (const [name, declarations] of exported) {
    for (const declaration of declarations) {
      let type = declaration.getType()
      const isDeclaration = [
        'InterfaceDeclaration',
        'TypeAliasDeclaration',
      ].includes(declaration.getKindName())
      let recordName = name
      if (!isDeclaration) {
        // Compound components can expose a private Props type through public
        // callable members (e.g. Bar.Section). Inspect these before skipping a
        // component whose main Props interface has already been exported.
        if (/^[A-Z]/.test(name)) {
          for (const member of type.getProperties()) {
            if (!/^[A-Z]/.test(member.getName())) continue
            const memberType = member.getTypeAtLocation(declaration)
            const parameter = memberType
              .getCallSignatures()[0]
              ?.getParameters()[0]
            if (!parameter) continue
            recordProps(
              source,
              parameter.getTypeAtLocation(declaration),
              `${name}.${member.getName()}(props)`,
              'props',
            )
          }
        }
        // Include public components whose prop types are inline or unexported.
        if (!/^[A-Z]/.test(name) || exported.has(`${name}Props`)) continue
        const parameter = type.getCallSignatures()[0]?.getParameters()[0]
        if (!parameter) continue
        type = parameter.getTypeAtLocation(declaration)
        recordName = `${name}(props)`
      }
      if (
        !type.getProperties().length ||
        (isDeclaration && !name.endsWith('Props') && !type.isObject())
      )
        continue
      recordProps(
        source,
        type,
        recordName,
        !isDeclaration || name.endsWith('Props') ? 'props' : 'structure',
      )
    }
  }
}
const inventory = [...records.values()].sort((a, b) =>
  `${a.entry}#${a.name}`.localeCompare(`${b.entry}#${b.name}`),
)
const serialized = `${JSON.stringify(inventory, null, 2)}\n`
if (process.argv.includes('--write')) fs.writeFileSync(output, serialized)
else if (
  !fs.existsSync(output) ||
  fs.readFileSync(output, 'utf8') !== serialized
) {
  console.error(
    'Prop inventory is stale. Run node scripts/audit-props.mjs --write.',
  )
  process.exitCode = 1
}
console.log(
  `${inventory.length} public API types; ${inventory.reduce((sum, item) => sum + item.library.length, 0)} library prop/field occurrences; ${inventory.reduce((sum, item) => sum + item.native.length, 0)} inherited platform prop occurrences.`,
)
