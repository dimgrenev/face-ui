import { useCallback, useState } from 'react'

export function useControllableOpenState(
  open: boolean | undefined,
  defaultOpen = false,
  onOpenChange?: (details: { open: boolean }) => void,
) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const value = isControlled ? open : uncontrolledOpen

  const setValue = useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.({ open: nextOpen })
  }, [isControlled, onOpenChange])

  return [value, setValue] as const
}
