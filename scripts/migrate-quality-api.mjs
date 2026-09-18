import path from 'node:path'
import { Project, SyntaxKind } from 'ts-morph'
import { listTsxSources } from './lib/source-files.mjs'

const write = process.argv.includes('--write')
const roots = process.argv.slice(2).filter((arg) => arg !== '--write')
if (!roots.length)
  throw new Error(
    'Pass source directories; add --write to apply the migration.',
  )
const project = new Project({ skipAddingFilesFromTsConfig: true })
for (const root of roots) {
  const files = listTsxSources(root)
  for (const file of files) {
    const source = project.addSourceFileAtPath(file)
    const names = new Map()
    for (const declaration of source.getImportDeclarations()) {
      if (
        !/face-ui|Switcher\/Switcher|Popover\/Popover|Table\/Table/.test(
          declaration.getModuleSpecifierValue(),
        )
      )
        continue
      for (const imported of declaration.getNamedImports())
        names.set(
          imported.getAliasNode()?.getText() ?? imported.getName(),
          imported.getName(),
        )
    }
    let changed = false
    for (const element of source
      .getDescendants()
      .filter(
        (node) =>
          node.getKind() === SyntaxKind.JsxOpeningElement ||
          node.getKind() === SyntaxKind.JsxSelfClosingElement,
      )) {
      const name = names.get(element.getTagNameNode().getText())
      if (name === 'Switcher') {
        const text = element.getAttribute('text')
        const withText = element.getAttribute('withText')
        const show = withText?.getInitializer()?.getText() ?? '{true}'
        if (text && !element.getAttribute('label') && show !== '{false}') {
          const initial = text.getInitializer()?.getText() ?? '""'
          if (show === '{true}' || !withText?.getInitializer())
            element.addAttribute({ name: 'label', initializer: initial })
          else
            element.addAttribute({
              name: 'label',
              initializer: `{${show.slice(1, -1)} ? ${initial.startsWith('{') ? initial.slice(1, -1) : initial} : undefined}`,
            })
        }
        if (text) {
          text.remove()
          changed = true
        }
        if (withText) {
          withText.remove()
          changed = true
        }
      } else if (name === 'Popover') {
        const attribute = element.getAttribute('interactive')
        if (attribute) {
          attribute.remove()
          changed = true
        }
      } else if (name === 'Table') {
        const attribute = element.getAttribute('membrane')
        if (attribute && !element.getAttribute('rowStyle')) {
          const value = attribute.getInitializer()?.getText() ?? '{true}'
          element.addAttribute({
            name: 'rowStyle',
            initializer:
              value === '{true}'
                ? '"tile"'
                : value === '{false}'
                  ? '"plain"'
                  : `{${value.slice(1, -1)} ? 'tile' : 'plain'}`,
          })
          attribute.remove()
          changed = true
        }
      }
    }
    if (changed) {
      console.log(`${write ? 'Updated' : 'Would update'} ${path.resolve(file)}`)
      if (write) source.saveSync()
    }
    project.removeSourceFile(source)
  }
}
