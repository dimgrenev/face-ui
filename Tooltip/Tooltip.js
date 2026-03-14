import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { Overlay } from '../Overlay/Overlay';
export const Tooltip = forwardRef(function Tooltip(props, ref) {
    return _jsx(Overlay, Object.assign({ ref: ref, trigger: "hover", interactive: false }, props));
});
