import type { RealismControls } from '../types/rendering'

export type TempUnit = 'C' | 'F'

export type GlazeRequest = {
  color: string
  firingTempC: number
  surfaceFinish: string
  stability: string
  effects: string[]
  intensity?: number
  secondaryColor?: string
  feldsparSubstitute?: string
  colorCharacter?: string
  atmosphere?: string
  foodSafe?: boolean
}

export type RecipeSuggestion = {
  name: string
  firingRange: string
  ingredients: Record<string, number>
  rationale: string
}

export type GenerateRecipesResponse = {
  recipes: RecipeSuggestion[]
}

export type PreviewModalMode = 'realistic' | 'ai' | null

export type RecipeExportPayload = {
  exportedAt: string
  parameters: Record<string, unknown>
  recipes: RecipeSuggestion[]
}

export type RealismSettings = RealismControls
