import type { MaterialModelInput, MaterialProfile, RecipeVisualSignals } from '../types/rendering'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function ingredientTotal(ingredients: Record<string, number> | undefined, keys: string[]) {
  if (!ingredients) return 0
  return keys.reduce((sum, key) => sum + (ingredients[key] ?? 0), 0)
}

export function buildRecipeVisualSignals(ingredients: Record<string, number> | undefined): RecipeVisualSignals {
  return {
    iron: ingredientTotal(ingredients, ['Red Iron Oxide', 'Yellow Iron Oxide', 'Iron Oxide']),
    rutile: ingredientTotal(ingredients, ['Rutile', 'Titanium Dioxide']),
    opacifier: ingredientTotal(ingredients, ['Zircopax', 'Tin Oxide']),
    boron: ingredientTotal(ingredients, ['Frit 3134', 'Frit 3124', 'Gerstley Borate']),
    cobalt: ingredientTotal(ingredients, ['Cobalt Oxide', 'Cobalt Carbonate']),
    copper: ingredientTotal(ingredients, ['Copper Carbonate', 'Copper Oxide']),
    manganese: ingredientTotal(ingredients, ['Manganese Dioxide', 'Manganese Carbonate']),
  }
}

export function describeRecipeVisualSignals(signals: RecipeVisualSignals) {
  const tags: string[] = []
  if (signals.iron >= 2) tags.push('iron speckling')
  if (signals.rutile >= 3) tags.push('rutile variegation')
  if (signals.opacifier >= 4) tags.push('opaque milkiness')
  if (signals.boron >= 8) tags.push('boron melt flow')
  if (signals.cobalt >= 0.5) tags.push('cobalt blue bias')
  if (signals.copper >= 1) tags.push('copper green cast')
  if (signals.manganese >= 1) tags.push('manganese mottling')
  return tags.slice(0, 4)
}

function hexToRgb(hex: string) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#808080'
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  }
}

function confidenceFromRange(flow: number, gloss: number, opacity: number): MaterialProfile['confidence'] {
  const centered =
    (Math.abs(flow - 0.5) < 0.32 ? 1 : 0) +
    (Math.abs(gloss - 0.55) < 0.35 ? 1 : 0) +
    (opacity > 0.05 && opacity < 0.85 ? 1 : 0)

  if (centered >= 3) return 'High'
  if (centered === 2) return 'Medium'
  return 'Low'
}

export function buildMaterialProfile(input: MaterialModelInput): MaterialProfile {
  const baseRgb = hexToRgb(input.color)
  const accentRgb = hexToRgb(input.secondaryColor ?? input.color)
  const recipeSignals = buildRecipeVisualSignals(input.recipeIngredients)

  const silica = ingredientTotal(input.recipeIngredients, ['Silica', 'Flint', 'Quartz'])
  const alumina = ingredientTotal(input.recipeIngredients, ['Kaolin', 'EPK', 'Ball Clay', 'Alumina Hydrate'])
  const flux = ingredientTotal(input.recipeIngredients, [
    'Potash Feldspar',
    'Soda Feldspar',
    'Nepheline Syenite',
    'Frit 3134',
    'Frit 3124',
    'Whiting',
    'Dolomite',
    'Talc',
    'Zinc Oxide',
  ])
  const boron = ingredientTotal(input.recipeIngredients, ['Frit 3134', 'Frit 3124', 'Gerstley Borate'])
  const iron = recipeSignals.iron
  const rutile = recipeSignals.rutile
  const opacifier = recipeSignals.opacifier

  const tempBias = clamp((input.firingTempC - 1180) / 150, -0.5, 0.9)
  const stabilityBias = input.stability === 'Low' ? 0.08 : input.stability === 'Medium' ? 0.03 : -0.02
  const finishGloss = input.surfaceFinish === 'Glossy' ? 0.9 : input.surfaceFinish === 'Satin' ? 0.58 : 0.25
  const thicknessFlow = input.controls.thickness === 'Thin' ? -0.08 : input.controls.thickness === 'Thick' ? 0.1 : 0
  const coolingFlow = input.controls.cooling === 'Fast' ? 0.06 : input.controls.cooling === 'Slow' ? -0.03 : 0

  const flow = clamp(
    0.44 + flux * 0.012 + boron * 0.014 + tempBias + stabilityBias + thicknessFlow + coolingFlow - silica * 0.006 - alumina * 0.008,
    0.05,
    1,
  )

  const effectBoost = input.effect === 'Melt' ? 0.12 : input.effect === 'Crystalline' ? 0.08 : 0
  const gloss = clamp(finishGloss * 0.65 + flow * 0.35 + effectBoost - (input.foodSafe ? 0.05 : 0), 0, 1)
  const roughness = clamp(1 - gloss + (input.controls.atmosphere === 'Reduction' ? 0.03 : 0), 0.04, 0.95)

  const opacity = clamp(
    0.11 + opacifier * 0.035 + alumina * 0.004 + (input.effect === 'Opaque' ? 0.2 : 0) + (input.controls.clayBody === 'Iron-rich Stoneware' ? 0.05 : 0),
    0.05,
    0.96,
  )

  const intensityFactor = clamp(input.intensity / 100, 0, 2)
  const speckleDensity = clamp((iron * 0.05 + rutile * 0.06) * (0.6 + intensityFactor * 0.3), 0, 1)
  const crystalDensity = clamp((rutile * 0.05 + boron * 0.025 + (input.effect === 'Crystalline' ? 0.22 : 0)) * (0.7 + intensityFactor * 0.25), 0, 1)
  const variegationStrength = clamp((rutile * 0.06 + iron * 0.03 + (input.effect === 'Variegated' ? 0.2 : 0)) * (0.65 + intensityFactor * 0.35), 0, 1)

  const pooling = clamp(flow * (input.controls.thickness === 'Thick' ? 1 : 0.75), 0.05, 1)
  const edgeBreak = clamp((1 - opacity) * 0.5 + flow * 0.25 + (input.controls.clayBody === 'Buff Stoneware' ? 0.06 : 0), 0, 1)
  const microPitting = clamp((input.stability === 'Low' ? 0.2 : 0.05) + (input.controls.atmosphere === 'Reduction' ? 0.08 : 0), 0, 0.6)

  return {
    baseRgb,
    accentRgb,
    gloss,
    roughness,
    opacity,
    flow,
    pooling,
    edgeBreak,
    speckleDensity,
    crystalDensity,
    variegationStrength,
    microPitting,
    recipeSignals,
    confidence: confidenceFromRange(flow, gloss, opacity),
  }
}
