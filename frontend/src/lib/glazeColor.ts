/** Rough colour prediction for a recipe (weight %), used only to tint the preview tile. */

type Rgb = [number, number, number]

const BASE_CLEAR: Rgb = [226, 215, 198]
// reduction greys the body and the glass, so even a clear reads cooler
const BASE_CLEAR_REDUCTION: Rgb = [214, 216, 206]
const WHITE: Rgb = [248, 247, 244]
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
 * 0–1: how strongly an iron-saturate will recrystallise to rust red on cooling.
 * Needs lots of iron, magnesia/phosphate to seed the crystals, and enough heat to melt it fully;
 * in oxidation it also needs a fluid boron melt, in reduction (kaki) the saturated high-fire melt re-oxidises on its own.
 */
export function ironRedStrength(recipe: Record<string, number>, reduction: boolean, firingTempC = 1222) {
  const iron = ironEquivalent(recipe)
  const seed = clamp01((pct(recipe, ['Talc', 'Bone Ash', 'Dolomite']) - 5) / 8)
  if (reduction) return clamp01((iron - 9) / 3) * seed * clamp01((firingTempC - 1200) / 70)
  const boron = pct(recipe, ['Gerstley Borate', 'Ferro Frit 3134', 'Ferro Frit 3124'])
  return clamp01((iron - 8) / 4) * clamp01((boron - 10) / 15) * seed * clamp01((firingTempC - 1100) / 80)
}

export function predictGlazeColor(recipe: Record<string, number>, reduction: boolean, firingTempC = 1222): string {
  let color = reduction ? BASE_CLEAR_REDUCTION : BASE_CLEAR

  // tin opacifies at roughly half the dose zircon needs
  const opacifier = pct(recipe, ['Zircopax', 'Titanium Dioxide']) + (recipe['Tin Oxide'] ?? 0) * 1.6
  color = lerp(color, WHITE, strength(opacifier, 6))

  const iron = ironEquivalent(recipe)
  const ironRed = ironRedStrength(recipe, reduction, firingTempC)
  if (iron > 0) {
    const t = clamp01((iron - 2) / 7)
    let target: Rgb
    if (reduction) {
      // celadon blue-grey at a trace, olive as Fe3+ builds, tenmoku brown-black when saturated
      const celadon: Rgb = [146, 180, 176]
      const olive: Rgb = [120, 138, 96]
      const tenmoku: Rgb = [40, 30, 24]
      target = t < 0.3 ? lerp(celadon, olive, t / 0.3) : lerp(olive, tenmoku, (t - 0.3) / 0.7)
    } else {
      target = lerp([205, 150, 80], [58, 36, 22], t)
    }
    target = lerp(target, [150, 52, 30], ironRed)
    color = lerp(color, target, strength(iron, reduction ? 3 : 3.5))
  }

  if (reduction) {
    // chun: phosphorus in a reduction clear scatters blue; swamped by more than a trace of iron
    const boneAsh = recipe['Bone Ash'] ?? 0
    if (boneAsh > 1.5) color = lerp(color, [140, 170, 200], strength(boneAsh, 4) * clamp01((3 - iron) / 2))
    // shino: a calcium-free, clay-rich alkaline glaze flashes orange from the body's iron where thin
    const clay = pct(recipe, ['EPK Kaolin', 'Ball Clay'])
    const calcium = pct(recipe, ['Whiting', 'Wollastonite', 'Dolomite'])
    if (calcium < 3 && clay > 15) color = lerp(color, [222, 170, 120], clamp01((clay - 15) / 10) * 0.6)
  }

  const rutile = recipe['Rutile'] ?? 0
  if (rutile > 0) color = lerp(color, [196, 160, 112], strength(rutile, 5))

  const manganese = pct(recipe, ['Manganese Dioxide']) + (recipe['Manganese Granules'] ?? 0) * 0.4
  const cobalt = (recipe['Cobalt Carbonate'] ?? 0) * 0.63 + (recipe['Cobalt Oxide'] ?? 0) * 0.93
  if (manganese > 0) {
    // manganese alone is a dull plum; cobalt alongside it reads as a cleaner violet, in proportion to the load
    const plum: Rgb = lerp([108, 54, 90], [96, 40, 128], clamp01((cobalt * 5) / Math.max(manganese, 0.1)))
    color = lerp(color, plum, strength(manganese, 2.5))
  }

  const nickel = recipe['Nickel Oxide'] ?? 0
  if (nickel > 0) {
    // nickel is blue in zinc glazes, grey-green elsewhere
    const zincBlue = clamp01(((recipe['Zinc Oxide'] ?? 0) - 3) / 5)
    color = lerp(color, lerp([108, 124, 92], [96, 112, 170], zincBlue), strength(nickel, 0.8))
  }

  const chrome = (recipe['Chrome Oxide'] ?? 0) + (recipe['Iron Chromate'] ?? 0) * 0.7
  if (chrome > 0) {
    // chrome-tin pink: a trace of chrome in a tin-opacified base; more chrome deepens it through rose to maroon
    const pinkWithTin = (recipe['Tin Oxide'] ?? 0) > 2 && chrome < 1
    // zinc chromate: chrome goes brown instead of green once there is real zinc in the melt
    const zincBrown = clamp01(((recipe['Zinc Oxide'] ?? 0) - 3) / 5)
    if (pinkWithTin) {
      // The pink is a calcium-tin-silicate (malayaite) pigment forming in the melt, so it needs lime and is
      // killed by magnesia or zinc. A lime-rich, low-alumina boron melt (June Perry Purple) grows enough of it
      // to go wine / burgundy-purple at the same chrome dose that only gives rose pink in a stiffer clear.
      const lime = pct(recipe, ['Whiting', 'Wollastonite']) + pct(recipe, ['Gerstley Borate', 'Ferro Frit 3134']) * 0.5
      const clay = pct(recipe, ['EPK Kaolin', 'Ball Clay', 'Bentonite'])
      const wineMelt = clamp01((lime - 18) / 10) * clamp01((18 - clay) / 8)
      const suppressed = clamp01((pct(recipe, ['Dolomite', 'Talc', 'Zinc Oxide']) - 2) / 6)
      const depth = clamp01((chrome - 0.15) / 0.35 + 0.7 * wineMelt)
      const pink = lerp(lerp([206, 124, 138], [104, 34, 70], depth), [164, 142, 146], suppressed)
      color = lerp(color, pink, strength(chrome, 0.1) * (1 - 0.5 * suppressed))
    } else {
      color = lerp(color, lerp([74, 112, 70], [134, 92, 58], zincBrown), strength(chrome, 1))
    }
  }

  const copper = (recipe['Copper Carbonate'] ?? 0) * 0.72 + (recipe['Copper Oxide'] ?? 0)
  if (copper > 0) {
    const alkaline =
      pct(recipe, ['Nepheline Syenite', 'Soda Feldspar', 'Lithium Carbonate', 'Barium Carbonate']) +
        (recipe['Ferro Frit 3134'] ?? 0) * 0.5 >
      25
    // past ~2% copper the colour keeps deepening before it finally goes metallic black
    const heavy = clamp01((copper - 2) / 2.5)
    const green: Rgb = alkaline
      ? lerp([72, 170, 165], [34, 118, 116], heavy)
      : lerp([62, 134, 78], [40, 98, 58], heavy)
    if (reduction) {
      // copper red only forms from a trace; a few percent stays green (oribe) even in reduction
      const red = clamp01((1.6 - copper) / 0.8)
      color = lerp(color, [138, 24, 36], strength(copper, 0.22) * red)
      color = lerp(color, green, strength(copper, 1.3) * (1 - red))
    } else {
      color = lerp(color, green, strength(copper, 1.3))
    }
  }

  if (cobalt > 0) {
    const softened = pct(recipe, ['Dolomite', 'Talc']) > 10
    let target: Rgb = softened ? [92, 112, 168] : [30, 52, 148]
    // manganese alongside cobalt reads violet rather than blue, the more so as it outweighs the cobalt
    const violet = manganese > 0 ? clamp01(manganese / (manganese + cobalt * 4)) : 0
    target = lerp(target, [84, 40, 150], violet)
    // an iron-saturated melt masks the blue; cobalt there only deepens it toward black
    const ironMask = clamp01((8 - iron) / 4)
    color = lerp(color, target, strength(cobalt, 0.35) * ironMask)
    // titania breaks cobalt into a milky, variegated slate (floating / rutile blues)
    if (rutile > 0) color = lerp(color, [110, 130, 150], strength(rutile, 4) * clamp01(cobalt / 0.4))
  }

  // Stacked colorants saturate to black regardless of hue (iron that has gone to rust crystals excepted).
  const load =
    iron * (1 - ironRed) + cobalt * 5 + copper * 1.5 + manganese * 1.5 + chrome * 2 + nickel * 2
  color = lerp(color, BLACK, clamp01((load - 9) / 7))

  return hex(color)
}
