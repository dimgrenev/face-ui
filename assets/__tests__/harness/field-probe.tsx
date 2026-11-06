import type { CSSProperties } from 'react'
import { Membrane } from '../../adapters/react/Membrane'
import { FieldLayout, useField, type FieldOptions } from '../../internal/field'

/** Field options plus the probe's shape and the root attributes a layout test varies. */
export interface FieldProbeProps extends Omit<FieldOptions, 'labelable'> {
  /** A radio group named on its root instead of a labelable text input. */
  group?: boolean
  membrane?: boolean
  dir?: 'ltr' | 'rtl'
  style?: CSSProperties
}

/**
 * The smallest field, wired the way every Face UI field uses Field: a text
 * input (labelable, named through `<label for>`), or a radio group whose root
 * is the named element and whose every radio carries the description.
 */
export function FieldProbe({
  group = false,
  membrane = true,
  dir,
  style,
  ...options
}: FieldProbeProps) {
  const field = useField({ ...options, labelable: !group })
  const invalid = field.invalid || undefined
  return (
    <div
      {...(group
        ? { ...field.controlProps, role: 'radiogroup', 'aria-invalid': invalid }
        : {})}
      {...field.rootProps}
      className="uf-field uf-probe"
      data-scope="probe"
      data-part="root"
      dir={dir}
      style={style}
    >
      <FieldLayout field={field}>
        <Membrane
          enabled={membrane}
          as="div"
          fullWidth
          interactive={!group}
          target="input"
        >
          {group ? (
            <span className="uf-probe__options">
              {['A', 'B'].map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={`${field.id}-option`}
                    value={option}
                    required={options.required}
                    aria-describedby={field.describedBy}
                  />
                  {option}
                </label>
              ))}
            </span>
          ) : (
            <input
              {...field.controlProps}
              className="uf-probe__input"
              required={options.required}
              aria-invalid={invalid}
            />
          )}
        </Membrane>
      </FieldLayout>
    </div>
  )
}
