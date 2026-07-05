import React, { type ReactElement } from 'react'
import { Icon, type IconName } from './Icon'

type LegacyIconProps = {
  className?: string
}

function FaceUiIcon(name: IconName, className?: string): ReactElement {
  return <Icon name={name} className={className} />
}

export function CheckOffIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('check-off', className)
}

export function CheckOnIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('check-on', className)
}

export function RadioOffIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('radio-off', className)
}

export function RadioOnIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('radio-on', className)
}

export function DownIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('down', className)
}

export function UpIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('up', className)
}

export function RightIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('right', className)
}

export function CopyIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('copy', className)
}

export function CloseIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('close', className)
}

export function MinusIcon({ className }: LegacyIconProps = {}) {
  return FaceUiIcon('minus', className)
}
