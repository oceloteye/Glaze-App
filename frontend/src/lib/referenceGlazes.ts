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
    looksLike: 'pale translucent blue-grey-green',
    expect: { hue: [130, 190], sat: [0.05, 0.35], light: [0.55, 0.8] },
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
    expect: { hue: [200, 235], sat: [0.15, 0.35], light: [0.38, 0.58] },
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
  {
    name: 'Oxidation tenmoku (5x20 + 10% RIO)',
    provenance: 'Iron saturate in a calcium-boron base with nothing to seed rust crystals',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Red Iron Oxide': 10 }),
    looksLike: 'dark brown-black; control for Randy\u2019s Red',
    expect: { hue: [10, 40], sat: [0.15, 0.6], light: [0.1, 0.26] },
  },
  {
    name: 'Ohata Kaki',
    provenance: 'Classic cone 10 reduction iron saturate; Ohata Kaki (Custer 48 / Silica 24 / Whiting 12 / Bone Ash 7 / Talc 4.5 / RIO 12)',
    tempC: 1285,
    reduction: true,
    recipe: { 'Custer Feldspar': 48, Silica: 24, Whiting: 12, 'Bone Ash': 7, Talc: 4.5, 'Red Iron Oxide': 12 },
    looksLike: 'persimmon / rust red-brown, black where thick',
    expect: { hue: [8, 30], sat: [0.35, 0.75], light: [0.22, 0.42] },
  },
  {
    name: 'Olive celadon (Leach + 4% RIO)',
    provenance: 'Traditional; heavier iron celadon',
    tempC: 1285,
    reduction: true,
    recipe: withColorants(LEACH, { 'Red Iron Oxide': 4 }),
    looksLike: 'olive / bottle green',
    expect: { hue: [70, 150], sat: [0.08, 0.4], light: [0.4, 0.62] },
  },
  {
    name: 'Chun / Jun blue',
    provenance: 'Phosphorus opalescence in a reduction clear; Leach + 4% bone ash + 1% RIO (Hamer & Hamer)',
    tempC: 1285,
    reduction: true,
    recipe: withColorants(LEACH, { 'Bone Ash': 4, 'Red Iron Oxide': 1 }),
    looksLike: 'milky opalescent pale blue',
    expect: { hue: [185, 235], sat: [0.08, 0.4], light: [0.6, 0.85] },
  },
  {
    name: 'Shino (spodumene / nepheline)',
    provenance: 'High-alumina, calcium-free reduction shino; e.g. Grotell / Wirt shinos (soda ash omitted)',
    tempC: 1285,
    reduction: true,
    recipe: { 'Nepheline Syenite': 50, Spodumene: 25, 'EPK Kaolin': 15, 'Ball Clay': 10 },
    looksLike: 'warm white to orange flashing where thin',
    expect: { hue: [18, 45], sat: [0.2, 0.6], light: [0.68, 0.88] },
  },
  {
    name: 'Oribe (Leach + 5% copper carbonate, reduction)',
    provenance: 'Traditional; copper at this level stays green even in reduction',
    tempC: 1285,
    reduction: true,
    recipe: withColorants(LEACH, { 'Copper Carbonate': 5 }),
    looksLike: 'deep grass green',
    expect: { hue: [95, 165], sat: [0.2, 0.6], light: [0.28, 0.5] },
  },
  {
    name: 'Chrome green (5x20 + 2% chrome oxide)',
    provenance: 'Textbook; chrome without tin is an opaque green',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Chrome Oxide': 2 }),
    looksLike: 'opaque leaf green',
    expect: { hue: [90, 150], sat: [0.15, 0.5], light: [0.3, 0.55] },
  },
  {
    name: 'Nickel blue (zinc base)',
    provenance: 'Nickel in a high-zinc cone 6 base; e.g. Hesselberth & Roy nickel blues',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Zinc Oxide': 10, 'Nickel Oxide': 1 }),
    looksLike: 'soft blue / blue-violet',
    expect: { hue: [205, 260], sat: [0.15, 0.5], light: [0.45, 0.7] },
  },
  {
    name: 'Nickel green (magnesia matte)',
    provenance: 'Nickel in a dolomite matte: grey-green',
    tempC: 1285,
    reduction: false,
    recipe: { 'Potash Feldspar': 45, Dolomite: 22, 'EPK Kaolin': 23, Silica: 10, 'Nickel Oxide': 1.5 },
    looksLike: 'muted grey-green / khaki',
    expect: { hue: [60, 140], sat: [0.08, 0.35], light: [0.4, 0.65] },
  },
  {
    name: 'Barium copper blue',
    provenance: 'Classic cone 10 barium matte + copper; turquoise-blue',
    tempC: 1285,
    reduction: false,
    recipe: { 'Potash Feldspar': 40, 'Barium Carbonate': 30, 'EPK Kaolin': 10, Silica: 20, 'Copper Carbonate': 3 },
    looksLike: 'turquoise blue, matte',
    expect: { hue: [170, 210], sat: [0.25, 0.65], light: [0.4, 0.62] },
  },
  {
    name: 'Ochre (5x20 + 3% yellow iron oxide)',
    provenance: 'Textbook; yellow iron is a weaker, yellower iron source',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { 'Yellow Iron Oxide': 3 }),
    looksLike: 'honey yellow / ochre',
    expect: { hue: [28, 48], sat: [0.3, 0.7], light: [0.5, 0.72] },
  },
  {
    name: 'Majolica tin white',
    provenance: 'Frit 3124 90 / EPK 10 + 8% tin; Arbuckle-style majolica',
    tempC: 1000,
    reduction: false,
    recipe: { 'Ferro Frit 3124': 90, 'EPK Kaolin': 10, 'Tin Oxide': 8 },
    looksLike: 'opaque warm white',
    expect: { hue: [0, 360], sat: [0, 0.3], light: [0.88, 0.98] },
  },
  {
    name: "Randy's Red underfired (cone 04)",
    provenance: 'Same recipe short of its melt: the iron never recrystallises, it just goes brown',
    tempC: 1060,
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
    looksLike: 'dull dark brown, no red',
    expect: { hue: [12, 40], sat: [0.2, 0.6], light: [0.12, 0.3] },
  },
  {
    name: 'Ohata Kaki underfired (cone 6 reduction)',
    provenance: 'A cone 10 kaki fired two cones low stays a stiff dark brown',
    tempC: 1222,
    reduction: true,
    recipe: { 'Custer Feldspar': 48, Silica: 24, Whiting: 12, 'Bone Ash': 7, Talc: 4.5, 'Red Iron Oxide': 12 },
    looksLike: 'dark brown, only a hint of rust',
    expect: { hue: [8, 35], sat: [0.1, 0.45], light: [0.12, 0.28] },
  },
  {
    name: 'Low-fire frit turquoise',
    provenance: 'High-soda frit base + copper at cone 06; the "Egyptian" turquoise family',
    tempC: 1000,
    reduction: false,
    recipe: { 'Ferro Frit 3134': 70, 'EPK Kaolin': 15, Silica: 15, 'Copper Carbonate': 3 },
    looksLike: 'bright turquoise',
    expect: { hue: [165, 200], sat: [0.3, 0.7], light: [0.4, 0.62] },
  },
  {
    name: 'Rutile blue (cone 6 oxidation)',
    provenance: 'Rutile + a little cobalt in a boron base; the generic "rutile blue" family',
    tempC: 1222,
    reduction: false,
    recipe: withColorants(FIVE_BY_TWENTY, { Rutile: 5, 'Cobalt Carbonate': 0.5 }),
    looksLike: 'milky variegated slate blue',
    expect: { hue: [200, 235], sat: [0.12, 0.35], light: [0.45, 0.65] },
  },
]

/** Normalise a parts recipe to weight %, as the builder does. */
export function toPercentages(recipe: Record<string, number>) {
  const total = Object.values(recipe).reduce((a, b) => a + b, 0)
  const out: Record<string, number> = {}
  for (const [name, parts] of Object.entries(recipe)) out[name] = (parts / total) * 100
  return out
}
