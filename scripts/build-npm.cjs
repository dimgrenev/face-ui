/* eslint-disable no-console */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PACKAGE_ROOT = path.resolve(__dirname, '..')

function runNode(scriptPath, args) {
  const res = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: PACKAGE_ROOT,
    stdio: 'inherit',
  })
  if (res.status !== 0) process.exit(res.status || 1)
}

function findDependencyFile(startDir, relativePath) {
  let currentDir = startDir
  while (true) {
    const candidate = path.join(currentDir, 'node_modules', relativePath)
    if (fs.existsSync(candidate)) return candidate

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) return null
    currentDir = parentDir
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function fixEsmExtensions(dir) {
  const entries = fs.readdirSync(dir)
  for (const entry of entries) {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isDirectory()) {
      fixEsmExtensions(full)
      continue
    }
    if (!entry.endsWith('.js')) continue
    let content = fs.readFileSync(full, 'utf8')
    let changed = false
    content = content.replace(
      /(from\s+['"]|import\s*\(\s*['"])(\.[^'"]+)(['"])/g,
      (match, prefix, importPath, quote) => {
        if (/\.(js|json|css|mjs|cjs)$/.test(importPath)) return match
        changed = true
        return prefix + importPath + '.js' + quote
      },
    )
    content = content.replace(
      /(from\s+['"][^'"]+\.json['"])(?!\s+with\s*\{)(;?)/g,
      (_match, importStatement, suffix) => {
        changed = true
        return `${importStatement} with { type: 'json' }${suffix}`
      },
    )
    if (changed) fs.writeFileSync(full, content, 'utf8')
  }
}

function fixDeclarationExtensions(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isDirectory()) {
      fixDeclarationExtensions(full)
      continue
    }
    if (!entry.endsWith('.d.ts')) continue

    const content = fs.readFileSync(full, 'utf8')
    const fixed = content.replace(
      /(from\s+['"]|import\s*(?:\(\s*)?['"])(\.[^'"]+)(['"])/g,
      (match, prefix, importPath, quote) => {
        if (/\.(js|mjs|cjs|json|css|svg)$/.test(importPath)) return match
        const target = path.resolve(path.dirname(full), importPath)
        if (fs.existsSync(`${target}.d.ts`)) return `${prefix}${importPath}.js${quote}`
        if (fs.existsSync(path.join(target, 'index.d.ts'))) {
          const separator = importPath.endsWith('/') ? '' : '/'
          return `${prefix}${importPath}${separator}index.js${quote}`
        }
        throw new Error(`Unresolved declaration import ${importPath} in ${full}`)
      },
    )
    if (fixed !== content) fs.writeFileSync(full, fixed, 'utf8')
  }
}

function shouldSkipDir(relPath) {
  return (
    relPath.split('/').some((part) => part.startsWith('.')) ||
    relPath === 'test-results' ||
    relPath === 'playwright-report' ||
    relPath === 'dist' ||
    relPath === '.git' ||
    relPath.startsWith('.git/') ||
    relPath === '.cache' ||
    relPath.startsWith('.cache/') ||
    relPath === '.github' ||
    relPath.startsWith('.github/') ||
    relPath === '.next' ||
    relPath.startsWith('.next/') ||
    relPath.startsWith('.next-') ||
    relPath.includes('/.next-') ||
    relPath === '.turbo' ||
    relPath.startsWith('.turbo/') ||
    relPath === '.userface' ||
    relPath.startsWith('.userface/') ||
    relPath === '.userface-cache' ||
    relPath.startsWith('.userface-cache/') ||
    relPath === 'coverage' ||
    relPath.startsWith('coverage/') ||
    relPath === 'node_modules' ||
    relPath === 'out' ||
    relPath.startsWith('out/') ||
    relPath === 'scripts' ||
    relPath.endsWith('/__tests__') ||
    relPath === 'assets/__tests__' ||
    relPath === 'assets/contracts' ||
    // Inlined into the flat styles/{index,components}.css entries below.
    relPath === 'assets/styles/components'
  )
}

const CSS_IMPORT = /^@import\s+(['"])([^'"]+)\1\s*;[^\S\n]*\n?/gm
const FLAT_CSS_ENTRIES = ['assets/styles/index.css', 'assets/styles/components.css']

/**
 * Inline local `@import`s depth-first, in source order (import order = cascade
 * order), so the published entry stylesheets work without a CSS bundler.
 * Only same-directory or components/ files are imported and they carry no url(),
 * so relative URLs keep resolving from the flat file's location.
 */
function flattenCss(filePath, stack = []) {
  if (stack.includes(filePath)) throw new Error(`Circular @import: ${[...stack, filePath].join(' -> ')}`)
  const css = fs
    .readFileSync(filePath, 'utf8')
    .replace(CSS_IMPORT, (_match, _quote, spec) =>
      flattenCss(path.resolve(path.dirname(filePath), spec), [...stack, filePath]),
    )
  if (/@import\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error(`Unsupported @import left in ${filePath}`)
  return css
}

function writeFlatStyles(targetRoot) {
  for (const entry of FLAT_CSS_ENTRIES) {
    fs.writeFileSync(path.join(targetRoot, entry), flattenCss(path.join(PACKAGE_ROOT, entry)), 'utf8')
  }
}

function shouldCopyAsset(relPath) {
  if (!relPath || relPath.split('/').some((part) => part.startsWith('.')))
    return false
  if (relPath.includes('копия')) return false
  if (/\.(test|spec)\./.test(relPath)) return false
  if (relPath === 'package.json') return false
  if (relPath === '.gitignore') return false
  if (relPath === 'pnpm-lock.yaml') return false
  if (relPath === 'pnpm-workspace.yaml') return false
  if (relPath === 'LICENSE') return false
  if (relPath === 'README.md') return false
  // Shipped once, at the package root, where `files` and `exports` place them.
  if (relPath === 'docs.md') return false
  if (relPath === 'migrations.json') return false
  if (relPath.endsWith('.md')) return false
  if (relPath === 'package-types.d.ts') return false
  if (relPath === 'vitest.config.ts') return false
  if (relPath.startsWith('tsconfig.build')) return false
  if (/\.(js|jsx|mjs|cjs)$/.test(relPath)) return false
  if (/\.(ts|tsx|cts|mts)$/.test(relPath)) return false
  return /\.(css|json|jsonc|woff2?|ttf|otf|eot|svg|png|webp|jpe?g|gif|avif|ico|mp4|webm|mp3|wav|pdf)$/i.test(
    relPath,
  )
}

/** Source contracts remain authored; only published executable references follow tsc's actual output. */
function normalizePublishedFacePreview(bytes, sourceFile, sourceRoot, targetRoot) {
  let contract
  try { contract = JSON.parse(bytes.toString('utf8')) } catch { return bytes }
  const preview = contract && typeof contract === 'object' && !Array.isArray(contract) ? contract.preview : null
  // String preview metadata predates executable examples (images/URLs). It is
  // not an accepted executable reference and must never be reinterpreted here.
  if (!preview || typeof preview !== 'object' || Array.isArray(preview)
    || Object.keys(preview).some(key => key !== 'entryPath' && key !== 'exportName')
    || typeof preview.entryPath !== 'string' || typeof preview.exportName !== 'string'
    || !preview.exportName.trim()) return bytes
  const entry = preview.entryPath.trim()
  const extension = /\.(tsx?|mts|cts)$/i.exec(entry)
  if (!extension) return bytes
  const fail = detail => { throw new Error(`Cannot publish Face preview in ${sourceFile}: ${detail}`) }
  if (entry.startsWith('/') || entry.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(entry)
    || /[?#\u0000-\u001f\u007f]/.test(entry + preview.exportName)) fail('expected a relative executable module path')
  const inside = (root, file) => {
    const relative = path.relative(root, file)
    return !relative || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  }
  const source = path.resolve(path.dirname(sourceFile), entry)
  if (!inside(sourceRoot, source) || !inside(sourceRoot, sourceFile)) fail('the authored entry must stay inside the package')
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail('the authored entry does not exist')
  const physicalSourceRoot = fs.realpathSync(sourceRoot)
  if (!inside(physicalSourceRoot, fs.realpathSync(source))) fail('the authored entry resolves outside the package')
  const emittedExtension = extension[1].toLowerCase() === 'mts' ? '.mjs'
    : extension[1].toLowerCase() === 'cts' ? '.cjs' : '.js'
  const emitted = path.resolve(targetRoot, path.relative(sourceRoot, source).replace(/\.(tsx?|mts|cts)$/i, emittedExtension))
  if (!inside(targetRoot, emitted) || !fs.existsSync(emitted) || !fs.statSync(emitted).isFile()) fail('the authored entry was not emitted by this build')
  if (!inside(fs.realpathSync(targetRoot), fs.realpathSync(emitted))) fail('the emitted entry resolves outside the published package')
  contract.preview = { ...preview, entryPath: preview.entryPath.replace(/\.(tsx?|mts|cts)(\s*)$/i, `${emittedExtension}$2`) }
  return Buffer.from(`${JSON.stringify(contract, null, 2)}\n`)
}

function copyRuntimeAssets(targetRoot) {
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, entry)
      const relPath = path
        .relative(PACKAGE_ROOT, fullPath)
        .split(path.sep)
        .join('/')
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        if (shouldSkipDir(relPath)) continue
        walk(fullPath)
        continue
      }
      if (!shouldCopyAsset(relPath)) continue
      const destination = path.join(targetRoot, relPath)
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      if (relPath.endsWith('.json')) {
        fs.writeFileSync(destination, normalizePublishedFacePreview(fs.readFileSync(fullPath), fullPath, PACKAGE_ROOT, targetRoot))
      } else fs.copyFileSync(fullPath, destination)
    }
  }

  walk(PACKAGE_ROOT)
}

function main() {
  const distDir = path.join(PACKAGE_ROOT, 'dist')
  if (fs.existsSync(distDir))
    fs.rmSync(distDir, { recursive: true, force: true })

  console.log('[face-ui-react:npm] building (esm/cjs/types)...')
  const tsc = findDependencyFile(
    PACKAGE_ROOT,
    path.join('typescript', 'bin', 'tsc'),
  )
  if (!tsc) {
    console.error(
      '[face-ui-react:npm] typescript not found. Run pnpm install in this repo first.',
    )
    process.exit(1)
  }

  runNode(tsc, ['-p', path.join(PACKAGE_ROOT, 'tsconfig.build.esm.json')])
  runNode(tsc, ['-p', path.join(PACKAGE_ROOT, 'tsconfig.build.cjs.json')])
  runNode(tsc, ['-p', path.join(PACKAGE_ROOT, 'tsconfig.build.types.json')])

  for (const format of ['esm', 'cjs']) {
    copyRuntimeAssets(path.join(PACKAGE_ROOT, 'dist', format))
    writeFlatStyles(path.join(PACKAGE_ROOT, 'dist', format))
  }

  writeJson(path.join(PACKAGE_ROOT, 'dist', 'esm', 'package.json'), {
    type: 'module',
  })
  writeJson(path.join(PACKAGE_ROOT, 'dist', 'cjs', 'package.json'), {
    type: 'commonjs',
  })

  fixEsmExtensions(path.join(PACKAGE_ROOT, 'dist', 'esm'))
  fixDeclarationExtensions(path.join(PACKAGE_ROOT, 'dist', 'types'))
  console.log(
    '[face-ui-react:npm] fixed ESM import extensions and JSON attributes',
  )
  console.log('[face-ui-react:npm] copied runtime assets, flattened entry styles')
  console.log('[face-ui-react:npm] done.')
}

module.exports = { flattenCss, fixDeclarationExtensions, normalizePublishedFacePreview }

if (require.main === module) main()
