/**
 * Bar — layout for grouped content and actions.
 *
 * `<Bar><Bar.Section grow>Title</Bar.Section><Bar.Section align="end">Actions</Bar.Section></Bar>`
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import {
  renderSlotContent,
  type SlotContent,
  type SlotDescriptor,
} from '../assets/slot-content'

export const barAnatomy = createAnatomy('bar').parts('root', 'section')

type BarNativeProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
>

export interface BarProps extends BarNativeProps {
  /** Content and sections, rendered in the authored order. */
  children?: SlotContent
  /** Layout direction. */
  orientation?: 'horizontal' | 'vertical'
}

export interface BarSectionProps extends BarNativeProps {
  /** Place the group at the start or end of the bar's main axis. */
  align?: 'start' | 'end'
  /** Fill remaining space and allow this content region to shrink before actions. */
  grow?: boolean
  children?: SlotContent
}

export type FeldChildDescriptor = SlotDescriptor

function renderSlot(node: SlotContent): ReactNode {
  return renderSlotContent(node, BAR_SLOT_COMPONENTS, (value) => (
    <Text as="span" truncate>
      {value}
    </Text>
  ))
}

export const BarSection = forwardRef<HTMLDivElement, BarSectionProps>(
  function BarSection(
    { align = 'start', grow = false, children, className, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        {...barAnatomy.getPartAttrs('section')}
        data-align={align}
        data-grow={grow ? '' : undefined}
        className={cn('uf-bar-section', className)}
        {...rest}
      >
        {renderSlot(children)}
      </div>
    )
  },
)

const BarRoot = forwardRef<HTMLDivElement, BarProps>(function Bar(
  { orientation = 'horizontal', children, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...barAnatomy.getPartAttrs('root')}
      aria-orientation={rest.role === 'toolbar' ? orientation : undefined}
      data-orientation={orientation}
      className={cn('uf-bar', className)}
      {...rest}
    >
      {renderSlot(children)}
    </div>
  )
})

export const Bar = Object.assign(BarRoot, { Section: BarSection })

const BAR_SLOT_COMPONENTS = {
  Text,
  Button,
  Icon,
  BarSection,
  'Bar.Section': BarSection,
}
