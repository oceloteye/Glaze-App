import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { GlazePreview } from './GlazePreview'

type GlazeRequest = {
  color: string
  firingTempC: number
  surfaceFinish: string
  stability: string
  effects: string[]
  intensity?: number
  secondaryColor?: string
  feldsparSubstitute?: string
}

type RecipeSuggestion = {
  name: string
  firingRange: string
  ingredients: Record<string, number>
  rationale: string
}

type GenerateRecipesResponse = {
  recipes: RecipeSuggestion[]
}

type TempUnit = 'C' | 'F'

const CONES: { name: string; tempC: number }[] = [
  { name: 'Cone 022', tempC: 600 },
  { name: 'Cone 021', tempC: 614 },
  { name: 'Cone 020', tempC: 626 },
  { name: 'Cone 019', tempC: 656 },
  { name: 'Cone 018', tempC: 696 },
  { name: 'Cone 017', tempC: 727 },
  { name: 'Cone 016', tempC: 769 },
  { name: 'Cone 015', tempC: 790 },
  { name: 'Cone 014', tempC: 807 },
  { name: 'Cone 013', tempC: 837 },
  { name: 'Cone 012', tempC: 861 },
  { name: 'Cone 011', tempC: 875 },
  { name: 'Cone 010', tempC: 894 },
  { name: 'Cone 09',  tempC: 923 },
  { name: 'Cone 08',  tempC: 945 },
  { name: 'Cone 07',  tempC: 973 },
  { name: 'Cone 06',  tempC: 999 },
  { name: 'Cone 05',  tempC: 1031 },
  { name: 'Cone 04',  tempC: 1063 },
  { name: 'Cone 03',  tempC: 1101 },
  { name: 'Cone 02',  tempC: 1120 },
  { name: 'Cone 01',  tempC: 1137 },
  { name: 'Cone 1',   tempC: 1154 },
  { name: 'Cone 2',   tempC: 1162 },
  { name: 'Cone 3',   tempC: 1168 },
  { name: 'Cone 4',   tempC: 1186 },
  { name: 'Cone 5',   tempC: 1196 },
  { name: 'Cone 6',   tempC: 1222 },
  { name: 'Cone 7',   tempC: 1240 },
  { name: 'Cone 8',   tempC: 1263 },
  { name: 'Cone 9',   tempC: 1280 },
  { name: 'Cone 10',  tempC: 1285 },
]

function cToF(c: number): number {
  return Math.round(c * 9 / 5 + 32)
}

function fToC(f: number): number {
  return Math.round((f - 32) * 5 / 9)
}

const SURFACE_FINISHES = ['Matte', 'Satin', 'Glossy'] as const
type SurfaceFinish = typeof SURFACE_FINISHES[number]

const EFFECTS = [
  { label: 'None',        value: '' },
  { label: 'Speckled',    value: 'Speckled' },
  { label: 'Crystalline', value: 'Crystalline' },
  { label: 'Variegated',  value: 'Variegated' },
  { label: 'Flame',       value: 'Flame' },
  { label: 'Melt',        value: 'Melt' },
  { label: 'Opaque',      value: 'Opaque' },
  { label: 'Translucent', value: 'Translucent' },
] as const

const EFFECTS_WITH_SECONDARY = new Set(['Speckled', 'Crystalline', 'Variegated', 'Flame', 'Melt'])

const SECONDARY_COLOR_LABEL: Record<string, string> = {
  Speckled:    'Speckle color',
  Crystalline: 'Crystal color',
  Variegated:  'Streak color',
  Flame:       'Flame color',
  Melt:        'Melt color',
}

function nearestConeIndex(tempC: number): number {
  return CONES.reduce(
    (best, _, i) =>
      Math.abs(CONES[i].tempC - tempC) < Math.abs(CONES[best].tempC - tempC) ? i : best,
    0
  )
}

function App() {
  const [form, setForm] = useState<GlazeRequest>({
    color: '#7f9e87',
    firingTempC: 1222,
    surfaceFinish: 'Satin',
    stability: 'High',
    effects: ['Variegated'],
    feldsparSubstitute: 'Potash Feldspar',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [tempUnit, setTempUnit] = useState<TempUnit>('C')
  const [tempInputStr, setTempInputStr] = useState('1222')
  const [secondaryColor, setSecondaryColor] = useState('#c17a3a')
  const [secondaryHexInput, setSecondaryHexInput] = useState('#c17a3a')
  const [effectIntensity, setEffectIntensity] = useState(50)

  const currentEffect = form.effects[0] ?? ''
  const showSecondaryColor = EFFECTS_WITH_SECONDARY.has(currentEffect)

  const coneIndex = useMemo(() => nearestConeIndex(form.firingTempC), [form.firingTempC])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          intensity: effectIntensity,
          secondaryColor: showSecondaryColor ? secondaryColor : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const data: GenerateRecipesResponse = await response.json()
      setRecipes(data.recipes)
    } catch (requestError) {
      setError('Unable to generate recipes right now. Ensure the backend is running on port 8080.')
      setRecipes([])
      console.error(requestError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="intro-card">
        <p className="badge">Studio Lab</p>
        <h1>Ceramic Glaze Composer</h1>
        <p className="subtitle">
          Blend color, firing range, finish, and effects to draft candidate glaze recipes.
          Percentages are generated for exploration and should be test-fired before production use.
        </p>
      </section>

      <section className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h2>Glaze Parameters</h2>

          <GlazePreview
            color={form.color}
            surfaceFinish={form.surfaceFinish}
            effect={form.effects[0] ?? ''}
            secondaryColor={showSecondaryColor ? secondaryColor : undefined}
            intensity={effectIntensity}
          />

          <label>
            Color goal
            <div className="color-picker-row">
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
              />
              <input
                type="text"
                className="hex-input"
                value={form.color}
                maxLength={7}
                placeholder="#rrggbb"
                onChange={(event) => {
                  const val = event.target.value
                  if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                    setForm({ ...form, color: val })
                  }
                }}
                onBlur={(event) => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(event.target.value)) {
                    setForm({ ...form, color: '#7f9e87' })
                  }
                }}
                required
              />
            </div>
          </label>

          <label>
            Firing temperature
            <div className="temp-header">
              <span className="cone-label">{CONES[coneIndex].name}</span>
              <button
                type="button"
                className="unit-toggle"
                onClick={() => {
                  const next: TempUnit = tempUnit === 'C' ? 'F' : 'C'
                  setTempUnit(next)
                  setTempInputStr(
                    String(next === 'C' ? form.firingTempC : cToF(form.firingTempC))
                  )
                }}
              >
                °{tempUnit}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={CONES.length - 1}
              value={coneIndex}
              className="temp-slider"
              onChange={(event) => {
                const idx = Number(event.target.value)
                const newTempC = CONES[idx].tempC
                setForm({ ...form, firingTempC: newTempC })
                setTempInputStr(
                  String(tempUnit === 'C' ? newTempC : cToF(newTempC))
                )
              }}
            />
            <div className="temp-manual">
              <input
                type="number"
                value={tempInputStr}
                onChange={(event) => {
                  const val = event.target.value
                  setTempInputStr(val)
                  const raw = Number(val)
                  if (!Number.isNaN(raw) && val !== '') {
                    const celsius = tempUnit === 'C' ? raw : fToC(raw)
                    if (celsius >= CONES[0].tempC && celsius <= CONES[CONES.length - 1].tempC) {
                      setForm({ ...form, firingTempC: celsius })
                    }
                  }
                }}
                onBlur={() => {
                  setTempInputStr(
                    String(tempUnit === 'C' ? form.firingTempC : cToF(form.firingTempC))
                  )
                }}
              />
              <span className="temp-unit-label">°{tempUnit}</span>
            </div>
          </label>

          <label>
            Surface finish
            <div className="finish-slider-wrap">
              <input
                type="range"
                min={0}
                max={SURFACE_FINISHES.length - 1}
                value={SURFACE_FINISHES.indexOf(form.surfaceFinish as SurfaceFinish)}
                className="finish-slider"
                onChange={(event) =>
                  setForm({ ...form, surfaceFinish: SURFACE_FINISHES[Number(event.target.value)] })
                }
              />
              <div className="finish-labels">
                {SURFACE_FINISHES.map((f) => (
                  <span key={f} className={form.surfaceFinish === f ? 'finish-active' : ''}>{f}</span>
                ))}
              </div>
            </div>
          </label>

          <label>
            Stability target
            <select
              value={form.stability}
              onChange={(event) => setForm({ ...form, stability: event.target.value })}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>

          <label>
            Feldspar source
            <select
              value={form.feldsparSubstitute ?? 'Potash Feldspar'}
              onChange={(event) => setForm({ ...form, feldsparSubstitute: event.target.value })}
            >
              <option>Potash Feldspar</option>
              <option>Nepheline Syenite</option>
              <option>Soda Feldspar</option>
            </select>
          </label>

          <label>
            Effect
            <select
              value={form.effects[0] ?? ''}
              onChange={(event) => {
                const val = event.target.value
                setForm({ ...form, effects: val ? [val] : [] })
              }}
            >
              {EFFECTS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {currentEffect !== '' && (
            <label className="secondary-color-label">
              Effect intensity
              <div className="intensity-slider-wrap">
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={effectIntensity}
                  className="intensity-slider"
                  onChange={(event) => setEffectIntensity(Number(event.target.value))}
                />
                <div className="intensity-labels">
                  <span>Subtle</span>
                  <span className="intensity-value">{effectIntensity}%</span>
                  <span>Extreme</span>
                </div>
              </div>
            </label>
          )}

          {showSecondaryColor && (
            <label className="secondary-color-label">
              {SECONDARY_COLOR_LABEL[currentEffect]}
              <div className="color-picker-row">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(event) => {
                    setSecondaryColor(event.target.value)
                    setSecondaryHexInput(event.target.value)
                  }}
                />
                <input
                  type="text"
                  className="hex-input"
                  value={secondaryHexInput}
                  maxLength={7}
                  placeholder="#rrggbb"
                  onChange={(event) => {
                    const val = event.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                      setSecondaryHexInput(val)
                      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                        setSecondaryColor(val)
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!/^#[0-9a-fA-F]{6}$/.test(secondaryHexInput)) {
                      setSecondaryHexInput(secondaryColor)
                    }
                  }}
                />
              </div>
            </label>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Recipes'}
          </button>

          {error ? <p className="error-msg">{error}</p> : null}
        </form>

        <section className="panel results-panel">
          <h2>Recipe Suggestions</h2>
          {recipes.length === 0 ? (
            <p className="empty-msg">Submit parameters to get glaze composition options.</p>
          ) : (
            <div className="recipe-list">
              {recipes.map((recipe) => (
                <article className="recipe-card" key={recipe.name}>
                  <div className="recipe-head">
                    <h3>{recipe.name}</h3>
                    <span>{recipe.firingRange}</span>
                  </div>
                  <p>{recipe.rationale}</p>
                  <ul>
                    {Object.entries(recipe.ingredients).map(([ingredient, percent]) => (
                      <li key={ingredient}>
                        <strong>{ingredient}</strong>
                        <span>{percent.toFixed(2)}%</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
