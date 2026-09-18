import type { ReactNode } from 'react'
import { Bar } from '../Bar/Bar'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'

interface ResponsiveSheetHeaderProps {
  title: ReactNode
  titleId?: string
  onClose: () => void
  closeLabel?: string
}

export function ResponsiveSheetHeader(props: ResponsiveSheetHeaderProps) {
  const { title, titleId, onClose, closeLabel = 'Close' } = props

  return (
    <Bar className="uf-responsive-sheetHeader">
      <Bar.Section grow>
        <Text
          as="span"
          id={titleId}
          truncate
          fullWidth
          className="uf-responsive-sheetTitle"
        >
          {title}
        </Text>
      </Bar.Section>
      <Bar.Section align="end">
        <Button
          icon="close"
          iconOnly
          fullWidth={false}
          variant="default"
          aria-label={closeLabel}
          className="uf-responsive-sheetClose"
          onClick={onClose}
        />
      </Bar.Section>
    </Bar>
  )
}
