/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
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
    'dist/esm/uf.runtime.js',
    'dist/types/uf.runtime.d.ts',
    'docs.md',
    'docs/component-map.md',
    'docs/design-system-brief.md',
    'docs/governance.md',
  ];

  for (const file of requiredFiles) {
    assert(exists(file), `Missing package artifact: ${file}`);
  }

  if (fs.existsSync(dist)) {
    const distFiles = walk(dist).map(rel);
    const forbiddenPatterns = [
      /(^|\/)\.git(\/|$)/,
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
    }
  } else {
    assert(false, 'Missing dist directory. Run pnpm build first.');
  }

  assert(packageJson.files?.includes('docs.md'), 'package files must include docs.md');
  assert(packageJson.files?.includes('docs'), 'package files must include docs/');
  assert(packageJson.exports?.['./docs.md'] === './docs.md', 'package exports must expose docs.md');
  assert(packageJson.exports?.['./docs/*'] === './docs/*', 'package exports must expose docs/* markdown files');
  assert(!packageJson.exports?.['./*'], 'package exports must not expose a generic JS wildcard');
  assert(!packageJson.exports?.['./*.json'], 'package exports must not expose a generic JSON wildcard');
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

  try {
    const cjsButton = require(path.join(root, 'dist/cjs/Button/Button.js'));
    assert(typeof cjsButton.Button === 'object' || typeof cjsButton.Button === 'function', 'CJS component export must expose Button');
  } catch (error) {
    assert(false, `CJS component export failed: ${error.message}`);
  }

  try {
    const esm = await import(pathToFileURL(path.join(root, 'dist/esm/index.js')).href);
    assert(typeof esm.Button === 'object' || typeof esm.Button === 'function', 'ESM root export must expose Button');
  } catch (error) {
    assert(false, `ESM root export failed: ${error.message}`);
  }

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
