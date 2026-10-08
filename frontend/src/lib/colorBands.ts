import type { ColorBand } from './referenceGlazes'

export type Hsl = { h: number; s: number; l: number }

export function hexToHsl(hex: string): Hsl {
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

export function inHueBand(h: number, [from, to]: [number, number]) {
  return from <= to ? h >= from && h <= to : h >= from || h <= to
}

export function describeMiss(hsl: Hsl, band: ColorBand) {
  const misses: string[] = []
  if (!inHueBand(hsl.h, band.hue)) misses.push(`hue ${hsl.h.toFixed(0)} not in [${band.hue}]`)
  if (hsl.s < band.sat[0] || hsl.s > band.sat[1]) misses.push(`sat ${hsl.s.toFixed(2)} not in [${band.sat}]`)
  if (hsl.l < band.light[0] || hsl.l > band.light[1]) misses.push(`light ${hsl.l.toFixed(2)} not in [${band.light}]`)
  return misses
}

export function formatHsl(hex: string) {
  const { h, s, l } = hexToHsl(hex)
  return `${hex}  h${h.toFixed(0).padStart(3)} s${s.toFixed(2)} l${l.toFixed(2)}`
}
