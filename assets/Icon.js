import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import styles from './Icon.module.css';
// Runtime list of available icon names (single source of truth alongside IconName union).
export const ICON_NAMES = ['align-horizontal-center', 'align-horizontal-left', 'align-horizontal-right', 'align-vertical-bottom', 'align-vertical-center', 'align-vertical-top', 'alphabet', 'animation', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'cart', 'check', 'check-off', 'check-on', 'clean', 'close', 'cloud-done', 'component', 'cookie', 'copy', 'crop', 'date', 'delete', 'down', 'download', 'drag', 'edit', 'face', 'file', 'folder', 'full', 'info', 'left', 'legend', 'letter-spacing', 'line-height', 'link', 'minus', 'more', 'notification', 'panel', 'panel-right', 'pause', 'play', 'plus', 'props', 'radio-off', 'radio-on', 'random', 'render', 'restart', 'right', 'scroll', 'search', 'settings', 'size', 'sound', 'stat', 'store', 'switch', 'theme', 'type', 'up', 'user', 'userface'];
/**
 * Icon definitions - auto-generated from SVG files
 * DO NOT EDIT MANUALLY - run 'npm run generate:icons' to regenerate
 */
const icons = {
    'align-horizontal-center': (_jsx("path", { d: "M5 5.5H15M7 8.5H13M5 11.5H15M7 14.5H13", stroke: "currentColor" })),
    'align-horizontal-left': (_jsx("path", { d: "M5 5.5H15M5 8.5H11M5 11.5H15M5 14.5H11", stroke: "currentColor" })),
    'align-horizontal-right': (_jsx("path", { d: "M5 5.5H15M9 8.5H15M5 11.5H15M9 14.5H15", stroke: "currentColor" })),
    'align-vertical-bottom': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10 14L14 10M10 14L6 10M10 14L10 3", stroke: "currentColor" }), _jsx("path", { d: "M17 16.5H3", stroke: "currentColor" })] })),
    'align-vertical-center': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10 12L13 15M10 12L7 15M10 12L10 18", stroke: "currentColor" }), _jsx("path", { d: "M10 7L13 4M10 7L7 4M10 7L10 1", stroke: "currentColor" }), _jsx("path", { d: "M17 9.5L3 9.5", stroke: "currentColor" })] })),
    'align-vertical-top': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10 6L14 10M10 6L6 10M10 6L10 17", stroke: "currentColor" }), _jsx("path", { d: "M17 3.5L3 3.5", stroke: "currentColor" })] })),
    'alphabet': (_jsx("path", { d: "M2.13281 4L5.99938 7.50001M18.1328 4L13.9994 7.50001M5.99938 7.50001L7.99941 15.5L11.9994 15.5L13.9994 7.50001M5.99938 7.50001L13.9994 7.50001", stroke: "currentColor" })),
    'animation': (_jsx("path", { d: "M4 14.925C5.14285 15.4781 6.85713 15.9999 9.14283 15.9999C12 15.9999 15.9999 15.4781 15.9999 13.3912C15.9999 10.7165 12 10.2608 9.14283 10.2608C6.2857 10.2608 4 10.7825 4 11.826C4 13.502 7.42856 13.3912 9.14283 13.3912C12 13.3912 15.9741 12.4681 15.9999 9.21733C16.0176 6.99329 11.8367 6.03888 9.22439 6.03888C7.42856 6.03888 4 6.21342 4 7.65213C4 8.69559 6.85713 8.69559 9.14283 8.69559C11.3732 8.69559 15.9999 8.38375 15.9999 6.03888C15.9999 5.04347 14.8571 4 13.1428 4", stroke: "currentColor", strokeLinecap: "round" })),
    'arrow-down': (_jsx("path", { d: "M10 16L5 11M10 16L15 11M10 16L10 3", stroke: "currentColor" })),
    'arrow-left': (_jsx("path", { d: "M4 10L9 5M4 10L9 15M4 10L17 10", stroke: "currentColor" })),
    'arrow-right': (_jsx("path", { d: "M16 10L11 5M16 10L11 15M16 10L3 10", stroke: "currentColor" })),
    'arrow-up': (_jsx("path", { d: "M10 4L5 9M10 4L15 9M10 4L10 17", stroke: "currentColor" })),
    'cart': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M14.5 5.5H4.5L5.5 11.5H13.5L14.5 5.5ZM14.5 5.5L18.5 3", stroke: "currentColor" }), _jsx("circle", { cx: "5.5", cy: "15.5", r: "1.5", stroke: "currentColor" }), _jsx("circle", { cx: "13.5", cy: "15.5", r: "1.5", stroke: "currentColor" })] })),
    'check': (_jsx("path", { d: "M4.5 9.5L9 14M17 4.5L10 11.5", stroke: "currentColor" })),
    'check-off': (_jsx("path", { d: "M15 5H9.2H5V15H9.2H15V5Z", stroke: "currentColor" })),
    'check-on': (_jsxs(_Fragment, { children: [_jsx("rect", { x: "8", y: "8", width: "4", height: "4", fill: "currentColor" }), _jsx("path", { d: "M15 5H9.2H5V15H9.2H15V5Z", stroke: "currentColor" })] })),
    'clean': (_jsx("path", { d: "M13.9689 9.92398L16.9787 6.91421C17.7596 6.13334 17.7598 4.86737 16.9792 4.08625C16.1982 3.30476 14.9315 3.30456 14.1503 4.08579L11.1405 7.09555M4.26777 12.5709L7.09587 15.3983C8.51009 16.8126 9.90731 16.8133 11.7664 14.9543L13.8569 12.8637L8.20012 7.20686L6.10955 9.29743C4.60392 10.8031 3.97498 10.7404 2.5 10.8033L4.26777 12.5709ZM4.26777 12.5709C5.50556 13.8084 7.09619 13.278 8.15685 12.2173", stroke: "currentColor" })),
    'close': (_jsx("path", { d: "M16 4L10.75 9.25M10.75 10.75L16 16M4 4L9.25 9.25M9.25 10.75L4 16", stroke: "currentColor" })),
    'cloud-done': (_jsx("path", { d: "M8.5 9.5C8.5 7.29086 10 6 12 6C14 6 15 7.5 15 9M16 10C17.5 10 19 11.5 19 13.5C19 16 17.2091 17.25 15 17.25H12M7.5 10.5C6.5 10.5 5 11.567 5 13.5C5 15.433 6 17.25 8.5 17.25H10M9.18182 12.4176L11 14L14.1818 11", stroke: "currentColor" })),
    'component': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M13.5 13.5015L17.0015 10L13.5015 6.5L10.0008 2.99924L6.5 6.5L3 10L6.5 13.5L10.0008 17.0008L13.5015 13.5", stroke: "currentColor" }), _jsx("path", { d: "M13.5 6.50004L8.83334 11.1667L6.49996 13.5001M6.49996 6.50004L8.83334 8.83332L13.5 13.5001", stroke: "currentColor" })] })),
    'cookie': (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "9.2", cy: "7.2", r: "1.2", fill: "currentColor" }), _jsx("circle", { cx: "12.2", cy: "10.2", r: "1.2", fill: "currentColor" }), _jsx("circle", { cx: "8.2", cy: "12.2", r: "1.2", fill: "currentColor" }), _jsx("path", { d: "M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z", stroke: "currentColor" })] })),
    'copy': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M12.5 6.75H16.25V10.5M10.5 6.75H6.75V10.5M16.25 12.5V16.25H12.5M10.5 16.25H6.75V12.5", stroke: "currentColor" }), _jsx("path", { d: "M10.5 2.75H6.5H2.75V6.5V10.5", stroke: "currentColor" })] })),
    'crop': (_jsx("path", { d: "M6 4.50018L0.5 4.5L0.500001 10.0003L0.5 15.4998L6 15.5", stroke: "currentColor" })),
    'date': (_jsx("path", { d: "M15.5 9V15.5H11M4.5 9V15.5H9M12.75 2L12.75 4.5M7.25 2V4.5M12 9V11M8 9V11M12 12V14M8 12V14M4.5 4.5H15.5L15.5 7.5H4.5L4.5 4.5Z", stroke: "currentColor" })),
    'delete': (_jsx("path", { d: "M3 6.5H17M14.5 9V11L13.5 16.5H10H6.5L5.5 11V9M10 9V15M11.5 3.5V4.5H8.5V3.5H11.5Z", stroke: "currentColor" })),
    'down': (_jsx("path", { d: "M5 8L10 13L15 8", stroke: "currentColor" })),
    'download': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M15 7L10 12L5 7M10 2L10 9", stroke: "currentColor" }), _jsx("path", { d: "M15 16H5", stroke: "currentColor" })] })),
    'drag': (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "7", cy: "15", r: "1", fill: "currentColor" }), _jsx("circle", { cx: "13", cy: "15", r: "1", fill: "currentColor" }), _jsx("circle", { cx: "7", cy: "10", r: "1", fill: "currentColor" }), _jsx("circle", { cx: "13", cy: "10", r: "1", fill: "currentColor" }), _jsx("circle", { cx: "7", cy: "5", r: "1", fill: "currentColor" }), _jsx("circle", { cx: "13", cy: "5", r: "1", fill: "currentColor" })] })),
    'edit': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M4 13.9998L6 15.9998M14 9.00046L15.5 7.50046C16.2809 6.71959 16.2806 5.28116 15.5 4.50004C14.719 3.71856 13.2812 3.71889 12.5 4.50012L10.9758 5.99009L14 9.00046ZM8 14.9998L9.5 13.4998L6.5 10.4998L5 11.9998L3 16.5L3.5 17L8 14.9998Z", stroke: "currentColor" }), _jsx("path", { d: "M9.5 13.5L13 10M6.5 10.5L10 7", stroke: "currentColor" })] })),
    'face': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M5 13C5 15 7 17 10 17C12.5 17 13.5 16 14.5 15", stroke: "currentColor" }), _jsx("path", { d: "M11.5 6.50019L15.5 6.5V8.5L12.5 8.50019", stroke: "currentColor" }), _jsx("path", { d: "M4.5 8.50019V6.50019L8.5 6.5V8.5L4.5 8.50019Z", stroke: "currentColor" }), _jsx("path", { d: "M9.5 2L14 12H9.5L10.1699 14.5", stroke: "currentColor" })] })),
    'file': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M15.5 4.50019H9L4.5 4.5V15.5L9 15.5002H15.5V4.50019Z", stroke: "currentColor" }), _jsx("path", { d: "M7 8.5H13", stroke: "currentColor" }), _jsx("path", { d: "M7 11.5H11", stroke: "currentColor" })] })),
    'folder': (_jsx("path", { d: "M16.5 6.5H10.5L9 4.5H3.5V15.5H9.2H16.5L16.5 6.5Z", stroke: "currentColor" })),
    'full': (_jsx("path", { d: "M13.5 6.5L6.5 13.5M9 3.75L16.25 3.75V11M11 16.25L3.75 16.25V9", stroke: "currentColor" })),
    'info': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10 10V13.5", stroke: "currentColor" }), _jsx("circle", { cx: "10.0008", cy: "7.2", r: "1.2", fill: "currentColor" }), _jsx("path", { d: "M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z", stroke: "currentColor" })] })),
    'left': (_jsx("path", { d: "M12 5L7 10L12 15", stroke: "currentColor" })),
    'legend': (_jsx("path", { d: "M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z", fill: "currentColor" })),
    'letter-spacing': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M15.5 4L15.5 16M4.5 4L4.5 16", stroke: "currentColor" }), _jsx("path", { d: "M10 13L10 8", stroke: "currentColor" }), _jsx("path", { d: "M13 7.5H7", stroke: "currentColor" })] })),
    'line-height': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M4 4.5H16M4 15.5H16", stroke: "currentColor" }), _jsx("path", { d: "M10 13L10 8", stroke: "currentColor" }), _jsx("path", { d: "M13 7.5H7", stroke: "currentColor" })] })),
    'link': (_jsx("path", { d: "M9 4.75L7.25 4.75C4.35051 4.75 2 7.1005 2 10C2 12.8995 4.35051 15.25 7.25 15.25L9 15.25M11 4.75L12.75 4.75C15.6495 4.75 18 7.1005 18 10C18 12.8995 15.6495 15.25 12.75 15.25L11 15.25M7 10L13 10", stroke: "currentColor", strokeLinejoin: "round" })),
    'minus': (_jsx("path", { d: "M3 10H17", stroke: "currentColor" })),
    'more': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10.0008 8.30117C10.9397 8.30117 11.7008 9.06229 11.7008 10.0012C11.7008 10.9401 10.9397 11.7012 10.0008 11.7012C9.0619 11.7012 8.30078 10.9401 8.30078 10.0012C8.30078 9.06229 9.0619 8.30117 10.0008 8.30117Z", fill: "currentColor" }), _jsx("path", { d: "M15.5008 8.30117C16.4397 8.30117 17.2008 9.06229 17.2008 10.0012C17.2008 10.9401 16.4397 11.7012 15.5008 11.7012C14.5619 11.7012 13.8008 10.9401 13.8008 10.0012C13.8008 9.06229 14.5619 8.30117 15.5008 8.30117Z", fill: "currentColor" }), _jsx("path", { d: "M4.50078 8.30117C5.43967 8.30117 6.20078 9.06229 6.20078 10.0012C6.20078 10.9401 5.43967 11.7012 4.50078 11.7012C3.5619 11.7012 2.80078 10.9401 2.80078 10.0012C2.80078 9.06229 3.5619 8.30117 4.50078 8.30117Z", fill: "currentColor" })] })),
    'notification': (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "10.0008", cy: "16.9998", r: "1.7", fill: "currentColor" }), _jsx("path", { d: "M10 4.5C6 4.5 4.5 7.5 4.5 10.5V12.25H1.5M10 4.5C14 4.5 15.5 7.5 15.5 10.5V12.25H18.5M10 4.5V1M13 12.25H10H7", stroke: "currentColor", strokeMiterlimit: "10" })] })),
    'panel': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M8.50074 4.5H15.4999C16.0522 4.5 16.5 4.94776 16.4999 5.50007L16.4993 14.5001C16.4993 15.0523 16.0516 15.5 15.4993 15.5H8.5M8.00074 4.5H4.50067C3.94842 4.5 3.50071 4.94767 3.50067 5.49993L3.50007 14.4999C3.50003 15.0522 3.94776 15.5 4.50007 15.5H8", stroke: "currentColor" }), _jsx("path", { d: "M8.5 4L8.5 16", stroke: "currentColor" })] })),
    'panel-right': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M3.50067 5.49993L3.50007 14.4999C3.50003 15.0522 3.94776 15.5 4.50007 15.5H15.4993C16.0515 15.5 16.4992 15.0523 16.4993 14.5001L16.4999 5.50007C16.5 4.94776 16.0522 4.5 15.4999 4.5H4.50067C3.94842 4.5 3.50071 4.94767 3.50067 5.49993Z", stroke: "currentColor" }), _jsx("path", { d: "M11.5 4L11.5 16", stroke: "currentColor" })] })),
    'pause': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M7 5L7 15", stroke: "currentColor" }), _jsx("path", { d: "M13 5V15", stroke: "currentColor" })] })),
    'play': (_jsx("path", { d: "M14 10L8 6V14L14 10Z", stroke: "currentColor" })),
    'plus': (_jsx("path", { d: "M10 3V9M10 17V11M3 10H9M17 10H11", stroke: "currentColor" })),
    'props': (_jsx("path", { d: "M15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6ZM15 6L19 6M5 14C5 12.3431 6.34315 11 8 11C9.65685 11 11 12.3431 11 14C11 15.6569 9.65685 17 8 17C6.34315 17 5 15.6569 5 14ZM5 14L1 14M19 14L13 14M1 6L7 6", stroke: "currentColor" })),
    'radio-off': (_jsx("path", { d: "M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z", stroke: "currentColor" })),
    'radio-on': (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "10", cy: "10", r: "3", fill: "currentColor" }), _jsx("path", { d: "M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z", stroke: "currentColor" })] })),
    'random': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M12.9991 6.5C15 7 18 9 18 13C18 16 16.5 18 15 19M9.74913 6.5L11.2491 8V5L9.74913 6.5Z", stroke: "currentColor" }), _jsx("path", { d: "M5 14L9 10L13 14L9 18L5 14Z", stroke: "currentColor" })] })),
    'render': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M16.4998 12.6667V16.5H12.6665M16.4998 7.33333V3.5H12.6665M3.5 7.33333V3.5L7.33313 3.5M3.5 12.6667V16.5H7.33313", stroke: "currentColor" }), _jsx("path", { d: "M10.5 6L8 10.0005L12 10L9.5 14", stroke: "currentColor" })] })),
    'restart': (_jsx("path", { d: "M9 17C7.5 17 5 15.5 5 12C5 10.223 5.7725 8.59864 7 7.5M15 7.5C16.5 7.5 19 9 19 12.5C19 14.277 18.2275 15.9014 17 17M12.25 16.5L10.75 15V18L12.25 16.5ZM11.75 7.5L13.25 9V6L11.75 7.5Z", stroke: "currentColor" })),
    'right': (_jsx("path", { d: "M8 5L13 10L8 15", stroke: "currentColor" })),
    'scroll': (_jsx("path", { d: "M6.5 15.5002C4.84315 15.5002 3.5 14.5002 3.5 12.5002L3.5 4.50019L11.5 4.5V10.5M6.5 15.5002C8.15685 15.5002 9.5 14.5002 9.5 12.5002H17.5C17.5 14.5002 16.5 15.5002 14.5 15.5002H6.5Z", stroke: "currentColor" })),
    'search': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M14.5 14.5L18 18", stroke: "currentColor" }), _jsx("path", { d: "M4 9C4 5.81818 6.5 4 9 4C11.5 4 14 5.81818 14 9C14 12.1818 11.5 14 9 14C6.5 14 4 12.1818 4 9Z", stroke: "currentColor" })] })),
    'settings': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10 3L11.8751 5.47299L14.9497 5.05025L14.527 8.12485L17 10L14.527 11.8751L14.9497 14.9497L11.8751 14.527L10 17L8.12485 14.527L5.05025 14.9497L5.47299 11.8751L3 10L5.47299 8.12485L5.05025 5.05025L8.12485 5.47299L10 3Z", stroke: "currentColor", strokeLinejoin: "bevel" }), _jsx("circle", { cx: "10", cy: "10", r: "2", stroke: "currentColor", strokeLinejoin: "bevel" })] })),
    'size': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M15.5 4.5H11M15.5 4.5V9M15.5 4.5L11 9", stroke: "currentColor" }), _jsx("path", { d: "M7 16L7 11", stroke: "currentColor" }), _jsx("path", { d: "M10 10.5H4", stroke: "currentColor" })] })),
    'sound': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M9 5H8L4 9V11L8 15H9V5Z", stroke: "currentColor" }), _jsx("path", { d: "M11 5C11 5 16 5 16 10C16 15 11 15 11 15", stroke: "currentColor" }), _jsx("path", { d: "M11 8C11 8 13 8 13 10C13 12 11 12 11 12", stroke: "currentColor" })] })),
    'stat': (_jsx("path", { d: "M4 10L4 16M12 12L12 16M8 6L8 16M16 2L16 16", stroke: "currentColor" })),
    'store': (_jsx("path", { d: "M9.5 15.5L5.5 11.4998V4.49981L10 9.5M9.5 15.5H10.5M9.5 15.5L10 9.5M10 9.5L14.5 4.49981V11.4998L10.5 15.5M10 9.5L10.5 2M10.5 15.5H17.5L17.4993 9.5H15M10.5 15.5H2.50074L2.5 9.5H5", stroke: "currentColor" })),
    'switch': (_jsxs(_Fragment, { children: [_jsx("rect", { x: "1", y: "4", width: "18", height: "12", rx: "6", fill: "currentColor" }), _jsx("circle", { cx: "7", cy: "10", r: "4.5", fill: "var(--uf-color-background)" })] })),
    'theme': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M7.10502 12.8949C5.50616 11.2961 5.50616 8.7038 7.10502 7.10495C8.70387 5.50609 11.2961 5.50609 12.895 7.10495L7.10502 12.8949Z", fill: "currentColor" }), _jsx("path", { d: "M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z", stroke: "currentColor" })] })),
    'type': (_jsxs(_Fragment, { children: [_jsx("path", { d: "M10 16L10 6", stroke: "currentColor" }), _jsx("path", { d: "M16 5.5H4", stroke: "currentColor" })] })),
    'up': (_jsx("path", { d: "M5 12L10 7L15 12", stroke: "currentColor" })),
    'user': (_jsx("path", { d: "M4 17C4 14 6 12 10 12C14 12 16 14 16 17M15.5 16.5H4.5M13 6C13 4 12 3 10 3C8 3 7 4 7 6C7 8 8 9 10 9C12 9 13 8 13 6Z", stroke: "currentColor" })),
    'userface': (_jsxs(_Fragment, { children: [_jsxs("g", { clipPath: "url(#clip0_3096_33620)", children: [_jsx("circle", { cx: "10.0008", cy: "10.0002", r: "8.7", transform: "rotate(-90 10.0008 10.0002)", stroke: "currentColor" }), _jsx("path", { d: "M10.8008 5.7002C12.7049 6.03748 14.4008 7.56021 14.4008 10.0002C14.4008 12.4402 12.7049 13.9629 10.8008 14.3002", stroke: "currentColor" }), _jsx("rect", { x: "6", y: "6.29981", width: "2.3", height: "2.3", fill: "currentColor" }), _jsx("rect", { x: "6", y: "11.3999", width: "2.3", height: "2.3", fill: "currentColor" })] }), _jsx("defs", { children: _jsx("clipPath", { id: "clip0_3096_33620", children: _jsx("rect", { width: "20", height: "20", fill: "var(--uf-color-background)", transform: "translate(8.74228e-07 20) rotate(-90)" }) }) })] }))
};
// viewBox per icon (from source SVG). Fallback is 0 0 20 20 for legacy icons that omit viewBox.
const ICON_VIEWBOX = {
    'align-horizontal-center': "0 0 20 20",
    'align-horizontal-left': "0 0 20 20",
    'align-horizontal-right': "0 0 20 20",
    'align-vertical-bottom': "0 0 20 20",
    'align-vertical-center': "0 0 20 20",
    'align-vertical-top': "0 0 20 20",
    'alphabet': "0 0 20 20",
    'animation': "0 0 20 20",
    'arrow-down': "0 0 20 20",
    'arrow-left': "0 0 20 20",
    'arrow-right': "0 0 20 20",
    'arrow-up': "0 0 20 20",
    'cart': "0 0 20 20",
    'check': "0 0 20 20",
    'check-off': "0 0 20 20",
    'check-on': "0 0 20 20",
    'clean': "0 0 20 20",
    'close': "0 0 20 20",
    'cloud-done': "0 0 24 24",
    'component': "0 0 20 20",
    'cookie': "0 0 20 20",
    'copy': "0 0 20 20",
    'crop': "0 0 10 20",
    'date': "0 0 20 20",
    'delete': "0 0 20 20",
    'down': "0 0 20 20",
    'download': "0 0 20 20",
    'drag': "0 0 20 20",
    'edit': "0 0 20 20",
    'face': "0 0 20 20",
    'file': "0 0 20 20",
    'folder': "0 0 20 20",
    'full': "0 0 20 20",
    'info': "0 0 20 20",
    'left': "0 0 20 20",
    'legend': "0 0 20 20",
    'letter-spacing': "0 0 20 20",
    'line-height': "0 0 20 20",
    'link': "0 0 20 20",
    'minus': "0 0 20 20",
    'more': "0 0 20 20",
    'notification': "0 0 20 20",
    'panel': "0 0 20 20",
    'panel-right': "0 0 20 20",
    'pause': "0 0 20 20",
    'play': "0 0 20 20",
    'plus': "0 0 20 20",
    'props': "0 0 20 20",
    'radio-off': "0 0 20 20",
    'radio-on': "0 0 20 20",
    'random': "0 0 24 24",
    'render': "0 0 20 20",
    'restart': "0 0 24 24",
    'right': "0 0 20 20",
    'scroll': "0 0 20 20",
    'search': "0 0 20 20",
    'settings': "0 0 20 20",
    'size': "0 0 20 20",
    'sound': "0 0 20 20",
    'stat': "0 0 20 20",
    'store': "0 0 20 20",
    'switch': "0 0 20 20",
    'theme': "0 0 20 20",
    'type': "0 0 20 20",
    'up': "0 0 20 20",
    'user': "0 0 20 20",
    'userface': "0 0 20 20"
};
// Native icon size per SVG (width/height). This is our "as-is" baseline size when size prop is not provided.
const ICON_NATIVE_SIZE = {
    'align-horizontal-center': 20,
    'align-horizontal-left': 20,
    'align-horizontal-right': 20,
    'align-vertical-bottom': 20,
    'align-vertical-center': 20,
    'align-vertical-top': 20,
    'alphabet': 20,
    'animation': 20,
    'arrow-down': 20,
    'arrow-left': 20,
    'arrow-right': 20,
    'arrow-up': 20,
    'cart': 20,
    'check': 20,
    'check-off': 20,
    'check-on': 20,
    'clean': 20,
    'close': 20,
    'cloud-done': 24,
    'component': 20,
    'cookie': 20,
    'copy': 20,
    'date': 20,
    'delete': 20,
    'down': 20,
    'download': 20,
    'drag': 20,
    'edit': 20,
    'face': 20,
    'file': 20,
    'folder': 20,
    'full': 20,
    'info': 20,
    'left': 20,
    'legend': 20,
    'letter-spacing': 20,
    'line-height': 20,
    'link': 20,
    'minus': 20,
    'more': 20,
    'notification': 20,
    'panel': 20,
    'panel-right': 20,
    'pause': 20,
    'play': 20,
    'plus': 20,
    'props': 20,
    'radio-off': 20,
    'radio-on': 20,
    'random': 24,
    'render': 20,
    'restart': 24,
    'right': 20,
    'scroll': 20,
    'search': 20,
    'settings': 20,
    'size': 20,
    'sound': 20,
    'stat': 20,
    'store': 20,
    'switch': 20,
    'theme': 20,
    'type': 20,
    'up': 20,
    'user': 20,
    'userface': 20
};
const IconContext = React.createContext({
    size: undefined,
    square: true,
    registry: {},
    resolveIcon: undefined,
});
export const IconProvider = ({ children, size, square = true, registry, resolveIcon, }) => {
    const parent = React.useContext(IconContext);
    const value = React.useMemo(() => ({
        size: size !== null && size !== void 0 ? size : parent.size,
        square: square !== null && square !== void 0 ? square : parent.square,
        registry: Object.assign(Object.assign({}, parent.registry), (registry || {})),
        resolveIcon: resolveIcon !== null && resolveIcon !== void 0 ? resolveIcon : parent.resolveIcon,
    }), [parent, size, square, registry, resolveIcon]);
    return (_jsx(IconContext.Provider, { value: value, children: children }));
};
function looksLikeUrl(input) {
    return /^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/.test(input) || /\.svg(\?.*)?$/i.test(input);
}
function toRegistryEntry(source) {
    if (!source)
        return null;
    if (typeof source === 'object' && !React.isValidElement(source) && 'content' in source) {
        return {
            content: source.content,
            viewBox: source.viewBox,
            nativeSize: source.nativeSize,
        };
    }
    if (typeof source === 'function')
        return null;
    return { content: source };
}
/**
 * Icon component for Components design system
 * Renders inline SVG icons for better performance and styling
 */
export const Icon = ({ name, icon, src, size, square, className = '', style = {}, label, title, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const ctx = React.useContext(IconContext);
    const squareBox = (_a = square !== null && square !== void 0 ? square : ctx.square) !== null && _a !== void 0 ? _a : true;
    const requestedName = (typeof name === 'string' && name.trim().length > 0) ? name.trim() : undefined;
    const sourceFromProps = (_b = src !== null && src !== void 0 ? src : icon) !== null && _b !== void 0 ? _b : requestedName;
    const builtinEntry = requestedName && icons[requestedName]
        ? {
            content: icons[requestedName],
            viewBox: ICON_VIEWBOX[requestedName] || '0 0 20 20',
            nativeSize: ICON_NATIVE_SIZE[requestedName] || 20,
        }
        : null;
    const providerSource = requestedName
        ? ((_e = (_c = ctx.registry[requestedName]) !== null && _c !== void 0 ? _c : (_d = ctx.resolveIcon) === null || _d === void 0 ? void 0 : _d.call(ctx, requestedName)) !== null && _e !== void 0 ? _e : null)
        : null;
    const providerEntry = toRegistryEntry(providerSource);
    const explicitEntry = toRegistryEntry((typeof sourceFromProps === 'object' || typeof sourceFromProps === 'function')
        ? sourceFromProps
        : null);
    const nativeSize = (_h = (_g = (_f = explicitEntry === null || explicitEntry === void 0 ? void 0 : explicitEntry.nativeSize) !== null && _f !== void 0 ? _f : providerEntry === null || providerEntry === void 0 ? void 0 : providerEntry.nativeSize) !== null && _g !== void 0 ? _g : builtinEntry === null || builtinEntry === void 0 ? void 0 : builtinEntry.nativeSize) !== null && _h !== void 0 ? _h : 20;
    const resolvedSize = (typeof size === 'number' && Number.isFinite(size))
        ? size
        : (typeof ctx.size === 'number' && Number.isFinite(ctx.size))
            ? ctx.size
            : nativeSize;
    const mergedStyle = Object.assign(Object.assign({}, style), (squareBox ? { width: resolvedSize, height: resolvedSize } : {}));
    const mergedClassName = `${styles.icon} ${className}`.trim();
    const ariaProps = label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true };
    // URL source (from explicit src/icon string or provider string)
    const stringSource = typeof sourceFromProps === 'string'
        ? sourceFromProps
        : (typeof providerSource === 'string' ? providerSource : null);
    if (stringSource && looksLikeUrl(stringSource)) {
        return (_jsx("img", { className: mergedClassName, src: stringSource, width: resolvedSize, height: squareBox ? resolvedSize : undefined, style: mergedStyle, alt: label || '', "data-icon": requestedName || 'external' }));
    }
    // Component source
    const componentSource = (typeof sourceFromProps === 'function'
        ? sourceFromProps
        : (typeof providerSource === 'function' ? providerSource : null));
    if (componentSource) {
        const Comp = componentSource;
        return (_jsx(Comp, { size: resolvedSize, className: mergedClassName, style: mergedStyle }));
    }
    // Full SVG element source
    const elementSource = (React.isValidElement(sourceFromProps) ? sourceFromProps
        : React.isValidElement(providerSource) ? providerSource
            : null);
    if (elementSource && typeof elementSource.type === 'string' && elementSource.type.toLowerCase() === 'svg') {
        return React.cloneElement(elementSource, Object.assign({ className: `${mergedClassName} ${elementSource.props.className || ''}`.trim(), width: resolvedSize, height: squareBox ? resolvedSize : elementSource.props.height, style: Object.assign(Object.assign({}, elementSource.props.style), mergedStyle), 'data-icon': requestedName || elementSource.props['data-icon'] || 'custom' }, ariaProps));
    }
    const iconEntry = (_j = explicitEntry !== null && explicitEntry !== void 0 ? explicitEntry : providerEntry) !== null && _j !== void 0 ? _j : builtinEntry;
    const iconContent = (_k = iconEntry === null || iconEntry === void 0 ? void 0 : iconEntry.content) !== null && _k !== void 0 ? _k : null;
    const viewBox = (iconEntry === null || iconEntry === void 0 ? void 0 : iconEntry.viewBox) || (builtinEntry === null || builtinEntry === void 0 ? void 0 : builtinEntry.viewBox) || '0 0 20 20';
    if (!iconContent) {
        if (requestedName)
            console.warn(`Icon "${requestedName}" not found`);
        return null;
    }
    return (_jsxs("svg", Object.assign({ className: mergedClassName, width: resolvedSize, height: squareBox ? resolvedSize : undefined, viewBox: viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", style: mergedStyle, "data-icon": requestedName || 'custom' }, ariaProps, { children: [title ? _jsx("title", { children: title }) : null, iconContent] })));
};
export default Icon;
