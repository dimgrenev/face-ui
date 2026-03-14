import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Avatar — user identity display.
 *
 * Shows an image with fallback to initials or custom fallback content.
 * Manages image loading state via the avatar machine.
 *
 * `<Avatar src="/photo.jpg" name="John Doe" />`
 * `<Avatar name="JD" fallback={<Icon />} />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { avatarMachine, connectAvatar } from '../assets/machines/avatar.machine';
import { cn } from '../assets/utils';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Avatar = forwardRef(function Avatar(props, ref) {
    const { src = '', name = '', fallback, fallbackDelayMs = 0, className } = props;
    const { state, send } = useMachine(avatarMachine, {
        src,
        name,
        fallbackDelayMs,
    });
    const api = connectAvatar(state, send);
    return (_jsxs("span", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-avatar', className), children: [_jsx("img", Object.assign({}, api.getImageProps())), _jsx("span", Object.assign({}, api.getFallbackProps(), { children: fallback !== null && fallback !== void 0 ? fallback : api.initials }))] })));
});
