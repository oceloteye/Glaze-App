import { describe, expect, it } from 'vitest'
import { builderHref, parseBuilderHandoff } from './builderHandoff'
import type { RecipeSuggestion } from '../app/types'

const recipe: RecipeSuggestion = {
  name: 'Satin Cone 6-7 — Copper + Zircon · Balanced',
  firingRange: 'Cone 6-7',
  ingredients: { 'Potash Feldspar': 25.54, Silica: 17.05, 'Copper Carbonate': 0.89, Bentonite: 0 },
  rationale: '',
  umf: { fluxes: {}, stabilizers: {}, glassFormers: {}, colorants: {}, siAlRatio: 0, r2oShare: 0 },
  firingSchedules: [],
}

describe('builderHandoff', () => {
  it('round-trips ingredients, temperature, atmosphere and name', () => {
    const href = builderHref(recipe, { firingTempC: 1222, atmosphere: 'Reduction' })
    expect(href.startsWith('/builder?')).toBe(true)
    const parsed = parseBuilderHandoff(new URLSearchParams(href.slice('/builder?'.length)))
    expect(parsed).toEqual({
      rows: [
        { name: 'Potash Feldspar', parts: 25.54 },
        { name: 'Silica', parts: 17.05 },
        { name: 'Copper Carbonate', parts: 0.89 },
      ],
      firingTempC: 1222,
      atmosphere: 'Reduction',
      name: recipe.name,
    })
  })

  it('ignores malformed rows and out-of-range values', () => {
    const parsed = parseBuilderHandoff(
      new URLSearchParams({ recipe: 'Silica~20|bogus|~5|Whiting~-1|Silica~30', tempC: '9999', atmosphere: 'vacuum' }),
    )
    expect(parsed).toEqual({ rows: [{ name: 'Silica', parts: 20 }], firingTempC: undefined, atmosphere: undefined, name: undefined })
  })

  it('returns null without a recipe parameter', () => {
    expect(parseBuilderHandoff(new URLSearchParams({ tempC: '1222' }))).toBeNull()
  })
})
