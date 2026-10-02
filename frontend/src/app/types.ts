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

export type FiringSegment = {
  phase: 'Heat' | 'Cool'
  rateCPerHour: number | null
  rateFPerHour: number | null
  targetTempC: number
  targetTempF: number
  holdMinutes: number
  note: string
}

export type ScheduleLength = 'very-short' | 'short' | 'medium' | 'long'

export type FiringSchedule = {
  length: ScheduleLength
  cone: string
  peakTempC: number
  peakTempF: number
  atmosphere: string
  coolingStrategy: string
  heatingHours: number
  coolingHours: number
  estimatedHours: number
  segments: FiringSegment[]
  notes: string[]
}

export type Umf = {
  fluxes: Record<string, number>
  stabilizers: Record<string, number>
  glassFormers: Record<string, number>
  colorants: Record<string, number>
  siAlRatio: number
  r2oShare: number
}

export type RecipeSuggestion = {
  name: string
  firingRange: string
  ingredients: Record<string, number>
  rationale: string
  umf: Umf
  firingSchedules: FiringSchedule[]
}

export type GenerateRecipesResponse = {
  recipes: RecipeSuggestion[]
}

export type PreviewModalMode = 'realistic' | 'ai' | null

export type RecipeExportPayload = {
  exportedAt: string
  parameters: Record<string, unknown>
  scheduleLength: ScheduleLength
  recipes: RecipeSuggestion[]
}

export type RealismSettings = RealismControls
