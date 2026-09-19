import { createRef } from 'react'
import {
  Upload,
  type UploadFile,
  type UploadLabels,
  type UploadRejection,
} from '../../../index'

const uploadStored: readonly UploadFile[] = Object.freeze([
  { id: 'hero', name: 'hero.jpg', size: 48213, progress: 40 },
  { id: 'box', name: 'box.png', progress: null, error: <em>Upload failed</em> },
])
const uploadRejected = (files: UploadRejection[]) =>
  files.map(({ file, reason }) => `${file.name}:${reason === 'tooLarge' ? file.size : reason}`)
export const uploadNative = (
  <Upload
    files={uploadStored}
    onFilesChange={({ files }) => files.map((entry) => entry.file?.type ?? entry.name)}
    onReject={({ files }) => uploadRejected(files)}
    accept="image/*,.pdf"
    multiple
    maxSize={5 * 1024 * 1024}
    maxFiles={8}
    name="images"
    form="product"
    required
    autoFocus
    label="Images"
    description="PNG or JPEG, up to 5 MB each"
    error={<em>Add at least one image</em>}
    labelPosition="start"
    labels={{ drop: 'Drop images', remove: 'Remove {name}' } satisfies Partial<UploadLabels>}
    ref={createRef<HTMLDivElement>()}
    id="images"
    className="images"
    style={{ maxWidth: 480 }}
    aria-labelledby="images-heading"
    onDrop={(event) => event.dataTransfer.files.length}
  />
)
export const uploadUncontrolled = <Upload defaultFiles={uploadStored} disabled />
// @ts-expect-error An entry has no status: progress and error say it.
export const uploadRemovedStatus: UploadFile = { id: 'a', name: 'a.pdf', status: 'complete' }
// @ts-expect-error The browser file is `file`.
export const uploadRemovedSource: UploadFile = { id: 'a', name: 'a.pdf', source: new File([], 'a.pdf') }
// @ts-expect-error The MIME type is read from `file`.
export const uploadRemovedType: UploadFile = { id: 'a', name: 'a.pdf', type: 'application/pdf' }
// @ts-expect-error The idle hint is `labels.drop`.
export const uploadRemovedIdle = <Upload labels={{ idle: 'Drop files' }} />
// @ts-expect-error The dragging text is gone; the drop area is highlighted instead.
export const uploadRemovedDragging = <Upload labels={{ dragging: 'Release' }} />
// @ts-expect-error The picker button text is `labels.open`.
export const uploadRemovedTrigger = <Upload labels={{ trigger: 'Choose' }} />
// @ts-expect-error A rejection carries the browser file and a reason; `multiple` is `tooMany`.
export const uploadRemovedReason: UploadRejection = { file: new File([], 'a'), reason: 'multiple' }
// @ts-expect-error The list is the field's content; children are not rendered.
export const uploadChildren = <Upload>Drop here</Upload>
// @ts-expect-error The group role is part of the component's semantics.
export const uploadRole = <Upload role="button" />
// @ts-expect-error Accessible names use native attributes.
export const uploadAriaAlias = <Upload ariaLabel="Files" />
// @ts-expect-error The label sits above or at the inline start.
export const uploadLabelSide = <Upload label="Files" labelPosition="left" />
// @ts-expect-error The ref belongs to the HTML root div.
export const uploadInvalidRef = <Upload ref={createRef<SVGSVGElement>()} />
