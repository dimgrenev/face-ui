/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

function runNode(scriptPath, args) {
  const res = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: PACKAGE_ROOT,
    stdio: 'inherit',
  });
  if (res.status !== 0) process.exit(res.status || 1);
}

function findDependencyFile(startDir, relativePath) {
  let currentDir = startDir;
  while (true) {
    const candidate = path.join(currentDir, 'node_modules', relativePath);
    if (fs.existsSync(candidate)) return candidate;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function fixEsmExtensions(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      fixEsmExtensions(full);
      continue;
    }
    if (!entry.endsWith('.js')) continue;
    let content = fs.readFileSync(full, 'utf8');
    let changed = false;
    content = content.replace(
      /(from\s+['"]|import\s*\(\s*['"])(\.[^'"]+)(['"])/g,
      (match, prefix, importPath, quote) => {
        if (/\.(js|json|css|mjs|cjs)$/.test(importPath)) return match;
        changed = true;
        return prefix + importPath + '.js' + quote;
      }
    );
    if (changed) fs.writeFileSync(full, content, 'utf8');
  }
}

function shouldSkipDir(relPath) {
  return relPath === 'dist'
    || relPath === '.artifacts'
    || relPath.includes('/.artifacts')
    || relPath === '.github'
    || relPath.startsWith('.github/')
    || relPath === 'node_modules'
    || relPath === 'scripts'
    || relPath.endsWith('/__tests__')
    || relPath === 'assets/__tests__'
    || relPath === 'assets/contracts';
}

function shouldCopyAsset(relPath) {
  if (!relPath) return false;
  if (relPath === '.artifacts' || relPath.startsWith('.artifacts/')) return false;
  if (relPath.includes('копия')) return false;
  if (/\.(test|spec)\./.test(relPath)) return false;
  if (relPath === 'package.json') return false;
  if (relPath === '.gitignore') return false;
  if (relPath === 'pnpm-lock.yaml') return false;
  if (relPath === 'pnpm-workspace.yaml') return false;
  if (relPath === 'LICENSE') return false;
  if (relPath === 'README.md') return false;
  if (relPath === 'package-types.d.ts') return false;
  if (relPath === 'vitest.config.ts') return false;
  if (relPath.startsWith('tsconfig.build')) return false;
  if (/\.(ts|tsx|cts|mts)$/.test(relPath)) return false;
  return true;
}

function copyRuntimeAssets(targetRoot) {
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, entry);
      const relPath = path.relative(PACKAGE_ROOT, fullPath).split(path.sep).join('/');
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (shouldSkipDir(relPath)) continue;
        walk(fullPath);
        continue;
      }
      if (!shouldCopyAsset(relPath)) continue;
      const destination = path.join(targetRoot, relPath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(fullPath, destination);
    }
  }

  walk(PACKAGE_ROOT);
}

function main() {
  const distDir = path.join(PACKAGE_ROOT, 'dist');
  if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true, force: true });

  console.log('[face-ui-react:npm] building (esm/cjs/types)...');
  const tsc = findDependencyFile(PACKAGE_ROOT, path.join('typescript', 'bin', 'tsc'));
  if (!tsc) {
    console.error('[face-ui-react:npm] typescript not found. Run pnpm install in this repo first.');
    process.exit(1);
  }

  runNode(tsc, ['-p', path.join(PACKAGE_ROOT, 'tsconfig.build.esm.json')]);
  runNode(tsc, ['-p', path.join(PACKAGE_ROOT, 'tsconfig.build.cjs.json')]);
  runNode(tsc, ['-p', path.join(PACKAGE_ROOT, 'tsconfig.build.types.json')]);

  copyRuntimeAssets(path.join(PACKAGE_ROOT, 'dist', 'esm'));
  copyRuntimeAssets(path.join(PACKAGE_ROOT, 'dist', 'cjs'));

  writeJson(path.join(PACKAGE_ROOT, 'dist', 'esm', 'package.json'), { type: 'module' });
  writeJson(path.join(PACKAGE_ROOT, 'dist', 'cjs', 'package.json'), { type: 'commonjs' });

  fixEsmExtensions(path.join(PACKAGE_ROOT, 'dist', 'esm'));
  console.log('[face-ui-react:npm] fixed ESM import extensions');
  console.log('[face-ui-react:npm] copied runtime assets');
  console.log('[face-ui-react:npm] done.');
}

if (require.main === module) main();
