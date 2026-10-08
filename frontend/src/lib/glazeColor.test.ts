import { describe, expect, it } from 'vitest'
import { predictGlazeColor } from './glazeColor'
import { REFERENCE_GLAZES, toPercentages } from './referenceGlazes'
import { describeMiss, formatHsl, hexToHsl } from './colorBands'

describe('predictGlazeColor against published reference glazes', () => {
  it.each(REFERENCE_GLAZES.map((ref) => [ref.name, ref] as const))('%s', (_name, ref) => {
    const hex = predictGlazeColor(toPercentages(ref.recipe), ref.reduction, ref.tempC)
    const hsl = hexToHsl(hex)
    const misses = describeMiss(hsl, ref.expect)
    expect(misses, `${ref.name} → ${hex} (expected ${ref.looksLike})`).toEqual([])
  })

  // PRINT_COLORS=1 npx vitest run  →  dumps the predicted swatch table for eyeballing
  it.runIf(import.meta.env.PRINT_COLORS)('prints the predicted swatch table', () => {
    const rows = REFERENCE_GLAZES.map((ref) => {
      const hex = predictGlazeColor(toPercentages(ref.recipe), ref.reduction, ref.tempC)
      return `${formatHsl(hex)}  ${ref.name.padEnd(42)} ${ref.looksLike}`
    })
    console.log('\n' + rows.join('\n'))
  })
})
