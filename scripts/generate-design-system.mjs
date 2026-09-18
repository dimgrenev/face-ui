import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/** Generate every authored CSS shard and both tooling manifests from JSONC. */
export function generateDesignSystem(root, write) {
  const outputs = new Map()
  const manifest = []
  const sheets = new Map()
  const declarations = new Set()
  for (const file of readdirSync(join(root, 'design-system/source'))
    .filter((file) => file.endsWith('.jsonc'))
    .sort()) {
    const { config: source, error } = ts.parseConfigFileTextToJson(
      file,
      readFileSync(join(root, 'design-system/source', file), 'utf8'),
    )
    if (error) throw new Error(`Invalid token source: ${file}`)
    if (
      !/^design-system\/(tokens|themes)\/[\w-]+\.css$/.test(
        source.generatedPath,
      )
    )
      throw new Error(`Invalid output path in ${file}`)
    const blocks = outputs.get(source.generatedPath) ?? new Map()
    outputs.set(source.generatedPath, blocks)
    for (const token of source.tokens) {
      if (!/^--[\w-]+$/.test(token.name) || !token.variants.length)
        throw new Error(`Invalid token in ${file}`)
      for (const { selector, value } of token.variants) {
        const key = `${source.generatedPath}:${selector}:${token.name}`
        if (declarations.has(key))
          throw new Error(`Duplicate declaration: ${key}`)
        declarations.add(key)
        const values = blocks.get(selector) ?? []
        values.push(`  ${token.name}: ${value};`)
        blocks.set(selector, values)
      }
      const entry = {
        name: token.name.slice(2),
        sheet: token.sheet,
        profile: 'design-system',
        generatedPath: source.generatedPath,
        selectors: token.variants.map((variant) => variant.selector),
        values: token.variants.map((variant) => variant.value),
      }
      manifest.push(entry)
      const sheet = sheets.get(token.sheet) ?? []
      sheet.push(entry)
      sheets.set(token.sheet, sheet)
    }
  }
  const generated = new Map(
    [...outputs].map(([path, blocks]) => [
      path,
      `/* Generated from canonical design-system source. */\n\n${[...blocks].map(([selector, values]) => `${selector} {\n${values.join('\n')}\n}`).join('\n\n')}\n`,
    ]),
  )
  generated.set(
    'design-system/generated/token-manifest.json',
    JSON.stringify({ version: 1, tokens: manifest }, null, 2) + '\n',
  )
  const title = (sheet) =>
    sheet
      .split('-')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' / ')
  generated.set(
    'design-system/generated/preview-metadata.json',
    JSON.stringify(
      {
        version: 1,
        sheets: [...sheets].map(([sheet, tokens]) => ({
          sheet,
          profile: 'design-system',
          title: title(sheet),
          generatedPath: tokens[0].generatedPath,
          previewKind: sheet.startsWith('semantic-')
            ? 'semantic'
            : sheet === 'themes'
              ? 'theme-state'
              : sheet,
          tokenCount: tokens.length,
          selectors: [...new Set(tokens.flatMap((token) => token.selectors))],
          sampleTokens: tokens.slice(0, 6).map((token) => token.name),
        })),
      },
      null,
      2,
    ) + '\n',
  )
  for (const [path, contents] of generated) {
    if (write) writeFileSync(join(root, path), contents)
    else if (readFileSync(join(root, path), 'utf8') !== contents)
      throw new Error(`${path} is out of date. Run pnpm tokens:sync.`)
  }
}
