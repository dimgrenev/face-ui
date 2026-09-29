/** Pure file checks behind Upload: the `accept` syntax of `<input type="file">`, size and count limits. */

/** Why a picked or dropped file was turned away: outside `accept`, over the size limit, past the count limit. */
export type FileRejectReason = 'invalidType' | 'tooLarge' | 'tooMany'

/** What the checks read of a file; a browser `File` fits. */
interface FileLike {
  readonly name: string
  readonly size: number
  readonly type: string
}

/** Limits one batch of files is checked against; an omitted limit does not apply. */
export interface FileLimits {
  /** Comma-separated MIME types, `type/*` wildcards and `.extensions`, as the input's `accept`; blank accepts every file. */
  accept?: string
  /** Largest accepted size in bytes. */
  maxSize?: number
  /** How many files of the batch may be accepted. */
  maxFiles?: number
}

/**
 * Whether `file` matches `accept`, ignoring case: `.ext` tests the end of the name, `type/*` the
 * start of the MIME type, anything else the whole MIME type. A blank or non-string `accept` matches all.
 */
export function acceptsFile(
  file: Pick<FileLike, 'name' | 'type'>,
  accept: unknown,
): boolean {
  const patterns =
    typeof accept === 'string'
      ? accept
          .toLowerCase()
          .split(',')
          .map((pattern) => pattern.trim())
          .filter(Boolean)
      : []
  if (!patterns.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return patterns.some((pattern) =>
    pattern.startsWith('.')
      ? name.endsWith(pattern)
      : pattern.endsWith('/*')
        ? type.startsWith(pattern.slice(0, -1))
        : type === pattern,
  )
}

/**
 * Splits `files` into the accepted ones, in order, and the rejected ones with the first rule each
 * breaks: type, then size, then count (a file past `maxFiles` accepted ones).
 */
export function validateFiles<F extends FileLike>(
  files: Iterable<F>,
  { accept, maxSize = Infinity, maxFiles = Infinity }: FileLimits,
): { accepted: F[]; rejected: Array<{ file: F; reason: FileRejectReason }> } {
  const accepted: F[] = []
  const rejected: Array<{ file: F; reason: FileRejectReason }> = []
  for (const file of files) {
    const reason: FileRejectReason | null = !acceptsFile(file, accept)
      ? 'invalidType'
      : file.size > maxSize
        ? 'tooLarge'
        : accepted.length >= maxFiles
          ? 'tooMany'
          : null
    if (reason) rejected.push({ file, reason })
    else accepted.push(file)
  }
  return { accepted, rejected }
}

/** Base id from size, modification time and name; Upload suffixes collisions between distinct files. */
export function fileId(file: Pick<File, 'name' | 'size' | 'lastModified'>): string {
  return `${file.size}:${file.lastModified}:${file.name}`
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/** Bytes in 1024-based units, one decimal above bytes: `2048` → `2.0 KB`; PB is the largest unit. */
export function formatFileSize(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit ? value.toFixed(1) : Math.round(value)} ${UNITS[unit]}`
}
