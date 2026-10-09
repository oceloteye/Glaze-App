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
}

/** What a generated recipe's chemistry predicts — the same inputs the builder's preview uses once it is handed off. */
export function recipePreviewOptions(recipe: RecipeSuggestion, context: RecipePreviewContext): GlazePreviewRenderOptions {
  const atmosphere = context.atmosphere ?? 'Oxidation'
  const reduction = atmosphere === 'Reduction'
  const properties = recipe.properties
  return {
    color: predictGlazeColor(recipe.ingredients, reduction, context.firingTempC),
    surfaceFinish: surfaceForPreview(properties?.surface),
    effect: effectForPreview(recipe.ingredients),
    recipeIngredients: recipe.ingredients,
    firingTempC: context.firingTempC,
    stability: stabilityForPreview(properties?.meltLabel),
    opacity: properties?.opacityLabel ?? 'Semi-opaque',
    foodSafe: false,
    atmosphere,
  }
}
