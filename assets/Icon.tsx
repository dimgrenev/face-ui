import React from 'react';

export type IconSource =
  | string
  | React.ReactElement
  | React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  | {
      content: React.ReactNode;
      viewBox?: string;
      nativeSize?: number;
      nativeWidth?: number;
      nativeHeight?: number;
    };

export interface IconProviderProps {
  children: React.ReactNode;
  /** Compatibility-only. Face UI icons always render at 20x20. */
  size?: number;
  /** Compatibility-only. Face UI icons always render at 20x20. */
  square?: boolean;
  /** Deprecated compatibility hook. External icon registries resolve to notdef. */
  registry?: Record<string, IconSource>;
  /** Deprecated compatibility hook. External icon registries resolve to notdef. */
  resolveIcon?: (name: string) => IconSource | null | undefined;
}

export interface IconProps {
  /** Registry icon name (backward-compatible). */
  name?: IconName | string;
  /** Compatibility input. String names resolve to Face UI icons; custom sources render notdef. */
  icon?: IconSource;
  /** Deprecated compatibility input. External URLs render notdef. */
  src?: string;
  /** Compatibility-only. Face UI icons always render at 20x20. */
  size?: number;
  /** Compatibility-only. Face UI icons always render at 20x20. */
  square?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible label. If omitted, icon is decorative. */
  label?: string;
  /** Optional title element for inline SVG. */
  title?: string;
}

const FACE_UI_ICON_SIZE = 20;

const layoutSidebarLeftIcon = (
  <>
    <path d="M5.5 6.36035C5.85346 6.36035 6.13965 6.64654 6.13965 7V13C6.13965 13.3535 5.85346 13.6396 5.5 13.6396C5.14654 13.6396 4.86035 13.3535 4.86035 13V7C4.86035 6.64654 5.14654 6.36035 5.5 6.36035Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M15 3.86035C16.458 3.86035 17.6396 5.04197 17.6396 6.5V13.5C17.6396 14.958 16.458 16.1396 15 16.1396H5C3.54197 16.1396 2.36035 14.958 2.36035 13.5V6.5C2.36035 5.04197 3.54197 3.86035 5 3.86035H15ZM5 5.13965C4.24889 5.13965 3.63965 5.74889 3.63965 6.5V13.5C3.63965 14.2511 4.24889 14.8604 5 14.8604H15C15.7511 14.8604 16.3604 14.2511 16.3604 13.5V6.5C16.3604 5.74889 15.7511 5.13965 15 5.13965H5Z" fill="currentColor"/>
  </>
);

const layoutSidebarLeftOpenIcon = (
  <path fillRule="evenodd" clipRule="evenodd" d="M15 3.86035C16.458 3.86035 17.6396 5.04197 17.6396 6.5V13.5C17.6396 14.958 16.458 16.1396 15 16.1396H5C3.54197 16.1396 2.36035 14.958 2.36035 13.5V6.5C2.36035 5.04197 3.54197 3.86035 5 3.86035H15ZM7.13965 14.8604H15C15.7511 14.8604 16.3604 14.2511 16.3604 13.5V6.5C16.3604 5.74889 15.7511 5.13965 15 5.13965H7.13965V14.8604ZM5 5.13965C4.24889 5.13965 3.63965 5.74889 3.63965 6.5V13.5C3.63965 14.2511 4.24889 14.8604 5 14.8604H5.86035V5.13965H5Z" fill="currentColor"/>
);

const layoutSidebarRightIcon = (
  <>
    <path d="M14.5 6.36035C14.1465 6.36035 13.8604 6.64654 13.8604 7V13C13.8604 13.3535 14.1465 13.6396 14.5 13.6396C14.8535 13.6396 15.1396 13.3535 15.1396 13V7C15.1396 6.64654 14.8535 6.36035 14.5 6.36035Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M5 3.86035C3.54197 3.86035 2.36035 5.04197 2.36035 6.5V13.5C2.36035 14.958 3.54197 16.1396 5 16.1396H15C16.458 16.1396 17.6396 14.958 17.6396 13.5V6.5C17.6396 5.04197 16.458 3.86035 15 3.86035H5ZM15 5.13965C15.7511 5.13965 16.3604 5.74889 16.3604 6.5V13.5C16.3604 14.2511 15.7511 14.8604 15 14.8604H5C4.24889 14.8604 3.63965 14.2511 3.63965 13.5V6.5C3.63965 5.74889 4.24889 5.13965 5 5.13965H15Z" fill="currentColor"/>
  </>
);

const layoutSidebarRightOpenIcon = (
  <path fillRule="evenodd" clipRule="evenodd" d="M5 3.86035C3.54197 3.86035 2.36035 5.04197 2.36035 6.5V13.5C2.36035 14.958 3.54197 16.1396 5 16.1396H15C16.458 16.1396 17.6396 14.958 17.6396 13.5V6.5C17.6396 5.04197 16.458 3.86035 15 3.86035H5ZM12.8604 14.8604H5C4.24889 14.8604 3.63965 14.2511 3.63965 13.5V6.5C3.63965 5.74889 4.24889 5.13965 5 5.13965H12.8604V14.8604ZM15 5.13965C15.7511 5.13965 16.3604 5.74889 16.3604 6.5V13.5C16.3604 14.2511 15.7511 14.8604 15 14.8604H14.1396V5.13965H15Z" fill="currentColor"/>
);

/**
 * Built-in icon definitions. This registry is the single React runtime source.
 */
const icons = {
  'align-horizontal-center': (
    <path d="M5 5.5H15M7 8.5H13M5 11.5H15M7 14.5H13" stroke="currentColor"/>
  ),
  'align-horizontal-left': (
    <path d="M5 5.5H15M5 8.5H11M5 11.5H15M5 14.5H11" stroke="currentColor"/>
  ),
  'align-horizontal-right': (
    <path d="M5 5.5H15M9 8.5H15M5 11.5H15M9 14.5H15" stroke="currentColor"/>
  ),
  'align-vertical-bottom': (
    <>
      <path d="M10 14L14 10M10 14L6 10M10 14L10 3" stroke="currentColor"/>
      <path d="M17 16.5H3" stroke="currentColor"/>
    </>
  ),
  'align-vertical-center': (
    <>
      <path d="M10 12L13 15M10 12L7 15M10 12L10 18" stroke="currentColor"/>
      <path d="M10 7L13 4M10 7L7 4M10 7L10 1" stroke="currentColor"/>
      <path d="M17 9.5L3 9.5" stroke="currentColor"/>
    </>
  ),
  'align-vertical-top': (
    <>
      <path d="M10 6L14 10M10 6L6 10M10 6L10 17" stroke="currentColor"/>
      <path d="M17 3.5L3 3.5" stroke="currentColor"/>
    </>
  ),
  'alphabet': (
    <path d="M2.13281 4L5.99938 7.50001M18.1328 4L13.9994 7.50001M5.99938 7.50001L7.99941 15.5L11.9994 15.5L13.9994 7.50001M5.99938 7.50001L13.9994 7.50001" stroke="currentColor"/>
  ),
  'animation': (
    <path d="M4 14.925C5.14285 15.4781 6.85713 15.9999 9.14283 15.9999C12 15.9999 15.9999 15.4781 15.9999 13.3912C15.9999 10.7165 12 10.2608 9.14283 10.2608C6.2857 10.2608 4 10.7825 4 11.826C4 13.502 7.42856 13.3912 9.14283 13.3912C12 13.3912 15.9741 12.4681 15.9999 9.21733C16.0176 6.99329 11.8367 6.03888 9.22439 6.03888C7.42856 6.03888 4 6.21342 4 7.65213C4 8.69559 6.85713 8.69559 9.14283 8.69559C11.3732 8.69559 15.9999 8.38375 15.9999 6.03888C15.9999 5.04347 14.8571 4 13.1428 4" stroke="currentColor" strokeLinecap="round"/>
  ),
  'arrow-down': (
    <path d="M10 16L5 11M10 16L15 11M10 16L10 3" stroke="currentColor"/>
  ),
  'arrow-left': (
    <path d="M4 10L9 5M4 10L9 15M4 10L17 10" stroke="currentColor"/>
  ),
  'arrow-right': (
    <path d="M16 10L11 5M16 10L11 15M16 10L3 10" stroke="currentColor"/>
  ),
  'arrow-up': (
    <path d="M10 4L5 9M10 4L15 9M10 4L10 17" stroke="currentColor"/>
  ),
  'cart': (
    <>
      <path d="M14.5 5.5H4.5L5.5 11.5H13.5L14.5 5.5ZM14.5 5.5L18.5 3" stroke="currentColor"/>
      <circle cx="5.5" cy="15.5" r="1.5" stroke="currentColor"/>
      <circle cx="13.5" cy="15.5" r="1.5" stroke="currentColor"/>
    </>
  ),
  'chat': (
    <>
      <path d="M11.5 4.50019H9L8.50016 4.50016C6.29096 4.50007 4.5 6.29096 4.5 8.50016V11.5002C4.5 13.7092 6.29076 15.5001 8.49983 15.5002L9 15.5002H11.5C13.7091 15.5002 15.5 13.7093 15.5 11.5002V8.50019C15.5 6.29105 13.7091 4.50019 11.5 4.50019Z" stroke="currentColor"/>
      <path d="M7 8.5H13" stroke="currentColor"/>
      <path d="M7 11.5H11" stroke="currentColor"/>
    </>
  ),
  'check': (
    <path d="M4.5 9.5L9 14M17 4.5L10 11.5" stroke="currentColor"/>
  ),
  'check-off': (
    <path d="M15 5H9.2H5V15H9.2H15V5Z" stroke="currentColor"/>
  ),
  'check-on': (
    <>
      <rect x="8" y="8" width="4" height="4" fill="currentColor"/>
      <path d="M15 5H9.2H5V15H9.2H15V5Z" stroke="currentColor"/>
    </>
  ),
  'clean': (
    <path d="M13.9689 9.92398L16.9787 6.91421C17.7596 6.13334 17.7598 4.86737 16.9792 4.08625C16.1982 3.30476 14.9315 3.30456 14.1503 4.08579L11.1405 7.09555M4.26777 12.5709L7.09587 15.3983C8.51009 16.8126 9.90731 16.8133 11.7664 14.9543L13.8569 12.8637L8.20012 7.20686L6.10955 9.29743C4.60392 10.8031 3.97498 10.7404 2.5 10.8033L4.26777 12.5709ZM4.26777 12.5709C5.50556 13.8084 7.09619 13.278 8.15685 12.2173" stroke="currentColor"/>
  ),
  'close': (
    <path d="M16 4L10.75 9.25M10.75 10.75L16 16M4 4L9.25 9.25M9.25 10.75L4 16" stroke="currentColor"/>
  ),
  'cloud-done': (
    <path d="M8.5 9.5C8.5 7.29086 10 6 12 6C14 6 15 7.5 15 9M16 10C17.5 10 19 11.5 19 13.5C19 16 17.2091 17.25 15 17.25H12M7.5 10.5C6.5 10.5 5 11.567 5 13.5C5 15.433 6 17.25 8.5 17.25H10M9.18182 12.4176L11 14L14.1818 11" stroke="currentColor"/>
  ),
  'component': (
    <>
      <path d="M13.5 13.5015L17.0015 10L13.5015 6.5L10.0008 2.99924L6.5 6.5L3 10L6.5 13.5L10.0008 17.0008L13.5015 13.5" stroke="currentColor"/>
      <path d="M13.5 6.50004L8.83334 11.1667L6.49996 13.5001M6.49996 6.50004L8.83334 8.83332L13.5 13.5001" stroke="currentColor"/>
    </>
  ),
  'cookie': (
    <>
      <circle cx="9.2" cy="7.2" r="1.2" fill="currentColor"/>
      <circle cx="12.2" cy="10.2" r="1.2" fill="currentColor"/>
      <circle cx="8.2" cy="12.2" r="1.2" fill="currentColor"/>
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor"/>
    </>
  ),
  'copy': (
    <>
      <path d="M12.5 6.75H16.25V10.5M10.5 6.75H6.75V10.5M16.25 12.5V16.25H12.5M10.5 16.25H6.75V12.5" stroke="currentColor"/>
      <path d="M10.5 2.75H6.5H2.75V6.5V10.5" stroke="currentColor"/>
    </>
  ),
  'crop': (
    <path d="M6 4.50018L0.5 4.5L0.500001 10.0003L0.5 15.4998L6 15.5" stroke="currentColor"/>
  ),
  'cursor': (
    <path d="M4 2L4 14L7.5 10.5L12 16L14 14.5L9.5 8.5L14 7L4 2Z" stroke="currentColor" strokeLinejoin="round"/>
  ),
  'date': (
    <path d="M15.5 9V15.5H11M4.5 9V15.5H9M12.75 2L12.75 4.5M7.25 2V4.5M12 9V11M8 9V11M12 12V14M8 12V14M4.5 4.5H15.5L15.5 7.5H4.5L4.5 4.5Z" stroke="currentColor"/>
  ),
  'delete': (
    <path d="M3 6.5H17M14.5 9V11L13.5 16.5H10H6.5L5.5 11V9M10 9V15M11.5 3.5V4.5H8.5V3.5H11.5Z" stroke="currentColor"/>
  ),
  'design-tool': (
    <>
      <path d="M10 2V7M10 18V13M2 10H7M18 10H13" stroke="currentColor"/>
      <path d="M13.5 13.5L13.5 6.5L6.5 6.50019V13.5002L13.5 13.5Z" stroke="currentColor"/>
    </>
  ),
  'dev-tools': (
    <>
      <path d="M3.50067 5.49993L3.50007 14.4999C3.50003 15.0522 3.94776 15.5 4.50007 15.5H15.4993C16.0516 15.5 16.4993 15.0523 16.4993 14.5001L16.4999 5.50007C16.5 4.94776 16.0522 4.5 15.4999 4.5H4.50067C3.94842 4.5 3.50071 4.94767 3.50067 5.49993Z" stroke="currentColor"/>
      <path d="M10 12.5H13" stroke="currentColor"/>
      <path d="M7 12L9.5 9.5L7 7" stroke="currentColor"/>
    </>
  ),
  'down': (
    <path d="M5 8L10 13L15 8" stroke="currentColor"/>
  ),
  'download': (
    <>
      <path d="M15 7L10 12L5 7M10 2L10 9" stroke="currentColor"/>
      <path d="M15 16H5" stroke="currentColor"/>
    </>
  ),
  'drag': (
    <>
      <circle cx="7" cy="15" r="1" fill="currentColor"/>
      <circle cx="13" cy="15" r="1" fill="currentColor"/>
      <circle cx="7" cy="10" r="1" fill="currentColor"/>
      <circle cx="13" cy="10" r="1" fill="currentColor"/>
      <circle cx="7" cy="5" r="1" fill="currentColor"/>
      <circle cx="13" cy="5" r="1" fill="currentColor"/>
    </>
  ),
  'ds': (
    <>
      <path d="M10 10C8.25 10 6.5 8.72727 6.5 6.5C6.5 4.27273 8.25 3 10 3C11.75 3 13.5 4.27273 13.5 6.5" stroke="currentColor"/>
      <path d="M10 10C11.75 10 13.5 11.2727 13.5 13.5C13.5 15.7273 11.75 17 10 17C8.25 17 6.5 15.7273 6.5 13.5" stroke="currentColor"/>
      <path d="M10 10C10 11.75 8.72727 13.5 6.5 13.5C4.27273 13.5 3 11.75 3 10C3 8.25 4.27273 6.5 6.5 6.5" stroke="currentColor"/>
      <path d="M10 10C10 8.25 11.2727 6.5 13.5 6.5C15.7273 6.5 17 8.25 17 10C17 11.75 15.7273 13.5 13.5 13.5" stroke="currentColor"/>
    </>
  ),
  'edit': (
    <>
      <path d="M4 13.9998L6 15.9998M14 9.00046L15.5 7.50046C16.2809 6.71959 16.2806 5.28116 15.5 4.50004C14.719 3.71856 13.2812 3.71889 12.5 4.50012L10.9758 5.99009L14 9.00046ZM8 14.9998L9.5 13.4998L6.5 10.4998L5 11.9998L3 16.5L3.5 17L8 14.9998Z" stroke="currentColor"/>
      <path d="M9.5 13.5L13 10M6.5 10.5L10 7" stroke="currentColor"/>
    </>
  ),
  'face': (
    <>
      <path d="M5 13C5 15 7 17 10 17C12.5 17 13.5 16 14.5 15" stroke="currentColor"/>
      <path d="M11.5 6.50019L15.5 6.5V8.5L12.5 8.50019" stroke="currentColor"/>
      <path d="M4.5 8.50019V6.50019L8.5 6.5V8.5L4.5 8.50019Z" stroke="currentColor"/>
      <path d="M9.5 2L14 12H9.5L10.1699 14.5" stroke="currentColor"/>
    </>
  ),
  'file': (
    <>
      <path d="M15.5 4.50019H9L4.5 4.5V15.5L9 15.5002H15.5V4.50019Z" stroke="currentColor"/>
      <path d="M7 8.5H13" stroke="currentColor"/>
      <path d="M7 11.5H11" stroke="currentColor"/>
    </>
  ),
  'filter': (
    <>
      <path d="M4 6.5H16" stroke="currentColor"/>
      <path d="M6 10.5H14" stroke="currentColor"/>
      <path d="M8 14.5H12" stroke="currentColor"/>
    </>
  ),
  'folder': (
    <path d="M15.5 6.5H10.5L9 4.5H4.5V15.5H9.2H15.5L15.5 6.5Z" stroke="currentColor"/>
  ),
  'folder-go': (
    <>
      <path d="M11 15.5H15.5L15.5 6.5H10.5L9 4.5H4.5V8" stroke="currentColor"/>
      <path d="M6.5 15L9 12.5L6.5 10M9 12.5L3 12.5" stroke="currentColor"/>
    </>
  ),
  'full': (
    <>
      <path d="M10.2 5L15 5V9.8M9.8 15L5 15V10.2" stroke="currentColor"/>
      <path d="M9.5 10.5L5 15" stroke="currentColor"/>
      <path d="M15 5L10.5 9.5" stroke="currentColor"/>
    </>
  ),
  'info': (
    <>
      <path d="M10 10V13.5" stroke="currentColor"/>
      <circle cx="10.0008" cy="7.2" r="1.2" fill="currentColor"/>
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor"/>
    </>
  ),
  'left': (
    <path d="M12 5L7 10L12 15" stroke="currentColor"/>
  ),
  'legend': (
    <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" fill="currentColor"/>
  ),
  'letter-spacing': (
    <>
      <path d="M15.5 4L15.5 16M4.5 4L4.5 16" stroke="currentColor"/>
      <path d="M10 13L10 8" stroke="currentColor"/>
      <path d="M13 7.5H7" stroke="currentColor"/>
    </>
  ),
  'layout-sidebar-left': layoutSidebarLeftIcon,
  'layout-sidebar-left-open': layoutSidebarLeftOpenIcon,
  'layout-sidebar-right': layoutSidebarRightIcon,
  'layout-sidebar-right-open': layoutSidebarRightOpenIcon,
  'line-height': (
    <>
      <path d="M4 4.5H16M4 15.5H16" stroke="currentColor"/>
      <path d="M10 13L10 8" stroke="currentColor"/>
      <path d="M13 7.5H7" stroke="currentColor"/>
    </>
  ),
  'link': (
    <path d="M9 4.75L7.25 4.75C4.35051 4.75 2 7.1005 2 10C2 12.8995 4.35051 15.25 7.25 15.25L9 15.25M11 4.75L12.75 4.75C15.6495 4.75 18 7.1005 18 10C18 12.8995 15.6495 15.25 12.75 15.25L11 15.25M7 10L13 10" stroke="currentColor" strokeLinejoin="round"/>
  ),
  'mic': (
    <>
      <path d="M7.5 5.5C7.5 4.39543 8.39543 3.5 9.5 3.5H10.5C11.6046 3.5 12.5 4.39543 12.5 5.5V10.5C12.5 11.6046 11.6046 12.5 10.5 12.5L9.5 12.5C8.39543 12.5 7.5 11.6046 7.5 10.5V5.5Z" stroke="currentColor"/>
      <path d="M5.5 10.134V10.574C5.5 12.8064 7.32736 14.6068 9.55954 14.5735L10.5595 14.5587C12.7452 14.5261 14.5 12.745 14.5 10.5591V10" stroke="currentColor"/>
      <path d="M10 15V17" stroke="currentColor"/>
      <path d="M7 16.5L13 16.5" stroke="currentColor"/>
    </>
  ),
  'minus': (
    <path d="M3 10H17" stroke="currentColor"/>
  ),
  'more': (
    <>
      <circle cx="10" cy="10" r="1" fill="currentColor"/>
      <circle cx="14" cy="10" r="1" fill="currentColor"/>
      <circle cx="6" cy="10" r="1" fill="currentColor"/>
    </>
  ),
  'notification': (
    <>
      <circle cx="10.0008" cy="16.9998" r="1.7" fill="currentColor"/>
      <path d="M10 4.5C6 4.5 4.5 7.5 4.5 10.5V12.25H1.5M10 4.5C14 4.5 15.5 7.5 15.5 10.5V12.25H18.5M10 4.5V1M13 12.25H10H7" stroke="currentColor" strokeMiterlimit="10"/>
    </>
  ),
  'notdef': (
    <>
      <path d="M15.5 4.50019H9L4.5 4.5V15.5L9 15.5002H15.5V4.50019Z" stroke="currentColor"/>
      <path d="M14 6L10.5 9.5M10.5 10.5L14 14M6 6L9.5 9.5M9.5 10.5L6 14" stroke="currentColor"/>
    </>
  ),
  'panel': layoutSidebarLeftIcon,
  'panel-right': layoutSidebarRightIcon,
  'part': (
    <>
      <path d="M16 8.7998L11.2 8.7998L11.2 3.9998" stroke="currentColor"/>
      <path d="M4.30078 15.7002L8.80078 11.2002" stroke="currentColor"/>
      <path d="M11.1992 8.7998L15.6992 4.2998" stroke="currentColor"/>
      <path d="M4.00078 11.2L8.80078 11.2L8.80078 16" stroke="currentColor"/>
    </>
  ),
  'pause': (
    <>
      <path d="M7 5L7 15" stroke="currentColor"/>
      <path d="M13 5V15" stroke="currentColor"/>
    </>
  ),
  'play': (
    <path d="M14 10L8 6V14L14 10Z" stroke="currentColor"/>
  ),
  'plus': (
    <path d="M10 3V9M10 17V11M3 10H9M17 10H11" stroke="currentColor"/>
  ),
  'project': (
    <>
      <path d="M10.0009 1.51472L10.0009 8.93934M11.0616 10H18.4862M1.51562 10H8.94025M10.0009 11.0607L10.0009 18.4853" stroke="currentColor"/>
      <path d="M6 6L9.25 9.25M10.75 9.25L14 6M6 14L9.25 10.75M10.75 10.75L14 14" stroke="currentColor"/>
    </>
  ),
  'props': (
    <path d="M15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6ZM15 6L19 6M5 14C5 12.3431 6.34315 11 8 11C9.65685 11 11 12.3431 11 14C11 15.6569 9.65685 17 8 17C6.34315 17 5 15.6569 5 14ZM5 14L1 14M19 14L13 14M1 6L7 6" stroke="currentColor"/>
  ),
  'radio-off': (
    <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor"/>
  ),
  'radio-on': (
    <>
      <circle cx="10" cy="10" r="3" fill="currentColor"/>
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor"/>
    </>
  ),
  'random': (
    <>
      <path d="M12.9991 6.5C15 7 18 9 18 13C18 16 16.5 18 15 19M9.74913 6.5L11.2491 8V5L9.74913 6.5Z" stroke="currentColor"/>
      <path d="M5 14L9 10L13 14L9 18L5 14Z" stroke="currentColor"/>
    </>
  ),
  'render': (
    <>
      <path d="M16.4998 12.6667V16.5H12.6665M16.4998 7.33333V3.5H12.6665M3.5 7.33333V3.5L7.33313 3.5M3.5 12.6667V16.5H7.33313" stroke="currentColor"/>
      <path d="M10.5 6L8 10.0005L12 10L9.5 14" stroke="currentColor"/>
    </>
  ),
  'restart': (
    <path d="M9 17C7.5 17 5 15.5 5 12C5 10.223 5.7725 8.59864 7 7.5M15 7.5C16.5 7.5 19 9 19 12.5C19 14.277 18.2275 15.9014 17 17M12.25 16.5L10.75 15V18L12.25 16.5ZM11.75 7.5L13.25 9V6L11.75 7.5Z" stroke="currentColor"/>
  ),
  'right': (
    <path d="M8 5L13 10L8 15" stroke="currentColor"/>
  ),
  'scroll': (
    <path d="M6.5 15.5002C4.84315 15.5002 3.5 14.5002 3.5 12.5002L3.5 4.50019L11.5 4.5V10.5M6.5 15.5002C8.15685 15.5002 9.5 14.5002 9.5 12.5002H17.5C17.5 14.5002 16.5 15.5002 14.5 15.5002H6.5Z" stroke="currentColor"/>
  ),
  'search': (
    <>
      <path d="M14.5 14.5L18 18" stroke="currentColor"/>
      <path d="M4 9C4 5.81818 6.5 4 9 4C11.5 4 14 5.81818 14 9C14 12.1818 11.5 14 9 14C6.5 14 4 12.1818 4 9Z" stroke="currentColor"/>
    </>
  ),
  'select-chevron-down': (
    <path d="M13.467 8.05349C13.5736 8.16016 13.627 8.30249 13.627 8.48049C13.627 8.65783 13.5736 8.81783 13.467 8.96049L10.427 11.9465C10.3203 12.0532 10.178 12.1065 9.99995 12.1065C9.82195 12.1065 9.67962 12.0532 9.57295 11.9465L6.53295 8.96049C6.42629 8.81783 6.37295 8.65783 6.37295 8.48049C6.37295 8.30249 6.43529 8.16016 6.55995 8.05349C6.68462 7.94683 6.83562 7.89349 7.01295 7.89349C7.19095 7.89349 7.33329 7.94683 7.43995 8.05349L9.99995 10.6135L12.56 8.05349C12.6666 7.94683 12.809 7.89349 12.987 7.89349C13.1643 7.89349 13.3243 7.94683 13.467 8.05349Z" fill="currentColor"/>
  ),
  'select-chevron-up': (
    <path d="M6.53305 11.9465C6.42638 11.8398 6.37305 11.6975 6.37305 11.5195C6.37305 11.3422 6.42638 11.1822 6.53305 11.0395L9.57305 8.05349C9.67971 7.94682 9.82205 7.89349 10 7.89349C10.178 7.89349 10.3204 7.94682 10.427 8.05349L13.467 11.0395C13.5737 11.1822 13.627 11.3422 13.627 11.5195C13.627 11.6975 13.5647 11.8398 13.44 11.9465C13.3154 12.0532 13.1644 12.1065 12.987 12.1065C12.809 12.1065 12.6667 12.0532 12.56 11.9465L10 9.38649L7.44005 11.9465C7.33338 12.0532 7.19105 12.1065 7.01305 12.1065C6.83571 12.1065 6.67571 12.0532 6.53305 11.9465Z" fill="currentColor"/>
  ),
  'settings': (
    <>
      <path d="M10 3L11.8751 5.47299L14.9497 5.05025L14.527 8.12485L17 10L14.527 11.8751L14.9497 14.9497L11.8751 14.527L10 17L8.12485 14.527L5.05025 14.9497L5.47299 11.8751L3 10L5.47299 8.12485L5.05025 5.05025L8.12485 5.47299L10 3Z" stroke="currentColor" strokeLinejoin="bevel"/>
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeLinejoin="bevel"/>
    </>
  ),
  'size': (
    <>
      <path d="M15.5 4.5H11M15.5 4.5V9M15.5 4.5L11 9" stroke="currentColor"/>
      <path d="M7 16L7 11" stroke="currentColor"/>
      <path d="M10 10.5H4" stroke="currentColor"/>
    </>
  ),
  'sound': (
    <>
      <path d="M9 5H8L4 9V11L8 15H9V5Z" stroke="currentColor"/>
      <path d="M11 5C11 5 16 5 16 10C16 15 11 15 11 15" stroke="currentColor"/>
      <path d="M11 8C11 8 13 8 13 10C13 12 11 12 11 12" stroke="currentColor"/>
    </>
  ),
  'stop': (
    <path d="M15 5H9.2H5V15H9.2H15V5Z" fill="currentColor"/>
  ),
  'stat': (
    <path d="M4 10L4 16M12 12L12 16M8 6L8 16M16 2L16 16" stroke="currentColor"/>
  ),
  'store': (
    <path d="M9.5 15.5L5.5 11.4998V4.49981L10 9.5M9.5 15.5H10.5M9.5 15.5L10 9.5M10 9.5L14.5 4.49981V11.4998L10.5 15.5M10 9.5L10.5 2M10.5 15.5H17.5L17.4993 9.5H15M10.5 15.5H2.50074L2.5 9.5H5" stroke="currentColor"/>
  ),
  'switch': (
    <>
      <rect x="1" y="4" width="18" height="12" rx="6" fill="currentColor"/>
      <circle cx="7" cy="10" r="4.5" fill="var(--uf-color-background)"/>
    </>
  ),
  'theme': (
    <>
      <path d="M7.10502 12.8949C5.50616 11.2961 5.50616 8.7038 7.10502 7.10495C8.70387 5.50609 11.2961 5.50609 12.895 7.10495L7.10502 12.8949Z" fill="currentColor"/>
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor"/>
    </>
  ),
  'type': (
    <>
      <path d="M10 16L10 6" stroke="currentColor"/>
      <path d="M16 5.5H4" stroke="currentColor"/>
    </>
  ),
  'up': (
    <path d="M5 12L10 7L15 12" stroke="currentColor"/>
  ),
  'unreaded': (
    <path d="M7 10C7 8.09091 8.5 7 10 7C11.5 7 13 8.09091 13 10C13 11.9091 11.5 13 10 13C8.5 13 7 11.9091 7 10Z" fill="currentColor"/>
  ),
  'user': (
    <path d="M4 17C4 14 6 12 10 12C14 12 16 14 16 17M15.5 16.5H4.5M13 6C13 4 12 3 10 3C8 3 7 4 7 6C7 8 8 9 10 9C12 9 13 8 13 6Z" stroke="currentColor"/>
  ),
  'userface': (
    <>
      <g clipPath="url(#clip0_3096_33620)">
      <circle cx="10.0008" cy="10.0002" r="8.7" transform="rotate(-90 10.0008 10.0002)" stroke="currentColor"/>
      <path d="M10.8008 5.7002C12.7049 6.03748 14.4008 7.56021 14.4008 10.0002C14.4008 12.4402 12.7049 13.9629 10.8008 14.3002" stroke="currentColor"/>
      <rect x="6" y="6.29981" width="2.3" height="2.3" fill="currentColor"/>
      <rect x="6" y="11.3999" width="2.3" height="2.3" fill="currentColor"/>
      </g>
      <defs>
      <clipPath id="clip0_3096_33620">
      <rect width="20" height="20" fill="var(--uf-color-background)" transform="translate(8.74228e-07 20) rotate(-90)"/>
      </clipPath>
      </defs>
    </>
  ),
  'account': (
    <g stroke="currentColor" strokeWidth="1">
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="7.75" r="2" />
      <path d="M5.75 15C6.5 13.25 8 12.25 10 12.25C12 12.25 13.5 13.25 14.25 15" />
    </g>
  ),
  'activity-idle': (
    <g stroke="currentColor" strokeWidth="1">
      <circle cx="10" cy="8.75" r="3.75" />
      <path d="M10 12.5V15.5" />
      <path d="M6 15.5H14" />
    </g>
  ),
  'activity-running': (
    <path d="M10 3.5C13.5899 3.5 16.5 6.41015 16.5 10C16.5 13.5899 13.5899 16.5 10 16.5C6.41015 16.5 3.5 13.5899 3.5 10C3.5 8.325 4.1332 6.79789 5.17393 5.64434" stroke="currentColor"/>
  ),
  'background-task': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M3.5 5.5H16.5V14.5H3.5V5.5Z" />
      <path d="M6 8.5H10" />
      <path d="M6 11.5H8.5" />
      <path d="M12 10A2.5 2.5 0 1 1 13.7678 14.2678" />
      <path d="M13.75 12V14.25H16" />
    </g>
  ),
  'branch': (
    <g stroke="currentColor" strokeWidth="1">
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="6" cy="15" r="1.5" />
      <circle cx="14" cy="9" r="1.5" />
      <path d="M6 6.5V13.5" />
      <path d="M7.5 12.25C10.5 12.25 11 9 12.5 9" />
    </g>
  ),
  'browser': (
    <>
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor"/>
      <path d="M10 4C10 4 12.5 5.5 12.5 10C12.5 14.5 10 16 10 16" stroke="currentColor"/>
      <path d="M10 4C10 4 7.5 5.5 7.5 10C7.5 14.5 10 16 10 16" stroke="currentColor"/>
      <path d="M4.00586 10.0049L16.0059 10.0049" stroke="currentColor"/>
    </>
  ),
  'conflict': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M8 5.5L11.5 9L8 12.5L4.5 9L8 5.5Z" />
      <path d="M12 7.5L15.5 11L12 14.5L8.5 11L12 7.5Z" />
    </g>
  ),
  'diagnostics': (
    <>
      <path d="M3.5 4.5H16.5V15.5H3.5V4.5Z" stroke="currentColor"/>
      <path d="M3.5 8H16.5" stroke="currentColor"/>
      <rect x="9.5" y="11.5" width="1" height="1" fill="currentColor"/>
    </>
  ),
  'empty-component': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M4.5 4.5H15.5V15.5H4.5V4.5Z" strokeDasharray="2 2" />
      <path d="M10 7.5V12.5" />
      <path d="M7.5 10H12.5" />
    </g>
  ),
  'error': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M7 3.5H13L16.5 7V13L13 16.5H7L3.5 13V7L7 3.5Z" />
      <path d="M7.75 7.75L12.25 12.25" />
      <path d="M12.25 7.75L7.75 12.25" />
    </g>
  ),
  'function': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M12.5 4.5H11C9.75 4.5 9 5.25 8.75 6.5L7.25 14C7 15.25 6.25 15.5 5.25 15.5H4.5" />
      <path d="M6.5 9.5H12.5" />
      <path d="M12.75 12L15.5 15" />
      <path d="M15.5 12L12.75 15" />
    </g>
  ),
  'health-issue': (
    <>
      <path d="M10 3.5L4.5 6V10.75C4.5 13.75 6.75 16.25 10 17.5C13.25 16.25 15.5 13.75 15.5 10.75V6L10 3.5Z" stroke="currentColor"/>
      <path d="M10 7.5V11.5" stroke="currentColor"/>
      <rect x="9.5" y="13.5" width="1" height="1" fill="currentColor"/>
    </>
  ),
  'home': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M3.5 9.5L10 3.75L16.5 9.5" />
      <path d="M5.5 8.5V16H14.5V8.5" />
      <path d="M8.5 16V12H11.5V16" />
    </g>
  ),
  'no-icon': (
    <>
      <path d="M5.5 5.5H14.5V14.5H5.5V5.5Z" stroke="currentColor"/>
      <path d="M4.5 15.5L15.5 4.5" stroke="currentColor"/>
    </>
  ),
  'panel-open': layoutSidebarRightOpenIcon,
  'plan': (
    <>
      <rect x="5.5" y="5.5" width="1" height="1" fill="currentColor"/>
      <path d="M9.5 6H15" stroke="currentColor"/>
      <rect x="5.5" y="9.5" width="1" height="1" fill="currentColor"/>
      <path d="M9.5 10H15" stroke="currentColor"/>
      <rect x="5.5" y="13.5" width="1" height="1" fill="currentColor"/>
      <path d="M9.5 14H13.5" stroke="currentColor"/>
    </>
  ),
  'runtime-error': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M3.5 5.5H16.5V14.5H3.5V5.5Z" />
      <path d="M6 8.5H12.5" />
      <path d="M6 11.5H9.5" />
      <path d="M12.25 11.75L15.25 14.75" />
      <path d="M15.25 11.75L12.25 14.75" />
    </g>
  ),
  'star': (
    <path d="M10 3.75L11.75 7.25L15.75 7.75L12.75 10.5L13.5 14.5L10 12.5L6.5 14.5L7.25 10.5L4.25 7.75L8.25 7.25L10 3.75Z" stroke="currentColor"/>
  ),
  'task-status': (
    <>
      <path d="M10 4.5C13.0376 4.5 15.5 6.96243 15.5 10C15.5 13.0376 13.0376 15.5 10 15.5C6.96243 15.5 4.5 13.0376 4.5 10C4.5 8.56474 5.04967 7.25789 5.95 6.27868" stroke="currentColor"/>
      <rect x="9.25" y="9.25" width="1.5" height="1.5" fill="currentColor"/>
    </>
  ),
  'terminal': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M3.5 5.5H16.5V14.5H3.5V5.5Z" />
      <path d="M6 8L8 10L6 12" />
      <path d="M10 12H13.5" />
    </g>
  ),
  'token-add': (
    <g stroke="currentColor" strokeWidth="1">
      <path d="M8 4.5L11.5 8L8 11.5L4.5 8L8 4.5Z" />
      <path d="M15 12.5V17.5" />
      <path d="M12.5 15H17.5" />
    </g>
  ),
  'warning': (
    <>
      <path d="M10 3.5L16.25 15.5H3.75L10 3.5Z" stroke="currentColor"/>
      <path d="M10 8V11.5" stroke="currentColor"/>
      <rect x="9.5" y="13.5" width="1" height="1" fill="currentColor"/>
    </>
  )
} as const satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof icons;

export const ICON_NAMES = Object.keys(icons) as IconName[];

// viewBox per icon (from source SVG). Fallback is 0 0 20 20 for legacy icons that omit viewBox.
const ICON_VIEWBOX: Partial<Record<IconName, string>> = {
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
  'chat': "0 0 20 20",
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
  'cursor': "0 0 20 20",
  'date': "0 0 20 20",
  'delete': "0 0 20 20",
  'design-tool': "0 0 20 20",
  'dev-tools': "0 0 20 20",
  'down': "0 0 20 20",
  'download': "0 0 20 20",
  'drag': "0 0 20 20",
  'ds': "0 0 20 20",
  'edit': "0 0 20 20",
  'face': "0 0 20 20",
  'file': "0 0 20 20",
  'filter': "0 0 20 20",
  'folder': "0 0 20 20",
  'folder-go': "0 0 20 20",
  'full': "0 0 20 20",
  'info': "0 0 20 20",
  'left': "0 0 20 20",
  'legend': "0 0 20 20",
  'letter-spacing': "0 0 20 20",
  'layout-sidebar-left': "0 0 20 20",
  'layout-sidebar-left-open': "0 0 20 20",
  'layout-sidebar-right': "0 0 20 20",
  'layout-sidebar-right-open': "0 0 20 20",
  'line-height': "0 0 20 20",
  'link': "0 0 20 20",
  'mic': "0 0 20 20",
  'minus': "0 0 20 20",
  'more': "0 0 20 20",
  'notdef': "0 0 20 20",
  'notification': "0 0 20 20",
  'panel': "0 0 20 20",
  'panel-right': "0 0 20 20",
  'part': "0 0 20 20",
  'pause': "0 0 20 20",
  'play': "0 0 20 20",
  'plus': "0 0 20 20",
  'project': "0 0 20 20",
  'props': "0 0 20 20",
  'radio-off': "0 0 20 20",
  'radio-on': "0 0 20 20",
  'random': "0 0 24 24",
  'render': "0 0 20 20",
  'restart': "0 0 20 20",
  'right': "0 0 20 20",
  'scroll': "0 0 20 20",
  'search': "0 0 20 20",
  'select-chevron-down': "0 0 20 20",
  'select-chevron-up': "0 0 20 20",
  'settings': "0 0 20 20",
  'size': "0 0 20 20",
  'sound': "0 0 20 20",
  'stop': "0 0 20 20",
  'stat': "0 0 20 20",
  'store': "0 0 20 20",
  'switch': "0 0 20 20",
  'theme': "0 0 20 20",
  'type': "0 0 20 20",
  'up': "0 0 20 20",
  'unreaded': "0 0 20 20",
  'user': "0 0 20 20",
  'userface': "0 0 20 20",
  'account': "0 0 20 20",
  'activity-idle': "0 0 20 20",
  'activity-running': "0 0 20 20",
  'background-task': "0 0 20 20",
  'branch': "0 0 20 20",
  'browser': "0 0 20 20",
  'conflict': "0 0 20 20",
  'diagnostics': "0 0 20 20",
  'empty-component': "0 0 20 20",
  'error': "0 0 20 20",
  'function': "0 0 20 20",
  'health-issue': "0 0 20 20",
  'home': "0 0 20 20",
  'no-icon': "0 0 20 20",
  'panel-open': "0 0 20 20",
  'plan': "0 0 20 20",
  'runtime-error': "0 0 20 20",
  'star': "0 0 20 20",
  'task-status': "0 0 20 20",
  'terminal': "0 0 20 20",
  'token-add': "0 0 20 20",
  'warning': "0 0 20 20"
};

interface IconContextValue {
  size?: number;
  square: boolean;
  registry: Record<string, IconSource>;
  resolveIcon?: (name: string) => IconSource | null | undefined;
}

const IconContext = React.createContext<IconContextValue>({
  size: undefined,
  square: true,
  registry: {},
  resolveIcon: undefined,
});

const LEGACY_BUILTIN_ICON_FALLBACK: IconName = 'notdef';
const LEGACY_BUILTIN_ICON_NAMES = new Set<string>(['git']);

export const IconProvider: React.FC<IconProviderProps> = ({
  children,
  size,
  square = true,
  registry,
  resolveIcon,
}) => {
  const parent = React.useContext(IconContext);
  const value = React.useMemo<IconContextValue>(() => ({
    size: size ?? parent.size,
    square: square ?? parent.square,
    registry: {
      ...parent.registry,
      ...(registry || {}),
    },
    resolveIcon: resolveIcon ?? parent.resolveIcon,
  }), [parent, size, square, registry, resolveIcon]);

  return (
    <IconContext.Provider value={value}>
      {children}
    </IconContext.Provider>
  );
};

function looksLikeUrl(input: string): boolean {
  return /^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/.test(input) || /\.svg(\?.*)?$/i.test(input);
}

function resolveBuiltinIconName(requestedName: string | undefined): IconName | undefined {
  if (!requestedName) return undefined;
  if (LEGACY_BUILTIN_ICON_NAMES.has(requestedName)) return LEGACY_BUILTIN_ICON_FALLBACK;
  return (icons as Record<string, React.ReactNode>)[requestedName]
    ? requestedName as IconName
    : LEGACY_BUILTIN_ICON_FALLBACK;
}

/**
 * Icon component for Components design system
 * Renders inline SVG icons for better performance and styling
 */
export const Icon: React.FC<IconProps> = ({
  name,
  icon,
  src,
  className = '',
  style = {},
  label,
  title,
}) => {
  const iconStringName = typeof icon === 'string' && !looksLikeUrl(icon.trim()) && icon.trim().length > 0
    ? icon.trim()
    : undefined;
  const requestedName = (typeof name === 'string' && name.trim().length > 0) ? name.trim() : iconStringName;
  const hasExplicitUnsupportedSource = src != null || (icon != null && iconStringName == null);
  const builtinName = resolveBuiltinIconName(requestedName)
    ?? (hasExplicitUnsupportedSource ? LEGACY_BUILTIN_ICON_FALLBACK : undefined);

  const builtinEntry = builtinName
    ? {
        content: (icons as Record<string, React.ReactNode>)[builtinName],
        viewBox: (ICON_VIEWBOX as Record<string, string>)[builtinName] || '0 0 20 20',
        nativeSize: FACE_UI_ICON_SIZE,
        nativeWidth: FACE_UI_ICON_SIZE,
        nativeHeight: FACE_UI_ICON_SIZE,
      }
    : null;

  const iconEntry = builtinEntry;
  const resolvedWidth = FACE_UI_ICON_SIZE;
  const resolvedHeight = FACE_UI_ICON_SIZE;

  const mergedStyle: React.CSSProperties = {
    ...style,
    width: resolvedWidth,
    height: resolvedHeight,
  };

  const mergedClassName = ['uf-icon', className].filter(Boolean).join(' ');
  const ariaProps = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };

  const iconContent = iconEntry?.content ?? null;
  const viewBox = iconEntry?.viewBox || builtinEntry?.viewBox || '0 0 20 20';

  if (!iconContent) {
    if (requestedName) console.warn(`Icon "${requestedName}" not found`);
    return null;
  }

  return (
    <svg
      className={mergedClassName}
      width={resolvedWidth}
      height={resolvedHeight}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={mergedStyle}
      data-icon={requestedName || builtinName || 'notdef'}
      {...ariaProps}
    >
      {title ? <title>{title}</title> : null}
      {iconContent}
    </svg>
  );
};

export default Icon;
