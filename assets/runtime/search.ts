/** Lower case without accents, so "Café" and "cafe", "Ёлка" and "елка" compare equal. */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase()

/**
 * Whether every word of `search` occurs in one of `texts`, ignoring case and accents: "agent new"
 * finds "Create a new agent". A blank search matches everything; texts that are not strings are
 * skipped. Pure.
 */
export function matchesSearch(search: string, texts: readonly unknown[]): boolean {
  const words = fold(search).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = texts.flatMap((text) =>
    typeof text === 'string' ? [fold(text)] : [],
  )
  return words.every((word) => haystack.some((text) => text.includes(word)))
}
