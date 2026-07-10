/**
 * Shared base contract for Face UI form controls.
 *
 * Form controls (Checkbox, Radio, Switcher, Input, …) share a common set of
 * form-participation and layout props. Extending this base keeps that surface
 * consistent across controls without changing any individual component's public
 * props — the generated `.json` contracts still list every prop, because the
 * contract extractor resolves local `extends`.
 */
export interface FormControlProps {
  /** Disabled state. */
  disabled?: boolean
  /** Mark as required. */
  required?: boolean
  /** Form field name. */
  name?: string
  /** Outer membrane wrapper around control geometry. */
  membrane?: boolean
  /** Additional CSS class. */
  className?: string
}
