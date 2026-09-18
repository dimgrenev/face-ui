/** Evaluate in the browser. Covers text over solid, possibly translucent
 * backgrounds; fail explicitly if the fixture adds unsupported compositing. */
export function solidTextContrast(element: Element): number {
  const context = document.createElement('canvas').getContext('2d')!
  const rgba = (color: string) => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    return [...context.getImageData(0, 0, 1, 1).data]
  }
  const blend = (foreground: number[], background: number[]) =>
    foreground
      .slice(0, 3)
      .map(
        (value, index) =>
          (value * foreground[3]) / 255 +
          background[index] * (1 - foreground[3] / 255),
      )
  const ancestors: Element[] = []
  for (let node: Element | null = element; node; node = node.parentElement)
    ancestors.unshift(node)
  let background = [255, 255, 255]
  for (const node of ancestors) {
    const style = getComputedStyle(node)
    // Card paints flat color layers as equal-stop gradients. They composite
    // like solid fills; spatial gradients and images still require pixel QA.
    const flatLayers: string[] = []
    const images = style.backgroundImage.replace(
      /linear-gradient\((rgba?\([^)]+\)), \1\)/g,
      (_match, color: string) => {
        flatLayers.push(color)
        return 'none'
      },
    )
    if (
      Number(style.opacity) !== 1 ||
      !/^none(?:,\s*none)*$/.test(images) ||
      style.filter !== 'none' ||
      style.mixBlendMode !== 'normal'
    )
      throw new Error(
        'Contrast fixture requires solid backgrounds without opacity, filters or blending',
      )
    background = blend(rgba(style.backgroundColor), background)
    for (const color of flatLayers.reverse())
      background = blend(rgba(color), background)
  }
  const luminance = (color: number[]) =>
    color
      .map((value) => {
        value /= 255
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4
      })
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      )
  const a = luminance(blend(rgba(getComputedStyle(element).color), background))
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
