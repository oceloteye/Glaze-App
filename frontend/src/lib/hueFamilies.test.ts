import { describe, expect, it } from 'vitest'
import { DEFAULT_HUE_FAMILY, HUE_FAMILIES, familyHex, hslToHex, hueFamily, isStainOnly } from './hueFamilies'

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { s, l }
}

describe('hue families', () => {
  it('have unique ids and the default exists', () => {
    const ids = HUE_FAMILIES.map((family) => family.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(DEFAULT_HUE_FAMILY)
  })

  it('fall back to the default family for unknown ids', () => {
    expect(hueFamily('not-a-family').id).toBe(DEFAULT_HUE_FAMILY)
    expect(hueFamily(undefined).id).toBe(DEFAULT_HUE_FAMILY)
  })

  it('flag only the families that need an inclusion stain', () => {
    const flagged = HUE_FAMILIES.filter((family) => isStainOnly(family.id)).map((family) => family.id)
    expect(flagged).toEqual(['bright-red', 'orange', 'yellow', 'magenta'])
  })

  it('resolve every family to a valid hex at the slider extremes', () => {
    for (const family of HUE_FAMILIES) {
      for (const saturation of [0, 50, 100]) {
        for (const depth of [0, 50, 100]) {
          expect(familyHex(family.id, saturation, depth)).toMatch(/^#[0-9a-f]{6}$/)
        }
      }
    }
  })

  it('go darker with depth and more saturated with saturation', () => {
    for (const family of HUE_FAMILIES) {
      const light = hexToHsl(familyHex(family.id, 50, 0)).l
      const deep = hexToHsl(familyHex(family.id, 50, 100)).l
      expect(deep, family.id).toBeLessThan(light)
      if (family.saturation[1] > family.saturation[0]) {
        const muted = hexToHsl(familyHex(family.id, 0, 50)).s
        const pure = hexToHsl(familyHex(family.id, 100, 50)).s
        expect(pure, family.id).toBeGreaterThan(muted)
      }
    }
  })

  it('converts HSL to hex', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000')
    expect(hslToHex(120, 1, 0.25)).toBe('#008000')
    expect(hslToHex(0, 0, 1)).toBe('#ffffff')
  })
})
