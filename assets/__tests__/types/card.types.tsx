import { Card } from '../../../index'

export const card = (
  <Card
    hoverable
    footerAlign="between"
    footer={{ __componentName__: 'Button', text: 'Save' }}
  >
    <Card.Header orientation="horizontal">
      <Card.Title size="lg">Title</Card.Title>
    </Card.Header>
    <Card.Footer align="end">Footer</Card.Footer>
  </Card>
)
// @ts-expect-error Card hover styling does not create an interactive control.
export const interactiveCard = <Card interactive />
// @ts-expect-error Footer position is alignment, not a separate layout model.
export const cardFooterLayout = <Card footerLayout="between" />
// @ts-expect-error Header direction uses orientation consistently with Bar.
export const cardHeaderLayout = <Card.Header layout="bar" />
// @ts-expect-error The surface owns its composed content.
export const cardHtml = <Card dangerouslySetInnerHTML={{ __html: 'Card' }} />
