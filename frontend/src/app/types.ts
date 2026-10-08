export type TempUnit = 'C' | 'F'

export type GlazeRequest = {
  color: string
  firingTempC: number
  surfaceFinish: string
  stability: string
  opacity: string
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

export type RecipeRoute = {
  name: string
  summary: string
  signature: string[]
}

export type RecipeSuggestion = {
  name: string
  firingRange: string
  ingredients: Record<string, number>
  rationale: string
  umf: Umf
  firingSchedules: FiringSchedule[]
  route?: RecipeRoute
}

export type GenerateRecipesResponse = {
  recipes: RecipeSuggestion[]
}

export type RecipeExportPayload = {
  exportedAt: string
  parameters: Record<string, unknown>
  scheduleLength: ScheduleLength
  recipes: RecipeSuggestion[]
}

// ── Recipe Builder ──────────────────────────────────────────────────────────

export type MaterialInfo = {
  name: string
  category: string
  role: string
  description: string
  analysis: Record<string, number>
  hazard: string | null
  foodSafety: string | null
  maxParts: number
}

export type WarningSeverity = 'info' | 'caution' | 'danger'
export type WarningCategory = 'toxicity' | 'food-safety' | 'fit' | 'maturity' | 'application'

export type GlazeWarning = {
  severity: WarningSeverity
  category: WarningCategory
  title: string
  message: string
}

export type GlazeProperties = {
  melt: number
  meltLabel: string
  gloss: number
  surface: string
  opacity: number
  opacityLabel: string
  durability: number
  durabilityLabel: string
  expansion: number
  expansionLabel: string
}

export type AnalyzeResponse = {
  normalizedRecipe: Record<string, number>
  totalParts: number
  cone: string
  umf: Umf
  properties: GlazeProperties
  warnings: GlazeWarning[]
}
