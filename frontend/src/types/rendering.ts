export type PreviewMode = 'fast' | 'ai' | 'realistic' | 'split'

export type ClayBody = 'Porcelain' | 'White Stoneware' | 'Buff Stoneware' | 'Iron-rich Stoneware'
export type ApplicationThickness = 'Thin' | 'Medium' | 'Thick'
export type Atmosphere = 'Oxidation' | 'Reduction'
export type CoolingProfile = 'Fast' | 'Normal' | 'Slow'
export type LightingPreset = 'Studio Neutral' | 'Daylight' | 'Warm Indoor'

export type ConfidenceLevel = 'High' | 'Medium' | 'Low'

export interface RealismControls {
  clayBody: ClayBody
  thickness: ApplicationThickness
  atmosphere: Atmosphere
  cooling: CoolingProfile
  lighting: LightingPreset
}

export interface MaterialProfile {
  baseRgb: { r: number; g: number; b: number }
  accentRgb: { r: number; g: number; b: number }
  gloss: number
  roughness: number
  opacity: number
  flow: number
  pooling: number
  edgeBreak: number
  speckleDensity: number
  crystalDensity: number
  variegationStrength: number
  microPitting: number
  confidence: ConfidenceLevel
}

export interface MaterialModelInput {
  color: string
  secondaryColor?: string
  surfaceFinish: string
  effect: string
  intensity: number
  firingTempC: number
  stability: string
  foodSafe: boolean
  recipeIngredients?: Record<string, number>
  controls: RealismControls
}
