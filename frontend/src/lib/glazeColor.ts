/** Rough colour prediction for a recipe (weight %), used only to tint the preview tile. */

type Rgb = [number, number, number]

const BASE_CLEAR: Rgb = [226, 215, 198]
// reduction greys the body and the glass, so even a clear reads cooler
const BASE_CLEAR_REDUCTION: Rgb = [214, 216, 206]
const WHITE: Rgb = [244, 241, 234]
const BLACK: Rgb = [24, 20, 22]

function hex(rgb: Rgb) {
  return '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')
}

function lerp(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function pct(recipe: Record<string, number>, names: string[]) {
  return names.reduce((sum, name) => sum + (recipe[name] ?? 0), 0)
}

/** Saturation curve: how much of the target colour a given % of colorant delivers. */
function strength(amount: number, sensitivity: number) {
  return amount <= 0 ? 0 : 1 - Math.exp(-amount / sensitivity)
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Iron colorants on a red-iron-equivalent basis. */
function ironEquivalent(recipe: Record<string, number>) {
  return (
    pct(recipe, ['Red Iron Oxide', 'Iron Oxide']) +
    (recipe['Yellow Iron Oxide'] ?? 0) * 0.9 +
    (recipe['Ilmenite (granular)'] ?? 0) * 0.5 +
    (recipe['Iron Chromate'] ?? 0) * 0.3
  )
}

/**
 * 0–1: how strongly an oxidation iron-saturate will recrystallise to rust red on cooling.
 * Needs lots of iron (>= ~8%), a fluid boron melt, and magnesia/phosphate to seed the crystals.
 */
export function ironRedStrength(recipe: Record<string, number>, reduction: boolean) {
  if (reduction) return 0
  const iron = ironEquivalent(recipe)
  const boron = pct(recipe, ['Gerstley Borate', 'Ferro Frit 3134', 'Ferro Frit 3124'])
  const crystalHelpers = pct(recipe, ['Talc', 'Bone Ash', 'Dolomite'])
  return clamp01((iron - 8) / 4) * clamp01((boron - 10) / 15) * clamp01((crystalHelpers - 5) / 8)
}

export function predictGlazeColor(recipe: Record<string, number>, reduction: boolean): string {
  let color = reduction ? BASE_CLEAR_REDUCTION : BASE_CLEAR

  const opacifier = pct(recipe, ['Zircopax', 'Tin Oxide', 'Titanium Dioxide'])
  color = lerp(color, WHITE, strength(opacifier, 6))

  const iron = ironEquivalent(recipe)
  const ironRed = ironRedStrength(recipe, reduction)
  if (iron > 0) {
    const light: Rgb = reduction ? [150, 184, 160] : [205, 150, 80]
    const dark: Rgb = reduction ? [40, 30, 24] : [58, 36, 22]
    let target = lerp(light, dark, clamp01((iron - 2) / 7))
    target = lerp(target, [150, 52, 30], ironRed)
    color = lerp(color, target, strength(iron, reduction ? 3 : 3.5))
  }

  const rutile = recipe['Rutile'] ?? 0
  if (rutile > 0) color = lerp(color, [196, 160, 112], strength(rutile, 5))

  const manganese = pct(recipe, ['Manganese Dioxide']) + (recipe['Manganese Granules'] ?? 0) * 0.4
  if (manganese > 0) color = lerp(color, [104, 52, 74], strength(manganese, 2.5))

  const nickel = recipe['Nickel Oxide'] ?? 0
  if (nickel > 0) color = lerp(color, [118, 124, 100], strength(nickel, 1.5))

  const chrome = (recipe['Chrome Oxide'] ?? 0) + (recipe['Iron Chromate'] ?? 0) * 0.7
  if (chrome > 0) {
    // chrome-tin pink: a trace of chrome in a tin-opacified base; the stain forms readily
    const pinkWithTin = (recipe['Tin Oxide'] ?? 0) > 2 && chrome < 1
    color = pinkWithTin
      ? lerp(color, [206, 124, 138], strength(chrome, 0.15))
      : lerp(color, [74, 112, 70], strength(chrome, 1))
  }

  const copper = (recipe['Copper Carbonate'] ?? 0) * 0.72 + (recipe['Copper Oxide'] ?? 0)
  if (copper > 0) {
    const alkaline = pct(recipe, ['Nepheline Syenite', 'Soda Feldspar', 'Lithium Carbonate', 'Barium Carbonate']) > 25
    // copper red needs only a fraction of a percent; oxidation greens need a few percent
    if (reduction) color = lerp(color, [138, 24, 36], strength(copper, 0.22))
    else color = lerp(color, alkaline ? [72, 170, 165] : [62, 134, 78], strength(copper, 1.3))
  }

  const cobalt = (recipe['Cobalt Carbonate'] ?? 0) * 0.63 + (recipe['Cobalt Oxide'] ?? 0) * 0.93
  if (cobalt > 0) {
    const softened = pct(recipe, ['Dolomite', 'Talc']) > 10
    const target: Rgb = softened ? [92, 112, 168] : [30, 52, 148]
    color = lerp(color, target, strength(cobalt, 0.35))
  }

  // Stacked colorants saturate to black regardless of hue (iron that has gone to rust crystals excepted).
  const load =
    iron * (1 - ironRed) + cobalt * 4 + copper * 1.5 + manganese + chrome * 2 + nickel * 2
  color = lerp(color, BLACK, clamp01((load - 9) / 7))

  return hex(color)
}
