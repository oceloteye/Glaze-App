/**
 * The generator's colour palette: a hue family picks the colourant system, and two sliders scale it.
 * Each family still resolves to a hex (for the API's colour field, effects and exports), but the hex is
 * derived from the family's own range so it always lands where that chemistry can go.
 */

export type HueFamilyId =
  | 'rust-red'
  | 'bright-red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'olive'
  | 'green'
  | 'turquoise'
  | 'blue'
  | 'violet'
  | 'magenta'
  | 'wine'
  | 'pink'
  | 'brown'
  | 'grey'
  | 'black'
  | 'white'

export interface HueFamily {
  id: HueFamilyId
  label: string
  /** What does the colouring in a glaze of this family. */
  system: string
  hue: number
  /** HSL saturation at slider 0 and 100. */
  saturation: [number, number]
  /** HSL lightness at depth 0 (light) and 100 (deep). */
  lightness: [number, number]
  /** Set when the clean, saturated version only exists as an inclusion stain. */
  stainNote?: string
}

export const HUE_FAMILIES: readonly HueFamily[] = [
  { id: 'rust-red', label: 'Rust red', system: 'iron saturate', hue: 12, saturation: [0.35, 0.7], lightness: [0.5, 0.22] },
  {
    id: 'bright-red',
    label: 'Bright red',
    system: 'inclusion stain',
    hue: 2,
    saturation: [0.6, 0.9],
    lightness: [0.55, 0.35],
    stainNote: 'A clean red needs an encapsulated stain; oxides give rust red in oxidation or copper red in high-fire reduction.',
  },
  {
    id: 'orange',
    label: 'Orange',
    system: 'inclusion stain',
    hue: 28,
    saturation: [0.6, 0.9],
    lightness: [0.6, 0.4],
    stainNote: 'A clean orange needs an encapsulated stain; iron and rutile give a burnt orange-tan instead.',
  },
  { id: 'amber', label: 'Amber / honey', system: 'iron', hue: 38, saturation: [0.3, 0.65], lightness: [0.7, 0.3] },
  {
    id: 'yellow',
    label: 'Yellow',
    system: 'inclusion stain',
    hue: 56,
    saturation: [0.45, 0.9],
    lightness: [0.65, 0.48],
    stainNote: 'A clean yellow needs a stain; rutile and yellow iron give mustard and ochre instead.',
  },
  { id: 'olive', label: 'Olive', system: 'copper + yellow iron', hue: 90, saturation: [0.15, 0.45], lightness: [0.6, 0.3] },
  { id: 'green', label: 'Green', system: 'copper or chrome', hue: 130, saturation: [0.15, 0.5], lightness: [0.6, 0.28] },
  { id: 'turquoise', label: 'Turquoise', system: 'copper in alkaline melt', hue: 178, saturation: [0.25, 0.6], lightness: [0.65, 0.3] },
  { id: 'blue', label: 'Blue', system: 'cobalt', hue: 225, saturation: [0.15, 0.7], lightness: [0.72, 0.25] },
  { id: 'violet', label: 'Violet / plum', system: 'manganese + cobalt', hue: 285, saturation: [0.15, 0.45], lightness: [0.6, 0.28] },
  {
    id: 'magenta',
    label: 'Magenta',
    system: 'inclusion stain',
    hue: 312,
    saturation: [0.5, 0.85],
    lightness: [0.55, 0.3],
    stainNote: 'A clean magenta needs a stain; manganese reaches a plum-magenta at best.',
  },
  { id: 'wine', label: 'Wine / burgundy', system: 'chrome-tin in lime', hue: 335, saturation: [0.3, 0.55], lightness: [0.48, 0.24] },
  { id: 'pink', label: 'Pink / rose', system: 'chrome-tin', hue: 348, saturation: [0.3, 0.6], lightness: [0.78, 0.52] },
  { id: 'brown', label: 'Brown', system: 'iron + manganese', hue: 25, saturation: [0.15, 0.4], lightness: [0.5, 0.2] },
  { id: 'grey', label: 'Grey', system: 'nickel + iron', hue: 210, saturation: [0, 0.08], lightness: [0.72, 0.32] },
  { id: 'black', label: 'Black', system: 'iron saturate', hue: 20, saturation: [0, 0.15], lightness: [0.14, 0.08] },
  { id: 'white', label: 'White / cream', system: 'zircon', hue: 40, saturation: [0, 0.15], lightness: [0.96, 0.86] },
]

export const DEFAULT_HUE_FAMILY: HueFamilyId = 'green'

const DEFAULT_FAMILY = HUE_FAMILIES.find((family) => family.id === DEFAULT_HUE_FAMILY) ?? HUE_FAMILIES[0]

export function hueFamily(id: string | undefined): HueFamily {
  return HUE_FAMILIES.find((family) => family.id === id) ?? DEFAULT_FAMILY
}

export function isStainOnly(id: string | undefined) {
  return Boolean(hueFamily(id).stainNote)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return (
    '#' +
    [f(0), f(8), f(4)]
      .map((c) =>
        Math.round(Math.max(0, Math.min(255, c * 255)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

/** The hex a family resolves to at the given slider positions (both 0–100). */
export function familyHex(id: string | undefined, saturation: number, depth: number) {
  const family = hueFamily(id)
  const s = clamp01(saturation / 100)
  const d = clamp01(depth / 100)
  return hslToHex(family.hue, lerp(family.saturation[0], family.saturation[1], s), lerp(family.lightness[0], family.lightness[1], d))
}
