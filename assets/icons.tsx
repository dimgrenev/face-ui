/**
 * Face UI — Inline SVG icons.
 *
 * SVG paths are identical to the reference `components/Icons/Icon.tsx`
 * to guarantee pixel-perfect visual alignment between the two libraries.
 *
 * Only the subset actually consumed by Face UI components is included.
 * All icons: viewBox 0 0 20 20, width/height 20, fill="none", stroke="currentColor".
 */

import type { ReactElement, ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Base SVG wrapper
// ---------------------------------------------------------------------------

interface IconSvgProps {
  children: ReactNode
  className?: string
}

function IconSvg({ children, className }: IconSvgProps): ReactElement {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

/** Unchecked checkbox — empty square outline. */
export function CheckOffIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M15 5H9.2H5V15H9.2H15V5Z" stroke="currentColor" />
    </IconSvg>
  )
}

/** Checked checkbox — square with inner filled rect. */
export function CheckOnIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <rect x="8" y="8" width="4" height="4" fill="currentColor" />
      <path d="M15 5H9.2H5V15H9.2H15V5Z" stroke="currentColor" />
    </IconSvg>
  )
}

// ---------------------------------------------------------------------------
// Radio
// ---------------------------------------------------------------------------

/** Unselected radio — empty circle outline. */
export function RadioOffIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor" />
    </IconSvg>
  )
}

/** Selected radio — circle with filled inner dot. */
export function RadioOnIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <circle cx="10" cy="10" r="3" fill="currentColor" />
      <path d="M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z" stroke="currentColor" />
    </IconSvg>
  )
}

// ---------------------------------------------------------------------------
// Chevrons
// ---------------------------------------------------------------------------

/** Chevron down. */
export function DownIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M5 8L10 13L15 8" stroke="currentColor" />
    </IconSvg>
  )
}

/** Chevron up. */
export function UpIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M5 12L10 7L15 12" stroke="currentColor" />
    </IconSvg>
  )
}

/** Chevron right. */
export function RightIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M8 5L13 10L8 15" stroke="currentColor" />
    </IconSvg>
  )
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Copy icon. */
export function CopyIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M12.5 6.75H16.25V10.5M10.5 6.75H6.75V10.5M16.25 12.5V16.25H12.5M10.5 16.25H6.75V12.5" stroke="currentColor" />
      <path d="M10.5 2.75H6.5H2.75V6.5V10.5" stroke="currentColor" />
    </IconSvg>
  )
}

/** Close / X icon. */
export function CloseIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M16 4L10.75 9.25M10.75 10.75L16 16M4 4L9.25 9.25M9.25 10.75L4 16" stroke="currentColor" />
    </IconSvg>
  )
}

/** Horizontal line (minus). Used for indeterminate checkbox. */
export function MinusIcon({ className }: { className?: string } = {}) {
  return (
    <IconSvg className={className}>
      <path d="M3 10H17" stroke="currentColor" />
    </IconSvg>
  )
}
