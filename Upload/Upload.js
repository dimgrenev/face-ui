import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Upload — file upload with drag-and-drop support.
 *
 * `<Upload accept="image/*" multiple />`
 */
import { forwardRef, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { uploadMachine, connectUpload } from '../assets/machines/upload.machine';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
import { Button } from '../Button/Button';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Upload = forwardRef(function Upload(props, ref) {
    const { accept = '', multiple = false, maxSize = 0, maxFiles = 0, disabled = false, files, onFilesChange, onReject, className, } = props;
    const inputRef = useRef(null);
    const { state, send } = useMachine(uploadMachine, {
        files: files !== null && files !== void 0 ? files : [],
        accept,
        multiple,
        maxSize,
        maxFiles,
        disabled,
        onFilesChange: onFilesChange !== null && onFilesChange !== void 0 ? onFilesChange : null,
        onReject: onReject !== null && onReject !== void 0 ? onReject : null,
    });
    const api = connectUpload(state, send);
    const handleTriggerClick = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.click();
        }
    };
    return (_jsxs("div", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-upload', className), children: [_jsxs("div", Object.assign({}, api.getDropzoneProps(), { children: [_jsx("input", Object.assign({ ref: inputRef }, api.getHiddenInputProps())), _jsx(Text, { as: "div", className: "uf-upload-dropHint", variant: "muted", children: api.isDragging ? 'Drop files here' : 'Drop files here or choose from system' }), _jsx(Button, Object.assign({}, api.getTriggerProps(), { text: "Choose files", variant: "default", align: "left", className: "uf-upload-trigger", onClick: handleTriggerClick }))] })), api.files.length > 0 && (_jsx("ul", Object.assign({}, api.getFileListProps(), { children: api.files.map((file) => (_jsxs("li", Object.assign({}, api.getFileItemProps(file.id), { children: [_jsx(Text, Object.assign({ as: "span" }, api.getFileNameProps(file.id), { children: file.name })), _jsx(Text, Object.assign({ as: "span" }, api.getFileSizeProps(file.id), { variant: "muted", children: formatFileSize(file.size) })), _jsx(Button, Object.assign({}, api.getFileRemoveProps(file.id), { text: "Remove", fullWidth: false, membrane: false }))] }), file.id))) })))] })));
});
