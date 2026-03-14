import type { ReactNode } from 'react'
import { Bar } from '../Bar/Bar'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'

interface ResponsiveSheetHeaderProps {
  title: ReactNode
  onClose: () => void
}

export function ResponsiveSheetHeader(props: ResponsiveSheetHeaderProps) {
  const { title, onClose } = props

  return (
    <Bar className="uf-responsive-sheetHeader">
      <Bar.LeftEllipsis>
        <Text
          as="span"
          variant="label"
          fullWidth
          className="uf-responsive-sheetTitle"
        >
          {title}
        </Text>
      </Bar.LeftEllipsis>
      <Bar.Right>
        <Button
          icon="close"
          iconOnly
          fullWidth={false}
          variant="default"
          aria-label="Close"
          className="uf-responsive-sheetClose"
          onClick={onClose}
        />
      </Bar.Right>
    </Bar>
  )
}
