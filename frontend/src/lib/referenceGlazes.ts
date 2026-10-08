/**
 * Classic, widely published glaze recipes with the colour they are known to give.
 * Ground truth for tuning `predictGlazeColor`; mirrors the backend's ReferenceGlazes set for UMF.
 *
 * Amounts are parts (normalised to 100% before use). Colour expectations are HSL bands:
 * hue in degrees (a range may wrap past 360), saturation and lightness 0–1. The bands are deliberately
 * generous: the same recipe varies by clay body, thickness, cooling rate and material batch.
 */

export type ColorBand = {
  /** [from, to] in degrees; if from > to the band wraps through 0 */
  hue: [number, number]
  sat: [number, number]
  light: [number, number]
}

export type ReferenceGlaze = {
  name: string
  provenance: string
  tempC: number
  reduction: boolean
  recipe: Record<string, number>
  looksLike: string
  expect: ColorBand
}

// 5x20 (G1214M): the standard cone 6 glossy clear base, used here as a neutral vehicle for single colorants.
const FIVE_BY_TWENTY = {
  Wollastonite: 20,
  'Ferro Frit 3134': 20,
  'Custer Feldspar': 20,
  'EPK Kaolin': 20,
  Silica: 20,
}

// Leach 4-3-2-1: the archetypal cone 10 reduction base.
const LEACH = { 'Potash Feldspar': 40, Silica: 30, Whiting: 20, 'EPK Kaolin': 10 }

const withColorants = (base: Record<string, number>, colorants: Record<string, number>) => ({ ...base, ...colorants })

export const REFERENCE_GLAZES: ReferenceGlaze[] = [
  {
    name: '5x20 clear',
    provenance: 'Tony Hansen, Digitalfire',
    tempC: 1222,
    reduction: false,
    recipe: FIVE_BY_TWENTY,
    looksLike: 'transparent; reads as the warm clay body beneath',
    expect: { hue: [20, 50], sat: [0.1, 0.5], light: [0.78, 0.92] },
  },
  {
    name: '5x20 + 10% Zircopax',
    provenance: 'Standard zircon white (e.g. Digitalfire G2926B-derived whites)',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { Zircopax: 10 }),
    looksLike: 'opaque off-white',
    expect: { hue: [20, 60], sat: [0, 0.35], light: [0.86, 0.98] },
  },
  {
    name: 'Honey amber (5x20 + 4% RIO)',
    provenance: 'Textbook iron amber in oxidation; e.g. Hesselberth & Roy, Mastering Cone 6 Glazes',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Red Iron Oxide': 4 }),
    looksLike: 'transparent amber / honey',
    expect: { hue: [20, 45], sat: [0.35, 0.8], light: [0.35, 0.6] },
  },
  {
    name: "Randy's Red",
    provenance: 'Cone 6 oxidation iron saturate; widely reproduced (Ceramics Monthly, Clay Times)',
    tempC: 1222,
    reduction: false,
    recipe: {
      'Gerstley Borate': 32,
      Silica: 30,
      'Potash Feldspar': 20,
      Talc: 14,
      'EPK Kaolin': 5,
      'Red Iron Oxide': 15,
      Bentonite: 2,
    },
    looksLike: 'rust / brick red breaking to black where thin',
    expect: { hue: [5, 25], sat: [0.45, 0.85], light: [0.25, 0.45] },
  },
  {
    name: 'Tenmoku (Leach + 10% RIO)',
    provenance: 'Traditional; Hamer & Hamer, The Potter\u2019s Dictionary',
    tempC: 1285,
    reduction: true,
    recipe: withColorants(LEACH, { 'Red Iron Oxide': 10 }),
    looksLike: 'glossy brown-black, rust where thin',
    expect: { hue: [10, 40], sat: [0.1, 0.6], light: [0.08, 0.22] },
  },
  {
    name: 'Celadon (Leach + 2% RIO)',
    provenance: 'Traditional; Leach, A Potter\u2019s Book',
    tempC: 1285,
    reduction: true,
    recipe: withColorants(LEACH, { 'Red Iron Oxide': 2 }),
    looksLike: 'pale translucent grey-green',
    expect: { hue: [90, 180], sat: [0.05, 0.35], light: [0.55, 0.8] },
  },
  {
    name: 'Floating Blue',
    provenance: 'John Chappell / Ceramics Monthly; widely reproduced',
    tempC: 1222,
    reduction: false,
    recipe: {
      'Nepheline Syenite': 47.6,
      'Gerstley Borate': 27,
      Silica: 20.4,
      'EPK Kaolin': 5.4,
      'Red Iron Oxide': 2,
      'Cobalt Carbonate': 1,
      Rutile: 4,
    },
    looksLike: 'variegated slate / mid blue with tan-cream breaking',
    expect: { hue: [195, 245], sat: [0.15, 0.6], light: [0.3, 0.55] },
  },
  {
    name: 'Cobalt blue (5x20 + 1% cobalt carbonate)',
    provenance: 'Textbook; any cone 6 reference',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Cobalt Carbonate': 1 }),
    looksLike: 'strong royal blue',
    expect: { hue: [215, 245], sat: [0.4, 0.9], light: [0.2, 0.45] },
  },
  {
    name: 'Cobalt in magnesia matte',
    provenance: 'Cone 10 dolomite matte + 1% cobalt carbonate; classic lavender / periwinkle',
    tempC: 1285,
    reduction: false,
    recipe: { 'Potash Feldspar': 45, Dolomite: 22, 'EPK Kaolin': 23, Silica: 10, 'Cobalt Carbonate': 1 },
    looksLike: 'soft lavender / periwinkle blue',
    expect: { hue: [215, 265], sat: [0.2, 0.6], light: [0.4, 0.65] },
  },
  {
    name: 'Copper green (5x20 + 4% copper carbonate)',
    provenance: 'Textbook oxidation copper in a calcium-boron base',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Copper Carbonate': 4 }),
    looksLike: 'grass / bottle green',
    expect: { hue: [90, 160], sat: [0.2, 0.6], light: [0.3, 0.55] },
  },
  {
    name: 'Alkaline turquoise',
    provenance: 'High-soda copper; e.g. Hamer & Hamer "Egyptian" / alkaline copper blues',
    tempC: 1222,
    reduction: false,
    recipe: { 'Nepheline Syenite': 50, 'Gerstley Borate': 25, Silica: 20, 'EPK Kaolin': 5, 'Copper Carbonate': 3 },
    looksLike: 'turquoise',
    expect: { hue: [165, 200], sat: [0.3, 0.7], light: [0.4, 0.6] },
  },
  {
    name: 'Copper red (reduction)',
    provenance: 'Leach base + 0.5% copper carbonate + 1% tin, cone 10 reduction',
    tempC: 1285,
    reduction: true,
    recipe: withColorants(LEACH, { 'Copper Carbonate': 0.5, 'Tin Oxide': 1 }),
    looksLike: 'oxblood / sang de boeuf red',
    expect: { hue: [340, 15], sat: [0.4, 0.85], light: [0.25, 0.5] },
  },
  {
    name: 'Chrome-tin pink',
    provenance: 'Textbook; 5x20 + 5% tin + 0.2% chrome oxide',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Tin Oxide': 5, 'Chrome Oxide': 0.2 }),
    looksLike: 'opaque rose pink',
    expect: { hue: [330, 10], sat: [0.25, 0.7], light: [0.55, 0.78] },
  },
  {
    name: 'Rutile tan (5x20 + 6% rutile)',
    provenance: 'Textbook rutile in a clear base',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { Rutile: 6 }),
    looksLike: 'warm tan / cream, mottled',
    expect: { hue: [28, 50], sat: [0.25, 0.6], light: [0.6, 0.8] },
  },
  {
    name: 'Manganese plum (5x20 + 4% MnO2)',
    provenance: 'Textbook manganese in a boron clear',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Manganese Dioxide': 4 }),
    looksLike: 'purplish brown / plum',
    expect: { hue: [300, 20], sat: [0.15, 0.5], light: [0.3, 0.5] },
  },
  {
    name: 'Licorice black',
    provenance: 'Cone 6 oxidation black: iron + cobalt + manganese stack (e.g. Hesselberth & Roy)',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Red Iron Oxide': 9, 'Cobalt Carbonate': 2, 'Manganese Dioxide': 2 }),
    looksLike: 'glossy black',
    expect: { hue: [0, 360], sat: [0, 0.4], light: [0.05, 0.2] },
  },
]

/** Normalise a parts recipe to weight %, as the builder does. */
export function toPercentages(recipe: Record<string, number>) {
  const total = Object.values(recipe).reduce((a, b) => a + b, 0)
  const out: Record<string, number> = {}
  for (const [name, parts] of Object.entries(recipe)) out[name] = (parts / total) * 100
  return out
}
