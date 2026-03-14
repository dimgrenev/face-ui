import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { Date as FaceDate } from '../Date/Date';
export const DatePicker = forwardRef(function DatePicker(props, ref) {
    return _jsx(FaceDate, Object.assign({ ref: ref, mode: "date" }, props));
});
