/** Field — the one anatomy of every labelled value: label, required marker, control, description, error. */
import { useId, type AriaAttributes, type ReactNode } from 'react'
import { createAnatomy } from '../anatomy'
import { hasSlotContent } from '../slot-content'

/** Label, help and validation props shared by Input, Select, Date, Radio, Rating, Slider and SegmentedControl. */
export interface FieldProps {
  /** Visible name of the value. Empty content leaves naming to aria-label/aria-labelledby. */
  label?: ReactNode
  /** Help for entering the value, announced with the focused control. */
  description?: ReactNode
  /** Validation message; marks the field invalid unless aria-invalid is explicit. Not a live region. */
  error?: ReactNode
  /** Label above the control, or at its inline start (stacks when narrow). Defaults to top. */
  labelPosition?: 'top' | 'start'
}

/** What a component passes to useField: its field props, the named element's kind and its naming attributes. */
export interface FieldOptions extends FieldProps {
  /** Id of the named element; generated when empty. Part ids derive from it. */
  id?: string
  /** The named element is an input, textarea or button, so the label is a `<label for>`; a group gets a `<span>`. */
  labelable: boolean
  /** Adds the required marker to the label. */
  required?: boolean
  /** Browser validation message from FormValue; shown when `error` is empty. */
  nativeError?: string | null
  // The consumer's naming attributes, taken from the component's native props.
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
}

/** Names, ids and props for one field, from useField; FieldLayout renders its parts. */
export interface Field {
  /** Id of the named element. */
  id: string
  /** Id of the visible label, `${id}-label`. */
  labelId: string
  /** The name: consumer aria-labelledby, else the visible label unless aria-label is set. */
  labelledBy?: string
  /** Consumer ids, then description, then error: for the group root and every focusable element. */
  describedBy?: string
  /** Set aria-invalid only on roles that support it: textbox, combobox, radiogroup, slider. */
  invalid: boolean
  /** For the named element: the labelable control, or the group root. */
  controlProps: {
    id: string
    'aria-label'?: string
    'aria-labelledby'?: string
    'aria-describedby'?: string
  }
  /** For the component root, whose class list starts with `uf-field`. */
  rootProps: { 'data-label-position': 'top' | 'start'; 'data-invalid'?: '' }
  /** What FieldLayout renders; an empty slot is `undefined`. */
  label?: ReactNode
  description?: ReactNode
  error?: ReactNode
  required: boolean
  labelable: boolean
}

const { getPartAttrs: part } = createAnatomy('field').parts(
  'label',
  'required',
  'description',
  'error',
)
const filled = (node: ReactNode) =>
  hasSlotContent(node, { trimText: true }) ? node : undefined

/** Space-separated id references in order, without empties or repeats; `undefined` when none remain. */
export function idList(
  ...lists: Array<string | undefined>
): string | undefined {
  const ids = new Set(lists.join(' ').split(/\s+/).filter(Boolean))
  return ids.size ? [...ids].join(' ') : undefined
}

/** Names, describes and marks one field value. The component places `controlProps` and `rootProps`. */
export function useField(options: FieldOptions): Field {
  const generated = useId()
  const id = options.id || generated
  const labelId = `${id}-label`
  const label = filled(options.label)
  const description = filled(options.description)
  const error = filled(options.error) ?? filled(options.nativeError)
  // Only a string names; anything else (JSON data) is ignored rather than crashing the render.
  const ariaLabel =
    typeof options['aria-label'] === 'string'
      ? options['aria-label'].trim() || undefined
      : undefined
  // Native precedence: explicit references, then aria-label, then the visible label.
  const labelledBy =
    idList(options['aria-labelledby']) ??
    (ariaLabel || label === undefined ? undefined : labelId)
  const describedBy = idList(
    options['aria-describedby'],
    description === undefined ? undefined : `${id}-description`,
    error === undefined ? undefined : `${id}-error`,
  )
  const explicit = options['aria-invalid']
  const invalid =
    explicit === undefined
      ? error !== undefined
      : explicit !== false && explicit !== 'false'
  return {
    id,
    labelId,
    labelledBy,
    describedBy,
    invalid,
    controlProps: {
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
    },
    rootProps: {
      'data-label-position':
        options.labelPosition === 'start' ? 'start' : 'top',
      'data-invalid': invalid ? '' : undefined,
    },
    label,
    description,
    error,
    required: !!options.required,
    labelable: options.labelable,
  }
}

/** The parts around the control, in reading order: label, control, description, error. */
export function FieldLayout({
  field,
  children,
}: {
  field: Field
  children?: ReactNode
}) {
  const { id, label, description, error } = field
  const labelProps = {
    ...part('label'),
    id: field.labelId,
    className: 'uf-field__label',
  }
  const labelContent = (
    <>
      {label}
      {field.required && (
        <span
          {...part('required')}
          className="uf-field__required"
          aria-hidden="true"
        >
          *
        </span>
      )}
    </>
  )
  // Spans, not divs: the parts stay phrasing content, valid inside any root.
  return (
    <>
      {label !== undefined &&
        (field.labelable ? (
          <label {...labelProps} htmlFor={id}>
            {labelContent}
          </label>
        ) : (
          <span {...labelProps}>{labelContent}</span>
        ))}
      {children}
      {description !== undefined && (
        <span
          {...part('description')}
          id={`${id}-description`}
          className="uf-field__description"
        >
          {description}
        </span>
      )}
      {error !== undefined && (
        <span {...part('error')} id={`${id}-error`} className="uf-field__error">
          {error}
        </span>
      )}
    </>
  )
}
