import {
  Children,
  Fragment,
  cloneElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { Button } from '../../../Button/Button'
import { mergeProps } from './merge-props'
import { useComposedRefs } from './use-composed-refs'

function unwrapFragment(children: ReactNode): ReactNode {
  if (isValidElement(children) && children.type === Fragment) {
    const nodes = Children.toArray(
      (children.props as { children?: ReactNode }).children,
    )
    if (nodes.length === 1) return unwrapFragment(nodes[0])
  }
  return children
}

export function getTriggerChild(children: ReactNode) {
  const content = unwrapFragment(children)
  return isValidElement(content) && content.type !== Fragment
    ? (content as ReactElement<Record<string, unknown>>)
    : null
}

/** Trigger behavior belongs to the actual element, preserving its handlers and ref. */
export const Trigger = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & { disabled?: boolean; actionable?: boolean }
>(function Trigger({ children, actionable = true, ...props }, ref) {
  const content = unwrapFragment(children)
  const child = getTriggerChild(content)
  const childRef = child
    ? ((Object.getOwnPropertyDescriptor(child.props, 'ref')?.value ??
        Object.getOwnPropertyDescriptor(child, 'ref')?.value) as
        | Ref<HTMLElement>
        | undefined)
    : undefined
  const mergedRef = useComposedRefs(childRef, ref)
  if (!child)
    return (
      <Button {...props} ref={mergedRef}>
        {content}
      </Button>
    )
  const nativeControl =
    typeof child.type !== 'string' ||
    ['button', 'input', 'select', 'textarea', 'summary'].includes(child.type) ||
    (child.type === 'a' && child.props.href != null)
  const fallback = nativeControl
    ? undefined
    : {
        role: child.props.role ?? (actionable ? 'button' : undefined),
        tabIndex: child.props.tabIndex ?? 0,
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
          if (
            actionable &&
            event.target === event.currentTarget &&
            (event.key === 'Enter' || event.key === ' ')
          ) {
            event.preventDefault()
            event.currentTarget.click()
          }
        },
      }
  return cloneElement(child, {
    ...mergeProps(child.props, props as Record<string, unknown>, fallback),
    'aria-describedby':
      [
        ...new Set(
          [child.props['aria-describedby'], props['aria-describedby']]
            .filter((value): value is string => typeof value === 'string')
            .flatMap((value) => value.trim().split(/\s+/).filter(Boolean)),
        ),
      ].join(' ') || undefined,
    disabled: child.props.disabled || props.disabled || undefined,
    ref: mergedRef,
  })
})
