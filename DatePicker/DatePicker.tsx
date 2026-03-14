import { forwardRef } from 'react'
import { Date as FaceDate, type DateProps, type DatePreset } from '../Date/Date'

export interface DatePickerProps extends DateProps {}
export type { DatePreset }

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(function DatePicker(props, ref) {
  return <FaceDate ref={ref} mode="date" {...props} />
})
