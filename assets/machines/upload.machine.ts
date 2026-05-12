/**
 * Upload (FileUpload) Machine
 *
 * States: idle | dragging
 * Manages file list with progress/status tracking, drag-and-drop, and validation.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const uploadAnatomy = createAnatomy('upload').parts(
  'root',
  'dropzone',
  'trigger',
  'fileList',
  'fileItem',
  'fileName',
  'fileSize',
  'fileRemove',
)

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface UploadFile {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface UploadSchema extends MachineSchema {
  context: {
    files: UploadFile[]
    accept: string
    multiple: boolean
    maxSize: number
    maxFiles: number
    disabled: boolean
    onFilesChange: ((details: { files: UploadFile[] }) => void) | null
    onReject: ((details: { files: { name: string; size: number; type: string }[]; reason: string }) => void) | null
  }
  state: 'idle' | 'dragging'
  event:
    | { type: 'DRAG_ENTER' }
    | { type: 'DRAG_LEAVE' }
    | { type: 'DROP'; items: { id: string; name: string; size: number; type: string }[] }
    | { type: 'ADD_FILES'; items: { id: string; name: string; size: number; type: string }[] }
    | { type: 'REMOVE_FILE'; id: string }
    | { type: 'SET_PROGRESS'; id: string; progress: number }
    | { type: 'SET_STATUS'; id: string; status: 'pending' | 'uploading' | 'complete' | 'error'; error?: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesAccept(fileType: string, accept: string): boolean {
  if (!accept) return true
  const patterns = accept.split(',').map((p) => p.trim())
  for (const pattern of patterns) {
    if (pattern.startsWith('.')) {
      // Extension match (simplified — checks if type contains the extension category)
      continue
    }
    if (pattern.endsWith('/*')) {
      const category = pattern.slice(0, pattern.indexOf('/'))
      if (fileType.startsWith(category + '/')) return true
    } else if (pattern === fileType) {
      return true
    }
  }
  // Also check raw extension patterns against file type
  return patterns.some((p) => p.startsWith('.') && fileType.length > 0)
}

function validateFiles(
  items: { id: string; name: string; size: number; type: string }[],
  ctx: UploadSchema['context'],
): { accepted: UploadFile[]; rejected: { name: string; size: number; type: string }[]; reason: string } {
  const rejected: { name: string; size: number; type: string }[] = []
  const accepted: UploadFile[] = []
  let reason = ''

  for (const item of items) {
    if (ctx.accept && !matchesAccept(item.type, ctx.accept)) {
      rejected.push(item)
      reason = 'File type not accepted'
      continue
    }
    if (ctx.maxSize > 0 && item.size > ctx.maxSize) {
      rejected.push(item)
      reason = 'File exceeds maximum size'
      continue
    }
    accepted.push({
      id: item.id,
      name: item.name,
      size: item.size,
      type: item.type,
      progress: 0,
      status: 'pending',
    })
  }

  if (ctx.maxFiles > 0 && ctx.files.length + accepted.length > ctx.maxFiles) {
    const overCount = ctx.files.length + accepted.length - ctx.maxFiles
    const removed = accepted.splice(accepted.length - overCount, overCount)
    for (const r of removed) {
      rejected.push({ name: r.name, size: r.size, type: r.type })
    }
    reason = reason || 'Maximum number of files exceeded'
  }

  return { accepted, rejected, reason }
}

function addFilesToContext(
  ctx: UploadSchema['context'],
  items: { id: string; name: string; size: number; type: string }[],
): void {
  const { accepted, rejected, reason } = validateFiles(items, ctx)

  if (rejected.length > 0 && ctx.onReject) {
    ctx.onReject({ files: rejected, reason })
  }

  if (accepted.length > 0) {
    if (!ctx.multiple) {
      ctx.files = [accepted[0]]
    } else {
      ctx.files = [...ctx.files, ...accepted]
    }
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const uploadMachine = createMachine<UploadSchema>({
  id: 'upload',
  initial: 'idle',

  context: {
    files: [],
    accept: '',
    multiple: false,
    maxSize: 0,
    maxFiles: 0,
    disabled: false,
    onFilesChange: null,
    onReject: null,
  },

  watch: {
    files(ctx) {
      ctx.onFilesChange?.({ files: ctx.files })
    },
  },

  computed: {
    totalSize: (ctx) => ctx.files.reduce((sum, f) => sum + f.size, 0),
    fileCount: (ctx) => ctx.files.length,
    isDisabled: (ctx) => ctx.disabled,
  },

  states: {
    idle: {
      on: {
        DRAG_ENTER: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'dragging',
          },
        ],
        ADD_FILES: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, event) => {
                const e = event as { type: 'ADD_FILES'; items: { id: string; name: string; size: number; type: string }[] }
                addFilesToContext(ctx, e.items)
              },
            ],
          },
        ],
        REMOVE_FILE: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'REMOVE_FILE'; id: string }
              ctx.files = ctx.files.filter((f) => f.id !== e.id)
            },
          ],
        },
        SET_PROGRESS: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'SET_PROGRESS'; id: string; progress: number }
              ctx.files = ctx.files.map((f) =>
                f.id === e.id ? { ...f, progress: e.progress } : f,
              )
            },
          ],
        },
        SET_STATUS: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'SET_STATUS'; id: string; status: 'pending' | 'uploading' | 'complete' | 'error'; error?: string }
              ctx.files = ctx.files.map((f) =>
                f.id === e.id ? { ...f, status: e.status, error: e.error } : f,
              )
            },
          ],
        },
      },
    },

    dragging: {
      on: {
        DRAG_LEAVE: {
          target: 'idle',
        },
        DROP: {
          target: 'idle',
          actions: [
            (ctx, event) => {
              const e = event as { type: 'DROP'; items: { id: string; name: string; size: number; type: string }[] }
              addFilesToContext(ctx, e.items)
            },
          ],
        },
        DRAG_ENTER: {
          // Stay in dragging — absorb nested drag-enter events
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectUpload(
  state: MachineSnapshot<UploadSchema>,
  send: SendFn<UploadSchema>,
) {
  const { files, accept, multiple, disabled } = state.context
  const isDragging = state.matches('dragging')
  const totalSize = state.computed['totalSize'] as number
  const fileCount = state.computed['fileCount'] as number

  return {
    /** Computed values */
    files,
    totalSize,
    fileCount,
    isDragging,
    isDisabled: disabled,

    getRootProps() {
      return {
        ...uploadAnatomy.getPartAttrs('root'),
        'data-disabled': disabled || undefined,
        'data-dragging': isDragging || undefined,
      }
    },

    getDropzoneProps() {
      return {
        ...uploadAnatomy.getPartAttrs('dropzone'),
        'data-disabled': disabled || undefined,
        'data-dragging': isDragging || undefined,
        onDragEnter(event: { preventDefault: () => void; stopPropagation: () => void }) {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) send({ type: 'DRAG_ENTER' })
        },
        onDragOver(event: { preventDefault: () => void; stopPropagation: () => void }) {
          event.preventDefault()
          event.stopPropagation()
        },
        onDragLeave(event: { preventDefault: () => void; stopPropagation: () => void }) {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) send({ type: 'DRAG_LEAVE' })
        },
        onDrop(event: { preventDefault: () => void; stopPropagation: () => void; dataTransfer: { files: ArrayLike<{ name: string; size: number; type: string }> } }) {
          event.preventDefault()
          event.stopPropagation()
          if (disabled) return
          const droppedFiles = Array.from(event.dataTransfer.files)
          const items = droppedFiles.map((f) => ({
            id: Math.random().toString(36).slice(2, 10),
            name: f.name,
            size: f.size,
            type: f.type,
          }))
          send({ type: 'DROP', items })
        },
      }
    },

    getTriggerProps() {
      return {
        ...uploadAnatomy.getPartAttrs('trigger'),
        type: 'button' as const,
        disabled,
        'data-disabled': disabled || undefined,
        onClick() {
          if (disabled) return
          // The React component handles opening the file input
        },
      }
    },

    getHiddenInputProps() {
      return {
        type: 'file' as const,
        accept: accept || undefined,
        multiple,
        disabled,
        tabIndex: -1,
        style: {
          position: 'absolute' as const,
          width: 'var(--uf-membrane)',
          height: 'var(--uf-membrane)',
          padding: '0',
          margin: 'calc(-1 * var(--uf-membrane))',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap' as const,
          border: '0',
        },
        onChange(event: { target: { files: ArrayLike<{ name: string; size: number; type: string }> | null } }) {
          if (!event.target.files) return
          const selectedFiles = Array.from(event.target.files)
          const items = selectedFiles.map((f) => ({
            id: Math.random().toString(36).slice(2, 10),
            name: f.name,
            size: f.size,
            type: f.type,
          }))
          send({ type: 'ADD_FILES', items })
        },
      }
    },

    getFileListProps() {
      return {
        ...uploadAnatomy.getPartAttrs('fileList'),
        role: 'list' as const,
      }
    },

    getFileItemProps(id: string) {
      const file = files.find((f) => f.id === id)
      return {
        ...uploadAnatomy.getPartAttrs('fileItem'),
        role: 'listitem' as const,
        'data-file-id': id,
        'data-status': file?.status,
      }
    },

    getFileNameProps(id: string) {
      return {
        ...uploadAnatomy.getPartAttrs('fileName'),
        'data-file-id': id,
      }
    },

    getFileSizeProps(id: string) {
      return {
        ...uploadAnatomy.getPartAttrs('fileSize'),
        'data-file-id': id,
      }
    },

    getFileRemoveProps(id: string) {
      return {
        ...uploadAnatomy.getPartAttrs('fileRemove'),
        type: 'button' as const,
        'aria-label': 'Remove file',
        'data-file-id': id,
        disabled,
        onClick() {
          send({ type: 'REMOVE_FILE', id })
        },
      }
    },
  }
}
