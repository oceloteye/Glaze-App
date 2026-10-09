/** Maps the analysis vocabulary onto the preview renderer's inputs so the on-screen and printed previews agree. */

import type { GlazePreviewRenderOptions } from '../GlazePreview'
import type { RecipeSuggestion } from '../app/types'
import { predictGlazeColor } from './glazeColor'

export function surfaceForPreview(surface: string | undefined) {
  if (surface === 'Glossy' || surface === 'Satin') return surface
  if (surface === 'Matte' || surface === 'Dry matte') return 'Matte'
  return 'Satin'
}

export function stabilityForPreview(meltLabel: string | undefined) {
  if (meltLabel === 'Runny' || meltLabel === 'Fluid') return 'Low'
  if (meltLabel === 'Balanced') return 'Medium'
  return 'High'
}

export function effectForPreview(percentages: Record<string, number>) {
  if ((percentages['Manganese Granules'] ?? 0) > 0 || (percentages['Ilmenite (granular)'] ?? 0) > 0) return 'Speckled'
  if ((percentages['Zinc Oxide'] ?? 0) >= 8 && ((percentages['Titanium Dioxide'] ?? 0) > 0 || (percentages['Rutile'] ?? 0) > 0)) {
    return 'Crystalline'
  }
  if ((percentages['Rutile'] ?? 0) >= 3) return 'Variegated'
  return ''
}

export type RecipePreviewContext = {
  firingTempC: number
  atmosphere?: string
  surfaceFinish: string
  stability: string
  opacity?: string
}

/** What a generated recipe's chemistry predicts — the same estimate the builder shows once it is handed off. */
export function recipePreviewOptions(recipe: RecipeSuggestion, context: RecipePreviewContext): GlazePreviewRenderOptions {
  const atmosphere = context.atmosphere ?? 'Oxidation'
  const reduction = atmosphere.toLowerCase() === 'reduction'
  return {
    color: predictGlazeColor(recipe.ingredients, reduction, context.firingTempC),
    surfaceFinish: context.surfaceFinish,
    effect: effectForPreview(recipe.ingredients),
    recipeIngredients: recipe.ingredients,
    firingTempC: context.firingTempC,
    stability: context.stability,
    opacity: context.opacity ?? 'Semi-opaque',
    foodSafe: false,
    atmosphere,
  }
}
