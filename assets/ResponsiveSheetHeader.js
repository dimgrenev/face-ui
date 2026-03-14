import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar } from '../Bar/Bar';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
export function ResponsiveSheetHeader(props) {
    const { title, onClose } = props;
    return (_jsxs(Bar, { className: "uf-responsive-sheetHeader", children: [_jsx(Bar.LeftEllipsis, { children: _jsx(Text, { as: "span", variant: "label", fullWidth: true, className: "uf-responsive-sheetTitle", children: title }) }), _jsx(Bar.Right, { children: _jsx(Button, { icon: "close", iconOnly: true, fullWidth: false, variant: "default", "aria-label": "Close", className: "uf-responsive-sheetClose", onClick: onClose }) })] }));
}
