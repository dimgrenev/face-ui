/**
 * Upload — file upload with drag-and-drop support.
 *
 * `<Upload accept="image/*" multiple />`
 */

import { forwardRef, useCallback, useRef, useState } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { uploadMachine, connectUpload } from '../assets/machines/upload.machine'
import type {
  UploadFile,
  UploadRejectedFile,
} from '../assets/machines/upload.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { Button } from '../Button/Button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  UploadFile,
  UploadRejectedFile,
  UploadRejectReason,
  UploadSourceFile,
} from '../assets/machines/upload.machine'

export interface UploadLabels {
  idle: string
  dragging: string
  trigger: string
  remove: string
}

export interface UploadProps {
  /** Accepted file types (e.g. "image/*", ".pdf,.doc"). */
  accept?: string
  /** Allow multiple file selection. */
  multiple?: boolean
  /** Maximum file size in bytes. 0 = unlimited. */
  maxSize?: number
  /** Maximum number of files. 0 = unlimited. */
  maxFiles?: number
  /** Disabled state. */
  disabled?: boolean
  /** Controlled file list. */
  files?: UploadFile[]
  /** Initial file list for uncontrolled usage. */
  defaultFiles?: UploadFile[]
  /** Callback when files change. */
  onFilesChange?: (details: { files: UploadFile[] }) => void
  /** Callback when files are rejected. */
  onReject?: (details: { files: UploadRejectedFile[] }) => void
  /** Localized interface labels. */
  labels?: Partial<UploadLabels>
  /** Additional CSS class. */
  className?: string
}

const DEFAULT_LABELS: UploadLabels = {
  idle: 'Drop files here or choose from system',
  dragging: 'Drop files here',
  trigger: 'Choose files',
  remove: 'Remove',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Upload = forwardRef<HTMLDivElement, UploadProps>(
  function Upload(props, ref) {
    const {
      accept = '',
      multiple = false,
      maxSize = 0,
      maxFiles = 0,
      disabled = false,
      files,
      defaultFiles = [],
      onFilesChange,
      onReject,
      labels,
      className,
    } = props

    const inputRef = useRef<HTMLInputElement>(null)
    const isControlled = files !== undefined
    const [uncontrolledFiles, setUncontrolledFiles] = useState<UploadFile[]>(
      () => [...defaultFiles],
    )
    const resolvedFiles = isControlled ? files : uncontrolledFiles
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels }

    const handleFilesChange = useCallback(
      (details: { files: UploadFile[] }) => {
        if (!isControlled) setUncontrolledFiles(details.files)
        onFilesChange?.(details)
      },
      [isControlled, onFilesChange],
    )

    const { state, send } = useMachine(uploadMachine, {
      files: resolvedFiles,
      accept,
      multiple,
      maxSize,
      maxFiles,
      disabled,
      onFilesChange: handleFilesChange,
      onReject: onReject ?? null,
    })

    const api = connectUpload(state, send)
    const triggerProps = { ...(api.getTriggerProps() as any) }
    delete triggerProps['data-scope']
    delete triggerProps['data-part']

    const handleTriggerClick = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.click()
      }
    }

    return (
      <div
        ref={ref}
        {...api.getRootProps()}
        className={cn('uf-upload', className)}
      >
        <div {...api.getDropzoneProps()}>
          <input
            ref={inputRef}
            {...api.getHiddenInputProps()}
            aria-label={resolvedLabels.trigger}
          />
          <Text as="div" className="uf-upload-dropHint" variant="muted">
            {api.isDragging ? resolvedLabels.dragging : resolvedLabels.idle}
          </Text>
          <Button
            {...triggerProps}
            text={resolvedLabels.trigger}
            variant="default"
            align="left"
            className="uf-upload-trigger"
            onClick={handleTriggerClick}
          />
        </div>

        {api.files.length > 0 && (
          <ul {...api.getFileListProps()}>
            {api.files.map((file) => (
              <li key={file.id} {...api.getFileItemProps(file.id)}>
                <Text as="span" {...api.getFileNameProps(file.id)}>
                  {file.name}
                </Text>
                <Text
                  as="span"
                  {...api.getFileSizeProps(file.id)}
                  variant="muted"
                >
                  {formatFileSize(file.size)}
                </Text>
                <Button
                  {...(api.getFileRemoveProps(file.id) as any)}
                  aria-label={`${resolvedLabels.remove} ${file.name}`}
                  text={resolvedLabels.remove}
                  fullWidth={false}
                  membrane={false}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)
