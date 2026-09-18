import { invalidProp } from './props'

const ZERO = BigInt(0)
const ONE = BigInt(1)
const TEN = BigInt(10)
function decimal(value: number) {
  const [mantissa, power = '0'] = String(value).toLowerCase().split('e')
  const fraction = mantissa.split('.')[1]?.length ?? 0
  return {
    integer: BigInt(mantissa.replace('.', '')),
    exponent: Number(power) - fraction,
  }
}
function units(value: ReturnType<typeof decimal>, exponent: number) {
  return value.integer * TEN ** BigInt(value.exponent - exponent)
}
/**
 * Slider's decimal grid anchored at min. Integer arithmetic avoids rounding away
 * small increments at large offsets, and overflow in (max - min) / step.
 * Non-finite or crossed bounds become 0..100 (min == max is legal) and a step
 * that is not positive and finite becomes 1; both are reported.
 */
export function createRange(min: number, max: number, step: number) {
  if (!(Number.isFinite(min) && Number.isFinite(max) && min <= max)) {
    const prop = Number.isFinite(min) ? 'max' : 'min'
    invalidProp('Slider', prop, prop === 'min' ? min : max, 'using 0..100')
    min = 0
    max = 100
  }
  if (!(Number.isFinite(step) && step > 0)) {
    invalidProp('Slider', 'step', step, 'using 1')
    step = 1
  }
  const a = decimal(min),
    b = decimal(max),
    s = decimal(step)
  const exponent = Math.min(a.exponent, b.exponent, s.exponent)
  const start = units(a, exponent),
    end = units(b, exponent),
    stride = units(s, exponent)
  const last = (end - start) / stride
  const at = (index: bigint) =>
    Number(
      `${start + (index < ZERO ? ZERO : index > last ? last : index) * stride}e${exponent}`,
    )
  const index = (value: number) => {
    if (!(value > min)) return ZERO // NaN included
    if (value >= max) return last
    const entry = decimal(value)
    const precision = Math.min(exponent, entry.exponent)
    const factor = TEN ** BigInt(exponent - precision)
    const offset = units(entry, precision) - start * factor
    const increment = stride * factor
    const quotient = offset / increment
    return (
      quotient + ((offset % increment) * BigInt(2) >= increment ? ONE : ZERO)
    )
  }
  const upper = at(last)
  if (last > ZERO && (at(ONE) === min || at(last - ONE) === upper))
    invalidProp(
      'Slider',
      'step',
      step,
      'keeping it, though some steps cannot change the value',
    )
  return {
    min,
    max: upper,
    step,
    snap: (value: number) => at(index(value)),
    move: (value: number, count: number) => at(index(value) + BigInt(count)),
    ratio: (value: number) =>
      min === upper
        ? 0
        : Number.isFinite(upper - min)
          ? (value - min) / (upper - min)
          : (value / 2 - min / 2) / (upper / 2 - min / 2),
    fromRatio: (ratio: number) => {
      const t = Math.max(0, Math.min(1, ratio))
      return at(index(min * (1 - t) + upper * t))
    },
  }
}
