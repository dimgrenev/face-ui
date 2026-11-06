/** Report actual copy success and restore the selection after the legacy fallback. */
export async function copyText(text: string, doc: Document): Promise<boolean> {
  const view = doc.defaultView
  if (view?.isSecureContext && view.navigator.clipboard?.writeText) {
    try {
      await view.navigator.clipboard.writeText(text)
      return true
    } catch {
      /* Try the synchronous fallback. */
    }
  }
  const previous = doc.activeElement as HTMLElement | null
  const selection = doc.getSelection()
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange(),
      )
    : []
  const input = doc.createElement('textarea')
  input.value = text
  input.readOnly = true
  input.style.cssText = 'position:fixed;left:-9999px;opacity:0'
  try {
    // Keep the fallback inside an active modal's focus boundary.
    ;(
      previous?.closest('[role="dialog"], [role="alertdialog"]') ?? doc.body
    ).append(input)
    input.select()
    return doc.execCommand('copy')
  } catch {
    return false
  } finally {
    input.remove()
    if (previous?.isConnected) previous.focus({ preventScroll: true })
    if (selection) {
      selection.removeAllRanges()
      for (const range of ranges) selection.addRange(range)
    }
  }
}
