/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const failures = [];

function rel(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(currentDir, files = []) {
  for (const entry of fs.readdirSync(currentDir)) {
    const fullPath = path.join(currentDir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const requiredFiles = [
    'dist/esm/index.js',
    'dist/cjs/index.js',
    'dist/types/index.d.ts',
    'dist/esm/Button/Button.js',
    'dist/cjs/Button/Button.js',
    'dist/types/Button/Button.d.ts',
    'dist/esm/Button/Button.json',
    'dist/esm/component-registry.json',
    'dist/esm/assets/styles/index.css',
    'dist/esm/assets/media/examples/office-core/manifest.json',
    'dist/esm/assets/media/examples/office-core/lobby-day.webp',
    'dist/esm/design-system/source/color-system.jsonc',
    'dist/esm/design-system/tokens/colors.css',
    'dist/esm/design-system/index.css',
    'dist/esm/assets/adapters/react/use-floating-position.js',
    'dist/cjs/assets/adapters/react/use-floating-position.js',
    'dist/types/assets/adapters/react/use-floating-position.d.ts',
    'dist/esm/gallery.js',
    'dist/cjs/gallery.js',
    'dist/types/gallery.d.ts',
    'dist/esm/gallery-meta.js',
    'dist/cjs/gallery-meta.js',
    'dist/types/gallery-meta.d.ts',
    'dist/esm/uf.runtime.js',
    'dist/types/uf.runtime.d.ts',
    'docs.md',
    'MIGRATION.md',
    'migrations.json',
  ];

  for (const file of requiredFiles) {
    assert(exists(file), `Missing package artifact: ${file}`);
  }

  if (fs.existsSync(dist)) {
    const distFiles = walk(dist).map(rel);
    assert(!distFiles.some((file) => /Begriffsschrift\.(?:ttf|woff2?|otf|eot)$/i.test(file)), 'Licensed Begriffsschrift font must not ship in dist');
    const forbiddenPatterns = [
      /(^|\/)\.git(\/|$)/,
      /(^|\/)\.cache(\/|$)/,
      /(^|\/)\.next(\/|$)/,
      /(^|\/)\.next-[^/]+(\/|$)/,
      /(^|\/)\.turbo(\/|$)/,
      /(^|\/)\.userface(\/|$)/,
      /(^|\/)\.userface-cache(\/|$)/,
      /(^|\/)node_modules(\/|$)/,
      /(^|\/)__tests__(\/|$)/,
      /\.(test|spec)\.[cm]?[jt]sx?$/,
      /(^|\/)docs\.md$/,
      /(^|\/)docs\//,
      /\.tsbuildinfo$/,
      /\.DS_Store$/,
    ];

    for (const file of distFiles) {
      for (const pattern of forbiddenPatterns) {
        assert(!pattern.test(file), `Forbidden artifact copied to dist: ${file}`);
      }
      // Published styles are flat: build-npm inlines the @import list (components/ stays in source).
      if (/^dist\/(esm|cjs)\/assets\/styles\//.test(file)) {
        assert(!file.includes('/styles/components/'), `Unflattened style part copied to dist: ${file}`);
        const css = fs.readFileSync(path.join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        assert(!/@import\b/.test(css), `@import left in published stylesheet: ${file}`);
      }
    }
  } else {
    assert(false, 'Missing dist directory. Run pnpm build first.');
  }

  assert(packageJson.files?.includes('docs.md'), 'package files must include docs.md');
  assert(packageJson.files?.includes('MIGRATION.md'), 'package files must include MIGRATION.md');
  assert(packageJson.files?.includes('migrations.json'), 'package files must include migrations.json');
  assert(packageJson.exports?.['./docs.md'] === './docs.md', 'package exports must expose docs.md');
  assert(packageJson.exports?.['./MIGRATION.md'] === './MIGRATION.md', 'package exports must expose MIGRATION.md');
  assert(packageJson.exports?.['./migrations.json'] === './migrations.json', 'package exports must expose migrations.json');
  // Guidance has one home each: docs.md, the JSDoc contracts and MIGRATION.md.
  // The audit and the taxonomy notes stay in git history (commit 4fa2f77).
  assert(!exists('docs'), 'docs/ must not come back: the guide is docs.md, props are JSDoc, breaks are MIGRATION.md');
  assert(!packageJson.files?.some((entry) => /^!?docs\//.test(entry)), 'package files must not reference docs/');
  assert(!packageJson.exports?.['./docs/*'], 'package exports must not expose docs/*');
  assert(packageJson.files?.includes('design-system'), 'package files must include design-system/');
  assert(packageJson.exports?.['./design-system/*'] === './dist/esm/design-system/*', 'package exports must expose design-system artifacts');
  assert(packageJson.exports?.['./assets/media/*'] === './dist/esm/assets/media/*', 'package exports must expose media example assets');
  assert(!packageJson.exports?.['./assets/fonts/*'], 'package must not expose a bundled font directory');
  assert(!packageJson.exports?.['./*'], 'package exports must not expose a generic JS wildcard');
  assert(!packageJson.exports?.['./*.json'], 'package exports must not expose a generic JSON wildcard');
  assert(packageJson.exports?.['./gallery']?.import === './dist/esm/gallery.js', 'package exports must expose gallery metadata');
  assert(packageJson.exports?.['./assets/adapters/react/use-floating-position']?.import === './dist/esm/assets/adapters/react/use-floating-position.js', 'package exports must expose the supported floating-position adapter');
  assert(!packageJson.exports?.['./assets/adapters/react/*'], 'Internal React adapters must not be exposed through a wildcard');
  assert(packageJson.exports?.['./Button/*']?.import === './dist/esm/Button/*.js', 'package exports must expose component modules explicitly');
  assert(packageJson.exports?.['./Button/*.json'] === './dist/esm/Button/*.json', 'package exports must expose component contracts explicitly');

  const registryPath = path.join(root, 'dist/esm/component-registry.json');
  if (fs.existsSync(registryPath)) {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    assert(registry.components && typeof registry.components === 'object', 'component-registry.json must expose a components object');
    assert(Object.prototype.hasOwnProperty.call(registry.components, 'Button'), 'component-registry.json must include Button');
  }

  try {
    const cjs = require(path.join(root, 'dist/cjs/index.js'));
    assert(typeof cjs.Button === 'object' || typeof cjs.Button === 'function', 'CJS root export must expose Button');
  } catch (error) {
    assert(false, `CJS root export failed: ${error.message}`);
  }

  for (const [subpath, entry] of Object.entries(packageJson.exports)) {
    if (!/^\.\/[A-Z][A-Za-z]+$/.test(subpath)) continue;
    try {
      assert(exists(entry.types), `Missing declaration for ${subpath}`);
      await import(`${packageJson.name}/${subpath.slice(2)}`);
      require(`${packageJson.name}/${subpath.slice(2)}`);
    } catch (error) { assert(false, `Component subpath ${subpath} failed: ${error.message}`); }
  }

  try {
    const cjsButton = require(path.join(root, 'dist/cjs/Button/Button.js'));
    assert(typeof cjsButton.Button === 'object' || typeof cjsButton.Button === 'function', 'CJS component export must expose Button');
  } catch (error) {
    assert(false, `CJS component export failed: ${error.message}`);
  }

  try {
    const esm = await import(pathToFileURL(path.join(root, 'dist/esm/index.js')).href);
    assert(typeof esm.Button === 'object' || typeof esm.Button === 'function', 'ESM root export must expose Button');
    assert(typeof esm.Icon === 'function' || typeof esm.Icon === 'object', 'ESM root export must expose Icon');
  } catch (error) {
    assert(false, `ESM root export failed: ${error.message}`);
  }

  try {
    const gallery = await import(pathToFileURL(path.join(root, 'dist/esm/gallery.js')).href);
    assert(Array.isArray(gallery.FELD_GALLERY_META), 'ESM gallery export must expose FELD_GALLERY_META');
    assert(Array.isArray(gallery.FELD_GALLERY_ENTRIES), 'ESM gallery export must expose FELD_GALLERY_ENTRIES');
    const metadata = await import(pathToFileURL(path.join(root, 'dist/esm/gallery-meta.js')).href);
    assert(Object.keys(metadata).length === 1 && Object.keys(metadata)[0] === 'FELD_GALLERY_META',
      'ESM gallery metadata entry must expose only FELD_GALLERY_META');
    assert(metadata.FELD_GALLERY_META === gallery.FELD_GALLERY_META,
      'ESM gallery metadata entry must reuse the gallery metadata object');
  } catch (error) {
    assert(false, `ESM gallery export failed: ${error.message}`);
  }

  try {
    const gallery = require(path.join(root, 'dist/cjs/gallery.js'));
    const metadata = require(path.join(root, 'dist/cjs/gallery-meta.js'));
    assert(Object.keys(metadata).length === 1 && Object.keys(metadata)[0] === 'FELD_GALLERY_META',
      'CJS gallery metadata entry must expose only FELD_GALLERY_META');
    assert(metadata.FELD_GALLERY_META === gallery.FELD_GALLERY_META,
      'CJS gallery metadata entry must reuse the gallery metadata object');
  } catch (error) {
    assert(false, `CJS gallery metadata export failed: ${error.message}`);
  }

  // Consume published metadata and its actual emitted entry, using the same
  // React peer installation as react-dom/server (never a second app's React).
  const React = require('react');
  const server = require('react-dom/server');
  assert(createRequire(require.resolve('react-dom/server')).resolve('react') === require.resolve('react'),
    'Published example smoke must use one React peer for component and renderer');
  let previewContracts = 0;
  let executableChecks = 0;
  for (const format of ['esm', 'cjs']) {
    const targetRoot = path.join(dist, format);
    for (const file of walk(targetRoot).filter(file => file.endsWith('.json'))) {
      const contract = JSON.parse(fs.readFileSync(file, 'utf8'));
      const preview = contract && typeof contract === 'object' ? contract.preview : null;
      if (!preview || typeof preview !== 'object' || Array.isArray(preview)
        || typeof preview.entryPath !== 'string' || typeof preview.exportName !== 'string') continue;
      previewContracts++;
      try {
        const entry = path.resolve(path.dirname(file), preview.entryPath.trim());
        const relative = path.relative(targetRoot, entry);
        if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`))
          throw new Error(`Published preview escaped its package: ${rel(file)}`);
        if (!fs.existsSync(entry)) throw new Error(`Missing published preview entry: ${rel(entry)}`);
        assert(createRequire(entry)('react') === React, `Published preview has a different React peer: ${rel(entry)}`);
        const specifier = `${packageJson.name}/${relative.split(path.sep).join('/').replace(/\.[cm]?js$/, '')}`;
        const module = format === 'esm' ? await import(specifier) : require(specifier);
        const Component = module[preview.exportName.trim()];
        assert(typeof Component === 'function' || typeof Component === 'object', `Missing published preview export: ${rel(file)}`);
        if (module.userfaceExample !== undefined) {
          const checks = module.userfaceExample.checks;
          if (checks !== undefined) {
            assert(Array.isArray(checks)
              && checks.every(check => typeof check.id === 'string' && typeof check.name === 'string' && typeof check.run === 'function'),
            `Published preview must retain its executable check definition: ${rel(file)}`);
            if (Array.isArray(checks)) executableChecks += checks.length;
          }
        }
        const selected = contract.currentState?.props ?? contract.states?.find(state => /default/i.test(state.name || ''))?.props
          ?? contract.states?.[0]?.props ?? {};
        const html = server.renderToString(React.createElement(Component, { ...contract.initialProps, ...selected }));
        assert(html.length > 0, `Published authored example server render was empty: ${rel(file)}`);
      } catch (error) { assert(false, `Published ${format} preview failed for ${rel(file)}: ${error.message}`); }
    }
  }
  assert(previewContracts >= 2, 'Package smoke must exercise its published authored examples in ESM and CJS');
  assert(executableChecks >= 2, 'Package smoke must exercise its authored check exports in ESM and CJS');

  if (failures.length > 0) {
    console.error('[face-ui-react:npm] smoke failed');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('[face-ui-react:npm] smoke passed');
}

main().catch((error) => {
  console.error('[face-ui-react:npm] smoke crashed');
  console.error(error);
  process.exit(1);
});
