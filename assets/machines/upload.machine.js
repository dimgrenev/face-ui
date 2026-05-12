/**
 * Upload (FileUpload) Machine
 *
 * States: idle | dragging
 * Manages file list with progress/status tracking, drag-and-drop, and validation.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const uploadAnatomy = createAnatomy('upload').parts('root', 'dropzone', 'trigger', 'fileList', 'fileItem', 'fileName', 'fileSize', 'fileRemove');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function matchesAccept(fileType, accept) {
    if (!accept)
        return true;
    const patterns = accept.split(',').map((p) => p.trim());
    for (const pattern of patterns) {
        if (pattern.startsWith('.')) {
            // Extension match (simplified — checks if type contains the extension category)
            continue;
        }
        if (pattern.endsWith('/*')) {
            const category = pattern.slice(0, pattern.indexOf('/'));
            if (fileType.startsWith(category + '/'))
                return true;
        }
        else if (pattern === fileType) {
            return true;
        }
    }
    // Also check raw extension patterns against file type
    return patterns.some((p) => p.startsWith('.') && fileType.length > 0);
}
function validateFiles(items, ctx) {
    const rejected = [];
    const accepted = [];
    let reason = '';
    for (const item of items) {
        if (ctx.accept && !matchesAccept(item.type, ctx.accept)) {
            rejected.push(item);
            reason = 'File type not accepted';
            continue;
        }
        if (ctx.maxSize > 0 && item.size > ctx.maxSize) {
            rejected.push(item);
            reason = 'File exceeds maximum size';
            continue;
        }
        accepted.push({
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            progress: 0,
            status: 'pending',
        });
    }
    if (ctx.maxFiles > 0 && ctx.files.length + accepted.length > ctx.maxFiles) {
        const overCount = ctx.files.length + accepted.length - ctx.maxFiles;
        const removed = accepted.splice(accepted.length - overCount, overCount);
        for (const r of removed) {
            rejected.push({ name: r.name, size: r.size, type: r.type });
        }
        reason = reason || 'Maximum number of files exceeded';
    }
    return { accepted, rejected, reason };
}
function addFilesToContext(ctx, items) {
    const { accepted, rejected, reason } = validateFiles(items, ctx);
    if (rejected.length > 0 && ctx.onReject) {
        ctx.onReject({ files: rejected, reason });
    }
    if (accepted.length > 0) {
        if (!ctx.multiple) {
            ctx.files = [accepted[0]];
        }
        else {
            ctx.files = [...ctx.files, ...accepted];
        }
    }
}
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const uploadMachine = createMachine({
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
            var _a;
            (_a = ctx.onFilesChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { files: ctx.files });
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
                                const e = event;
                                addFilesToContext(ctx, e.items);
                            },
                        ],
                    },
                ],
                REMOVE_FILE: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            ctx.files = ctx.files.filter((f) => f.id !== e.id);
                        },
                    ],
                },
                SET_PROGRESS: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            ctx.files = ctx.files.map((f) => f.id === e.id ? Object.assign(Object.assign({}, f), { progress: e.progress }) : f);
                        },
                    ],
                },
                SET_STATUS: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            ctx.files = ctx.files.map((f) => f.id === e.id ? Object.assign(Object.assign({}, f), { status: e.status, error: e.error }) : f);
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
                            const e = event;
                            addFilesToContext(ctx, e.items);
                        },
                    ],
                },
                DRAG_ENTER: {
                // Stay in dragging — absorb nested drag-enter events
                },
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectUpload(state, send) {
    const { files, accept, multiple, disabled } = state.context;
    const isDragging = state.matches('dragging');
    const totalSize = state.computed['totalSize'];
    const fileCount = state.computed['fileCount'];
    return {
        /** Computed values */
        files,
        totalSize,
        fileCount,
        isDragging,
        isDisabled: disabled,
        getRootProps() {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('root')), { 'data-disabled': disabled || undefined, 'data-dragging': isDragging || undefined });
        },
        getDropzoneProps() {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('dropzone')), { 'data-disabled': disabled || undefined, 'data-dragging': isDragging || undefined, onDragEnter(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!disabled)
                        send({ type: 'DRAG_ENTER' });
                },
                onDragOver(event) {
                    event.preventDefault();
                    event.stopPropagation();
                },
                onDragLeave(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!disabled)
                        send({ type: 'DRAG_LEAVE' });
                },
                onDrop(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (disabled)
                        return;
                    const droppedFiles = Array.from(event.dataTransfer.files);
                    const items = droppedFiles.map((f) => ({
                        id: Math.random().toString(36).slice(2, 10),
                        name: f.name,
                        size: f.size,
                        type: f.type,
                    }));
                    send({ type: 'DROP', items });
                } });
        },
        getTriggerProps() {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('trigger')), { type: 'button', disabled, 'data-disabled': disabled || undefined, onClick() {
                    if (disabled)
                        return;
                    // The React component handles opening the file input
                } });
        },
        getHiddenInputProps() {
            return {
                type: 'file',
                accept: accept || undefined,
                multiple,
                disabled,
                tabIndex: -1,
                style: {
                    position: 'absolute',
                    width: 'var(--uf-membrane)',
                    height: 'var(--uf-membrane)',
                    padding: '0',
                    margin: 'calc(-1 * var(--uf-membrane))',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: '0',
                },
                onChange(event) {
                    if (!event.target.files)
                        return;
                    const selectedFiles = Array.from(event.target.files);
                    const items = selectedFiles.map((f) => ({
                        id: Math.random().toString(36).slice(2, 10),
                        name: f.name,
                        size: f.size,
                        type: f.type,
                    }));
                    send({ type: 'ADD_FILES', items });
                },
            };
        },
        getFileListProps() {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('fileList')), { role: 'list' });
        },
        getFileItemProps(id) {
            const file = files.find((f) => f.id === id);
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('fileItem')), { role: 'listitem', 'data-file-id': id, 'data-status': file === null || file === void 0 ? void 0 : file.status });
        },
        getFileNameProps(id) {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('fileName')), { 'data-file-id': id });
        },
        getFileSizeProps(id) {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('fileSize')), { 'data-file-id': id });
        },
        getFileRemoveProps(id) {
            return Object.assign(Object.assign({}, uploadAnatomy.getPartAttrs('fileRemove')), { type: 'button', 'aria-label': 'Remove file', 'data-file-id': id, disabled,
                onClick() {
                    send({ type: 'REMOVE_FILE', id });
                } });
        },
    };
}
