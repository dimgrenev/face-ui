import { readdirSync } from 'node:fs'
import path from 'node:path'

const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.artifacts', '.git', '.next'])

/** Lists consumer .tsx sources under `root`, skipping build output and generated Face UI snapshots. */
export function listTsxSources(root) {
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue
        if (entry.name === 'face-ui-react' && path.basename(directory) === 'packages') continue
        visit(entryPath)
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        files.push(entryPath)
      }
    }
  }
  visit(root)
  return files.sort()
}
