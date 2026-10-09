import type { RecipeSuggestion } from '../app/types'
import type { BuilderRow } from '../hooks/useRecipeBuilder'

export type BuilderHandoff = {
  rows: BuilderRow[]
  firingTempC?: number
  atmosphere?: 'Oxidation' | 'Reduction'
  name?: string
}

const ROW_SEPARATOR = '|'
const PARTS_SEPARATOR = '~'

/** `/builder?recipe=Potash Feldspar~40|Whiting~20&tempC=1222&atmosphere=oxidation&name=…` */
export function builderHref(
  recipe: RecipeSuggestion,
  options: { firingTempC: number; atmosphere?: string },
): string {
  const params = new URLSearchParams()
  const rows = Object.entries(recipe.ingredients)
    .filter(([, percent]) => percent > 0)
    .map(([name, percent]) => `${name}${PARTS_SEPARATOR}${Number(percent.toFixed(2))}`)
  params.set('recipe', rows.join(ROW_SEPARATOR))
  params.set('tempC', String(Math.round(options.firingTempC)))
  if (options.atmosphere) params.set('atmosphere', options.atmosphere.toLowerCase())
  params.set('name', recipe.name)
  return `/builder?${params.toString()}`
}

export function parseBuilderHandoff(params: URLSearchParams): BuilderHandoff | null {
  const raw = params.get('recipe')
  if (!raw) return null
  const rows: BuilderRow[] = []
  for (const token of raw.split(ROW_SEPARATOR)) {
    const idx = token.lastIndexOf(PARTS_SEPARATOR)
    if (idx <= 0) continue
    const name = token.slice(0, idx).trim()
    const parts = Number(token.slice(idx + 1))
    if (!name || !Number.isFinite(parts) || parts < 0 || rows.some((row) => row.name === name)) continue
    rows.push({ name, parts })
  }
  if (rows.length === 0) return null

  const tempC = Number(params.get('tempC'))
  const atmosphereRaw = params.get('atmosphere')?.toLowerCase()
  return {
    rows,
    firingTempC: Number.isFinite(tempC) && tempC >= 580 && tempC <= 1400 ? Math.round(tempC) : undefined,
    atmosphere: atmosphereRaw === 'reduction' ? 'Reduction' : atmosphereRaw === 'oxidation' ? 'Oxidation' : undefined,
    name: params.get('name') ?? undefined,
  }
}
