/** Upload — a field that collects files picked from the system or dropped onto it, and lists them. */
import {
  forwardRef,
  useRef,
  useState,
  type DragEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { createAnatomy } from '../assets/anatomy'
import { FieldLayout, useField, type FieldProps } from '../assets/internal/field'
import { readFlatCollection } from '../assets/internal/flat-collection'
import {
  formatLabel,
  resolveLabel,
  resolveLabels,
  type CommonLabels,
} from '../assets/runtime/labels'
import { readNumber } from '../assets/runtime/props'
import {
  fileId,
  formatFileSize,
  validateFiles,
  type FileRejectReason,
} from '../assets/runtime/upload'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Progress } from '../Progress/Progress'
import { Text } from '../Text/Text'

/** One entry of the list: a picked or dropped file, or a file already stored elsewhere. */
export interface UploadFile {
  /** Unique key of the entry. Picked files start with a size, date and name key; collisions get a suffix. */
  id: string
  /** File name, shown in the entry and in its remove button's name. */
  name: string
  /** Size in bytes, shown after the name; omitted shows none. */
  size?: number
  /** The picked or dropped browser file; only entries with one are submitted with the form. */
  file?: File
  /** Upload progress from 0 to 100, shown as a bar under the entry; `null` is an unknown amount, omitted shows no bar. */
  progress?: number | null
  /** Message under the entry that marks it failed and describes its remove button. */
  error?: ReactNode
}

/** Why a picked or dropped file was not added: outside `accept`, over `maxSize`, or past the file limit. */
export type UploadRejectReason = FileRejectReason

/** A picked or dropped file that was not added. */
export interface UploadRejection {
  /** The browser file. */
  file: File
  /** `invalidType`: outside `accept`; `tooLarge`: over `maxSize`; `tooMany`: past `maxFiles`, or a second file without `multiple`. */
  reason: UploadRejectReason
}

/** Strings Upload renders itself. */
export interface UploadLabels extends Pick<CommonLabels, 'open' | 'remove'> {
  /** Instruction in the drop area. */
  drop: string
  /** Text of the button that opens the file picker. */
  open: string
  /** Name of each entry's remove button; `{name}` becomes the file name. */
  remove: string
  /** Message for files outside `accept`; `{name}` becomes their names. */
  invalidType: string
  /** Message for files over `maxSize`; `{size}` becomes the limit and `{name}` their names. */
  tooLarge: string
  /** Message for files past the file limit; `{count}` becomes the limit and `{name}` their names. */
  tooMany: string
}

export interface UploadProps
  extends FieldProps,
    Omit<
      HTMLAttributes<HTMLDivElement>,
      'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'defaultChecked' | 'role'
    > {
  /** Controlled list; an entry without a unique string `id`, or a group or separator, is dropped with a report. */
  files?: readonly UploadFile[]
  /** List on mount when `files` is not set, restored by form reset; read once. */
  defaultFiles?: readonly UploadFile[]
  /** Called once per user change of the list, with a fresh array; never for prop updates or form reset. */
  onFilesChange?: (details: { files: UploadFile[] }) => void
  /** Called with the files a pick or drop did not add; the field also shows why under the drop area. */
  onReject?: (details: { files: UploadRejection[] }) => void
  /** File types the picker offers and a drop accepts, as the native accept: `image/*`, `.pdf`, `text/csv`. */
  accept?: string
  /** Lets the list hold several files; without it a new file replaces the listed one. */
  multiple?: boolean
  /** Largest accepted file in bytes; omitted means no limit. */
  maxSize?: number
  /** Most files the list holds with `multiple`; omitted means no limit. */
  maxFiles?: number
  /** Stops picking, dropping and removing, and leaves the files out of form submission. */
  disabled?: boolean
  /** FormData key under which the listed browser files are submitted. */
  name?: string
  /** Id of the form that submits and resets the files, when it is not an ancestor. */
  form?: string
  /** Blocks form submission while the list is empty and marks the label. */
  required?: boolean
  /** Focuses the button that opens the file picker on mount. */
  autoFocus?: boolean
  /** Names the group when there is no visible `label`. */
  'aria-label'?: string
  /** Ids of the elements that name the group; they win over `label` and `aria-label`. */
  'aria-labelledby'?: string
  /** Strings Upload renders itself: the drop instruction, the button names and the rejection messages. */
  labels?: Partial<UploadLabels>
}

const { getPartAttrs: part } = createAnatomy('upload').parts(
  'root',
  'dropzone',
  'hint',
  'trigger',
  'fileList',
  'fileItem',
  'fileName',
  'fileSize',
  'fileRemove',
  'fileError',
)
const defaultLabels: UploadLabels = Object.freeze({
  drop: 'Drop files here',
  open: 'Choose files',
  remove: 'Remove {name}',
  invalidType: 'File type not accepted: {name}',
  tooLarge: 'Larger than {size}: {name}',
  tooMany: 'Limit of {count} reached: {name}',
})
const none: readonly UploadFile[] = Object.freeze([])
const REASONS: readonly FileRejectReason[] = ['invalidType', 'tooLarge', 'tooMany']
/** Covers the drop area, so the browser anchors its validation bubble there; never takes the pointer. */
const PROXY = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  border: 0,
  opacity: 0,
  pointerEvents: 'none',
} as const

const carriesFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

/**
 * Makes the input hold the listed browser files, so FormData and `required` see the list. Without
 * DataTransfer it empties the input instead, so picking the same file again still fires a change.
 */
function mirror(input: HTMLInputElement | null, list: readonly UploadFile[]) {
  if (!input) return
  try {
    const transfer = new DataTransfer()
    for (const { file } of list) if (file instanceof File) transfer.items.add(file)
    input.files = transfer.files
  } catch {
    input.value = ''
  }
}

/** A field that collects files picked from the system or dropped onto it, and lists them. */
export const Upload = forwardRef<HTMLDivElement, UploadProps>(function Upload(
  {
    files,
    defaultFiles,
    onFilesChange,
    onReject,
    accept,
    multiple = false,
    maxSize,
    maxFiles,
    disabled = false,
    name,
    form,
    required = false,
    autoFocus = false,
    labels,
    label,
    description,
    error,
    labelPosition,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    className,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    ...nativeProps
  },
  ref,
) {
  const text = resolveLabels(defaultLabels, labels, 'Upload')
  const [current, setFiles, replaceFiles] = useControllableState<readonly UploadFile[]>({
    value: files,
    defaultValue: defaultFiles ?? none,
    onChange: (next) => onFilesChange?.({ files: next as UploadFile[] }),
    name: ['Upload', 'files'],
  })
  const collection = readFlatCollection<UploadFile>(current, {
    component: 'Upload',
    prop: 'files',
    key: (entry) => entry.id,
  })
  const list = collection.keys.map((key) => collection.get(key)!.item)
  const sizeLimit = readNumber('Upload', 'maxSize', maxSize, Infinity, { integer: true, min: 1 })
  const fileLimit = readNumber('Upload', 'maxFiles', maxFiles, Infinity, { integer: true, min: 1 })

  // What the latest pick, drop or validation found wrong: rejected files, or the browser's message,
  // which no longer applies once the list has entries.
  const [report, setReport] = useState<{ text: string; validity: boolean } | null>(null)
  const field = useField({
    id,
    label,
    description,
    error,
    labelPosition,
    required,
    nativeError: report && !(report.validity && list.length) ? report.text : null,
    announcementKey: report,
    labelable: false,
    'aria-label': resolveLabel(ariaLabel, '', 'Upload', 'aria-label') || undefined,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
  })

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const refs = useComposedRefs(ref, rootRef)
  const shown = useRef(list)
  useIsomorphicLayoutEffect(() => {
    shown.current = list
    mirror(inputRef.current, list)
  }, [current])
  useFormReset(inputRef, () => {
    // The browser emptied the input; a controlled list stays, an uncontrolled one restores its default.
    mirror(inputRef.current, shown.current)
    setReport(null)
    replaceFiles()
  })
  // A removed entry takes its button along: focus the entry that took its place, else the picker button.
  useFocusRecovery(rootRef, (lost) => {
    const buttons = rootRef.current?.querySelectorAll<HTMLElement>('[data-part="fileRemove"]') ?? []
    return buttons[Math.min(Number(lost.dataset.index), buttons.length - 1)] ?? triggerRef.current
  })

  const add = (picked: ArrayLike<File> | null | undefined) => {
    // Only the same File object is a repeat. Metadata can match for different files.
    const seen = new Set(list.flatMap((entry) => entry.file ? [entry.file] : []))
    const fresh = Array.from(picked ?? []).filter((file) => {
      if (seen.has(file)) return false
      seen.add(file)
      return true
    })
    const room = multiple ? Math.max(0, fileLimit - list.length) : 1
    const { accepted, rejected } = validateFiles(fresh, {
      accept,
      maxSize: sizeLimit,
      maxFiles: room,
    })
    const messages = REASONS.flatMap((reason) => {
      const names = rejected.filter((entry) => entry.reason === reason).map(({ file }) => file.name)
      if (!names.length) return []
      const limit: Record<string, string | number> =
        reason === 'tooLarge'
          ? { size: formatFileSize(sizeLimit) }
          : reason === 'tooMany'
            ? { count: multiple ? fileLimit : 1 }
            : {}
      return [formatLabel(text[reason], { ...limit, name: names.join(', ') })]
    })
    setReport(messages.length ? { text: messages.join('\n'), validity: false } : null)
    if (rejected.length) onReject?.({ files: rejected })
    if (accepted.length) {
      const ids = new Set((multiple ? list : none).map((entry) => entry.id))
      const entries = accepted.map((file) => {
        const base = fileId(file)
        let id = base
        for (let suffix = 2; ids.has(id); suffix++) id = `${base}#${suffix}`
        ids.add(id)
        return { id, name: file.name, size: file.size, file }
      })
      setFiles([
        ...(multiple ? list : none),
        ...entries,
      ])
    }
  }
  const remove = (key: string) => {
    setReport(null)
    setFiles(list.filter((entry) => entry.id !== key))
  }

  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const dragHandlers = {
    onDragEnter: composeHandlers(onDragEnter, (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth.current += 1
      setDragging(true)
    }),
    onDragOver: composeHandlers(onDragOver, (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return
      // Taking the drag keeps the browser from opening a file dropped here; disabled, it shows no drop.
      event.preventDefault()
      event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
    }),
    onDragLeave: composeHandlers(onDragLeave, (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (!depth.current) setDragging(false)
    }),
    onDrop: composeHandlers(onDrop, (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth.current = 0
      setDragging(false)
      if (!disabled) add(event.dataTransfer.files)
    }),
  }

  return (
    <div
      {...nativeProps}
      {...field.controlProps}
      {...field.rootProps}
      {...part('root')}
      {...dragHandlers}
      ref={refs}
      role="group"
      className={cn('uf-field uf-upload', className)}
      data-disabled={disabled ? '' : undefined}
      data-dragging={dragging && !disabled ? '' : undefined}
    >
      <FieldLayout field={field}>
        <div {...part('dropzone')}>
          <input
            ref={inputRef}
            type="file"
            name={name}
            form={form}
            accept={accept || undefined}
            multiple={multiple}
            disabled={disabled}
            required={required && !list.length}
            tabIndex={-1}
            aria-hidden="true"
            style={PROXY}
            onChange={(event) => {
              add(event.currentTarget.files)
              // A refused or partial pick must not stay in the form: show the list until it commits.
              mirror(event.currentTarget, shown.current)
            }}
            // Out of the tab order and the pointer's reach, the input is focused only by interactive
            // validation; that focus is the report. Firefox needs the move to wait for a microtask.
            onFocus={(event) => {
              const message = event.currentTarget.validationMessage
              setReport(message ? { text: message, validity: true } : null)
              queueMicrotask(() => triggerRef.current?.focus({ preventScroll: true }))
            }}
          />
          <Text {...part('hint')} as="span" variant="muted">
            {text.drop}
          </Text>
          <Button
            {...part('trigger')}
            ref={triggerRef}
            disabled={disabled}
            autoFocus={autoFocus}
            data-autofocus={autoFocus ? '' : undefined}
            aria-describedby={field.describedBy}
            onClick={() => inputRef.current?.click()}
          >
            {text.open}
          </Button>
        </div>
      </FieldLayout>
      {list.length > 0 && (
        <ul {...part('fileList')} role="list">
          {list.map((entry, index) => {
            const entryId = `${field.id}-file-${index}`
            const entryName = resolveLabel(entry.name, '', 'Upload', `files[${index}].name`)
            const size = readNumber('Upload', `files[${index}].size`, entry.size, NaN, { min: 0 })
            const failed = hasSlotContent(entry.error)
            return (
              <li key={entry.id} {...part('fileItem')} data-invalid={failed ? '' : undefined}>
                <Text {...part('fileName')} as="span" id={entryId}>
                  {entryName}
                </Text>
                {size >= 0 && (
                  <Text {...part('fileSize')} as="span" variant="muted">
                    {formatFileSize(size)}
                  </Text>
                )}
                <Button
                  {...part('fileRemove')}
                  icon="close"
                  iconOnly
                  disabled={disabled}
                  aria-describedby={failed ? `${entryId}-error` : undefined}
                  data-index={index}
                  onClick={() => remove(entry.id)}
                >
                  {formatLabel(text.remove, { name: entryName })}
                </Button>
                {entry.progress !== undefined && (
                  <Progress
                    value={entry.progress}
                    aria-labelledby={entryId}
                    tone={failed ? 'destructive' : 'neutral'}
                    membrane={false}
                  />
                )}
                {failed && (
                  <Text
                    {...part('fileError')}
                    as="span"
                    inset="none"
                    membrane={false}
                    id={`${entryId}-error`}
                  >
                    {entry.error}
                  </Text>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
})
