import { Text } from '../../../index'

export const logicalTextIcon = <Text icon="search" iconPosition="end" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalTextIcon = <Text iconPosition="right" />

export const quote = (
  <Text as="blockquote" variant="blockquote" size="xl">
    Quote
  </Text>
)
// @ts-expect-error Text owns its content slot.
export const textHtml = <Text dangerouslySetInnerHTML={{ __html: 'Text' }} />
