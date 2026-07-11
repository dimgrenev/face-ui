/**
 * Setting — settings row and group pattern for preference surfaces.
 *
 * `<Setting label="Completion sound" description="Play a sound when the agent finishes" control={<Switcher />} />`
 * `<Setting.Group title="Notifications">…rows…</Setting.Group>`
 * `<Setting layout="stack" label="Theme bridge file">…wide control…</Setting>`
 */

import React, { forwardRef, isValidElement, useId, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Badge } from '../Badge/Badge'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Input } from '../Input/Input'
import { Switcher } from '../Switcher/Switcher'
import { Text } from '../Text/Text'

export const settingAnatomy = createAnatomy('setting').parts(
  'root', 'info', 'label', 'description', 'warning', 'control', 'content',
  'group', 'group-header', 'group-title', 'group-description', 'group-body',
)

export type SettingLayout = 'row' | 'stack'
export type SettingAlign = 'center' | 'start'
export type SettingGroupVariant = 'framed' | 'plain'

export interface SettingProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  /** Primary label of the row. */
  label?: ReactNode
  /** Muted supporting copy under the label. */
  description?: ReactNode
  /** Badge next to the label (string renders a Face UI Badge, e.g. "Beta"). */
  badge?: ReactNode
  /** Cautionary copy rendered with a warning icon under the description. */
  warning?: ReactNode
  /** Control slot rendered at the end of the row (toggle, select, buttons…). */
  control?: ReactNode
  /** 'row' keeps the control inline at the end; 'stack' renders it full-width below the info block. */
  layout?: SettingLayout
  /** Vertical alignment of info vs control in row layout. */
  align?: SettingAlign
  /** Dim the row and disable pointer interactions. */
  disabled?: boolean
  /** Highlight the row (deep-link target emphasis). */
  highlighted?: boolean
  /** Nested full-width content under the row (previews, expanded editors…). */
  children?: ReactNode
}

export interface SettingGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Group heading rendered above the rows. */
  title?: ReactNode
  /** Muted supporting copy under the group heading. */
  description?: ReactNode
  /** 'framed' wraps rows in a bordered surface with hairline separators; 'plain' stacks bare rows. */
  variant?: SettingGroupVariant
  children?: ReactNode
}

type SettingChildDescriptor = {
  __componentName__: string
  [key: string]: any
}

function isSettingChildDescriptor(node: unknown): node is SettingChildDescriptor {
  return Boolean(
    node &&
    typeof node === 'object' &&
    !isValidElement(node) &&
    typeof (node as { __componentName__?: unknown }).__componentName__ === 'string',
  )
}

function renderSettingNode(node: ReactNode): ReactNode {
  if (node == null) return null
  if (Array.isArray(node)) {
    return node.map((item, index) => (
      <React.Fragment key={index}>
        {renderSettingNode(item)}
      </React.Fragment>
    ))
  }
  if (isSettingChildDescriptor(node)) {
    return renderSettingDescriptor(node)
  }
  return node
}

function renderSettingDescriptor(node: SettingChildDescriptor): ReactNode {
  const { __componentName__, ...slotProps } = node
  switch (__componentName__) {
    case 'Switcher': return <Switcher {...slotProps} />
    case 'Button': return <Button {...slotProps} />
    case 'Input': return <Input {...slotProps} />
    case 'Badge': return <Badge {...slotProps} />
    case 'Icon': {
      const { name: iconName, ...iconProps } = slotProps
      return typeof iconName === 'string' && iconName.length > 0
        ? <Icon name={iconName} {...iconProps} />
        : null
    }
    case 'Text': return <Text {...slotProps} />
    default: return null
  }
}

function renderSettingText(node: ReactNode, variant: 'body' | 'muted', partAttrs: Record<string, string>, className: string, id?: string): ReactNode {
  if (node == null) return null
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text as="div" id={id} variant={variant} fullWidth membrane={false} inset="none" {...partAttrs} className={className}>
        {String(node)}
      </Text>
    )
  }
  return (
    <div id={id} {...partAttrs} className={className}>
      {node}
    </div>
  )
}

const SettingRoot = forwardRef<HTMLDivElement, SettingProps>(
  function Setting(props, ref) {
    const {
      label,
      description,
      badge,
      warning,
      control,
      layout = 'row',
      align = 'center',
      disabled = false,
      highlighted = false,
      children,
      className,
      ...rest
    } = props

    const generatedId = useId()
    const labelId = label != null ? `${generatedId}-label` : undefined
    const descriptionId = description != null ? `${generatedId}-description` : undefined
    const badgeNode = badge == null
      ? null
      : (typeof badge === 'string' || typeof badge === 'number')
        ? <Badge text={String(badge)} />
        : badge

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        {...settingAnatomy.getPartAttrs('root')}
        data-layout={layout}
        data-align={align}
        data-disabled={disabled ? '' : undefined}
        data-highlighted={highlighted ? '' : undefined}
        className={cn('uf-setting', className)}
        {...rest}
      >
        <div {...settingAnatomy.getPartAttrs('info')} className="uf-setting__info">
          {label != null ? (
            <div className="uf-setting__label-row">
              {renderSettingText(label, 'body', settingAnatomy.getPartAttrs('label'), 'uf-setting__label', labelId)}
              {badgeNode}
            </div>
          ) : null}
          {renderSettingText(description, 'muted', settingAnatomy.getPartAttrs('description'), 'uf-setting__description', descriptionId)}
          {warning != null ? (
            <div {...settingAnatomy.getPartAttrs('warning')} className="uf-setting__warning">
              <Icon name="warning" />
              {renderSettingText(warning, 'muted', {}, 'uf-setting__warning-copy')}
            </div>
          ) : null}
        </div>
        {control != null ? (
          <div {...settingAnatomy.getPartAttrs('control')} className="uf-setting__control">
            {renderSettingNode(control)}
          </div>
        ) : null}
        {children != null ? (
          <div {...settingAnatomy.getPartAttrs('content')} className="uf-setting__content">
            {renderSettingNode(children)}
          </div>
        ) : null}
      </div>
    )
  },
)

const SettingGroup = forwardRef<HTMLDivElement, SettingGroupProps>(
  function SettingGroup(props, ref) {
    const {
      title,
      description,
      variant = 'framed',
      children,
      className,
      ...rest
    } = props

    const generatedId = useId()
    const titleId = title != null ? `${generatedId}-group-title` : undefined
    const hasHeader = title != null || description != null

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        {...settingAnatomy.getPartAttrs('group')}
        data-variant={variant}
        className={cn('uf-setting-group', className)}
        {...rest}
      >
        {hasHeader ? (
          <div {...settingAnatomy.getPartAttrs('group-header')} className="uf-setting-group__header">
            {renderSettingText(title, 'body', settingAnatomy.getPartAttrs('group-title'), 'uf-setting-group__title', titleId)}
            {renderSettingText(description, 'muted', settingAnatomy.getPartAttrs('group-description'), 'uf-setting-group__description')}
          </div>
        ) : null}
        <div {...settingAnatomy.getPartAttrs('group-body')} className="uf-setting-group__body">
          {children}
        </div>
      </section>
    )
  },
)

export type SettingCompoundComponent = typeof SettingRoot & {
  Root: typeof SettingRoot
  Group: typeof SettingGroup
}

export const Setting = Object.assign(SettingRoot, {
  Root: SettingRoot,
  Group: SettingGroup,
}) as SettingCompoundComponent
