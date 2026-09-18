import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { Project, SyntaxKind } from 'ts-morph'

const write = process.argv.includes('--write')
const roots = process.argv.slice(2).filter((arg) => arg !== '--write')
if (!roots.length)
  throw new Error(
    'Pass source directories; add --write to apply the migration.',
  )
const project = new Project({ skipAddingFilesFromTsConfig: true })
function expression(attribute) {
  const initial = attribute?.getInitializer()
  if (!initial) return 'true'
  return initial.getKind() === SyntaxKind.JsxExpression
    ? (initial.getExpression()?.getText() ?? 'undefined')
    : initial.getText()
}
for (const root of roots) {
  const files = execFileSync(
    'rg',
    [
      '--files',
      root,
      '-g',
      '*.tsx',
      '-g',
      '!**/node_modules/**',
      '-g',
      '!**/packages/face-ui-react/**',
      '-g',
      '!**/dist/**',
      '-g',
      '!**/.artifacts/**',
    ],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
  for (const file of files) {
    const source = project.addSourceFileAtPath(file)
    const names = new Set()
    for (const declaration of source.getImportDeclarations()) {
      const moduleName = declaration.getModuleSpecifierValue()
      if (!/face-ui|(?:^|\/)Button(?:\/Button)?$/.test(moduleName)) continue
      for (const imported of declaration.getNamedImports()) {
        if (imported.getName() === 'Button')
          names.add(imported.getAliasNode()?.getText() ?? imported.getName())
      }
      if (
        /Button(?:\/Button)?$/.test(moduleName) &&
        declaration.getDefaultImport()
      )
        names.add(declaration.getDefaultImport().getText())
      if (/face-ui/.test(moduleName) && declaration.getNamespaceImport())
        names.add(`${declaration.getNamespaceImport().getText()}.Button`)
    }
    let changed = false
    for (const element of source
      .getDescendants()
      .filter(
        (node) =>
          node.getKind() === SyntaxKind.JsxOpeningElement ||
          node.getKind() === SyntaxKind.JsxSelfClosingElement,
      )) {
      if (!names.has(element.getTagNameNode().getText())) continue
      const selector = element.getAttribute('selector')
      const direction = element.getAttribute('selectorDirection')
      const open = element.getAttribute('selectorOpen')
      if (selector && !element.getAttribute('chevron')) {
        const side = direction ? expression(direction) : "'vertical'"
        const chevron = /^['"]side['"]$/.test(side)
          ? "'right'"
          : /^['"]vertical['"]$/.test(side)
            ? "'down'"
            : `(${side}) === 'side' ? 'right' : 'down'`
        const visible = expression(selector)
        element.addAttribute({
          name: 'chevron',
          initializer: `{${visible === 'true' ? chevron : `(${visible}) ? (${chevron}) : undefined`}}`,
        })
      }
      if (open && !element.getAttribute('aria-expanded'))
        element.addAttribute({
          name: 'aria-expanded',
          initializer: `{${expression(open)}}`,
        })
      for (const attribute of [selector, direction, open]) {
        if (!attribute) continue
        attribute.remove()
        changed = true
      }
    }
    if (changed) {
      console.log(`${write ? 'Updated' : 'Would update'} ${path.resolve(file)}`)
      if (write) source.saveSync()
    }
    project.removeSourceFile(source)
  }
}
