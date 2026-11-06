/** Structural subset of the existing host example context; no SDK dependency. */
export interface ExampleCheckContext {
  canvas: HTMLElement
  signal: AbortSignal
  assert(condition: unknown, message?: string): asserts condition
  waitFor(assertion: () => void | Promise<void>): Promise<void>
}

/** Synthetic DOM activation in the owned document, not physical pointer proof. */
export function pressExampleControl(context: ExampleCheckContext, control: HTMLElement | null | undefined) {
  context.signal.throwIfAborted()
  if (!control) throw new Error('The configured example must provide its own control.')
  if (control.matches(':disabled, [aria-disabled="true"]') || control.closest('[inert]'))
    throw new Error('The configured control is unavailable.')
  control.click()
}
