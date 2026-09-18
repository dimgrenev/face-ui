import { Rating as AuditedRating, type RatingValueDetails } from '../../../Rating/Rating'

// Rating owns semantic roles/values; native names replace ariaLabel.
const ratingFormatter = ({ value, max }: RatingValueDetails) => `${value} из ${max}`
;<AuditedRating readOnly value={4.2} formatValue={ratingFormatter} aria-label="Average" />
;<AuditedRating name="score" required form="review" autoFocus membrane={false} />
// @ts-expect-error native naming replaces the duplicate alias
;<AuditedRating ariaLabel="Review" />
// @ts-expect-error required native validation needs a form key
;<AuditedRating required />
// @ts-expect-error a readonly rating still owns the precise numeric value
const mismatchedRating: import('../../../Rating/Rating').RatingProps = { 'aria-valuenow': 9 }
// @ts-expect-error custom children bypass choice semantics
;<AuditedRating>Stars</AuditedRating>
// @ts-expect-error Rating chooses its semantic role
;<AuditedRating role="slider" />
