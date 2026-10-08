import { describe, expect, it } from 'vitest'
import { predictGlazeColor } from './glazeColor'
import { REFERENCE_GLAZES, toPercentages, type ColorBand } from './referenceGlazes'

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

function inHueBand(h: number, [from, to]: [number, number]) {
  return from <= to ? h >= from && h <= to : h >= from || h <= to
}

function describeMiss(hsl: { h: number; s: number; l: number }, band: ColorBand) {
  const misses: string[] = []
  if (!inHueBand(hsl.h, band.hue)) misses.push(`hue ${hsl.h.toFixed(0)} not in [${band.hue}]`)
  if (hsl.s < band.sat[0] || hsl.s > band.sat[1]) misses.push(`sat ${hsl.s.toFixed(2)} not in [${band.sat}]`)
  if (hsl.l < band.light[0] || hsl.l > band.light[1]) misses.push(`light ${hsl.l.toFixed(2)} not in [${band.light}]`)
  return misses
}

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
      const { h, s, l } = hexToHsl(hex)
      return `${hex}  h${h.toFixed(0).padStart(3)} s${s.toFixed(2)} l${l.toFixed(2)}  ${ref.name.padEnd(42)} ${ref.looksLike}`
    })
    console.log('\n' + rows.join('\n'))
  })
})
