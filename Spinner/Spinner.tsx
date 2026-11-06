import { forwardRef, type SVGProps } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'

export const spinnerAnatomy = createAnatomy('spinner').parts('root', 'rotor', 'arc')

export interface SpinnerProps extends Omit<SVGProps<SVGSVGElement>,
  'children' | 'dangerouslySetInnerHTML' | 'width' | 'height' | 'viewBox'> {
  /** Accessible name when used alone; omit when the parent already announces loading. */
  label?: string
  /** Optional native pointer hint; also names the icon when label is absent. */
  title?: string
}

/** A fixed 20×20 indeterminate loading icon, with a flowing arc and no motion under reduced-motion preferences. */
export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  function Spinner({ label: inputLabel, title: inputTitle, className, style, ...rest }, ref) {
    const label = typeof inputLabel === 'string' ? inputLabel.trim() : undefined
    const title = typeof inputTitle === 'string' ? inputTitle.trim() : undefined
    const accessibleName = label || title || rest['aria-label']
    return (
      <svg {...rest} ref={ref} {...spinnerAnatomy.getPartAttrs('root')}
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="none"
        role={accessibleName ? 'img' : undefined} aria-label={accessibleName || undefined} aria-hidden={accessibleName ? undefined : true}
        focusable="false" className={cn('uf-spinner', className)} style={{ ...style, width: 20, height: 20 }}>
        {title ? <title>{title}</title> : null}
        <g {...spinnerAnatomy.getPartAttrs('rotor')}>
          <circle {...spinnerAnatomy.getPartAttrs('arc')} cx="10" cy="10" r="7.5" pathLength="100"
            stroke="currentColor" strokeWidth="1.625" strokeLinecap="round" strokeDasharray="28 72" />
        </g>
      </svg>
    )
  },
)
