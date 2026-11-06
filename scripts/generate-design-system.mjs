import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/** Generate every authored CSS shard and both tooling manifests from JSONC. */
export function generateDesignSystem(root, write) {
  const outputs = new Map()
  const manifest = []
  const sheets = new Map()
  const declarations = new Map()
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
        // A declaration in a later shard would silently win in the runtime bundle.
        // Ownership therefore applies across every source/output, not per file.
        const key = `${selector}\0${token.name}`
        const previous = declarations.get(key)
        if (previous)
          throw new Error(
            `Duplicate declaration: ${token.name} at ${JSON.stringify(selector)} in ${previous} and ${file}`,
          )
        declarations.set(key, file)
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
  // Component defaults share the runtime :root cascade with authored tokens.
  // Keep their names distinct so a later bundle section cannot shadow a source.
  const componentTokensPath = join(root, 'assets/styles/component-tokens.css')
  if (existsSync(componentTokensPath)) {
    const css = readFileSync(componentTokensPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const defaults = /^\s*:root\s*\{([^}]*)\}/m.exec(css)?.[1]
    if (!defaults) throw new Error('Missing component token :root defaults')
    for (const [, name] of defaults.matchAll(/^\s*(--[\w-]+)\s*:/gm)) {
      const key = `:root\0${name}`
      const previous = declarations.get(key)
      if (previous)
        throw new Error(
          `Duplicate declaration: ${name} at ":root" in ${previous} and assets/styles/component-tokens.css`,
        )
      declarations.set(key, 'assets/styles/component-tokens.css')
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
