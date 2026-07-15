import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { AIPreview } from './components/AIPreview'
import { GlazePreview } from './GlazePreview'
import { buildMaterialProfile } from './lib/glazeMaterialModel'
import type { RealismControls } from './types/rendering'

let realisticTilePreview3DPromise: Promise<typeof import('./components/RealisticTilePreview3D')> | null =
  null

function preloadRealisticTilePreview3D() {
  if (!realisticTilePreview3DPromise) {
    realisticTilePreview3DPromise = import('./components/RealisticTilePreview3D')
  }
  return realisticTilePreview3DPromise
}

const RealisticTilePreview3D = lazy(() =>
  preloadRealisticTilePreview3D().then((module) => ({
    default: module.RealisticTilePreview3D,
  })),
)

type GlazeRequest = {
  color: string
  firingTempC: number
  surfaceFinish: string
  stability: string
  effects: string[]
  intensity?: number
  secondaryColor?: string
  feldsparSubstitute?: string
  colorCharacter?: string
  foodSafe?: boolean
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
  { name: 'Cone 09', tempC: 923 },
  { name: 'Cone 08', tempC: 945 },
  { name: 'Cone 07', tempC: 973 },
  { name: 'Cone 06', tempC: 999 },
  { name: 'Cone 05', tempC: 1031 },
  { name: 'Cone 04', tempC: 1063 },
  { name: 'Cone 03', tempC: 1101 },
  { name: 'Cone 02', tempC: 1120 },
  { name: 'Cone 01', tempC: 1137 },
  { name: 'Cone 1', tempC: 1154 },
  { name: 'Cone 2', tempC: 1162 },
  { name: 'Cone 3', tempC: 1168 },
  { name: 'Cone 4', tempC: 1186 },
  { name: 'Cone 5', tempC: 1196 },
  { name: 'Cone 6', tempC: 1222 },
  { name: 'Cone 7', tempC: 1240 },
  { name: 'Cone 8', tempC: 1263 },
  { name: 'Cone 9', tempC: 1280 },
  { name: 'Cone 10', tempC: 1285 },
]

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9)
}

const SURFACE_FINISHES = ['Matte', 'Satin', 'Glossy'] as const
type SurfaceFinish = (typeof SURFACE_FINISHES)[number]

const EFFECTS = [
  { label: 'None', value: '' },
  { label: 'Speckled', value: 'Speckled' },
  { label: 'Crystalline', value: 'Crystalline' },
  { label: 'Variegated', value: 'Variegated' },
  { label: 'Flame', value: 'Flame' },
  { label: 'Melt', value: 'Melt' },
  { label: 'Opaque', value: 'Opaque' },
  { label: 'Translucent', value: 'Translucent' },
] as const

const EFFECTS_WITH_SECONDARY = new Set(['Speckled', 'Crystalline', 'Variegated', 'Flame', 'Melt'])

const SECONDARY_COLOR_LABEL: Record<string, string> = {
  Speckled: 'Speckle color',
  Crystalline: 'Crystal color',
  Variegated: 'Streak color',
  Flame: 'Flame color',
  Melt: 'Melt color',
}

const CLAY_BODY_OPTIONS = ['Porcelain', 'White Stoneware', 'Buff Stoneware', 'Iron-rich Stoneware'] as const
const THICKNESS_OPTIONS = ['Thin', 'Medium', 'Thick'] as const
const ATMOSPHERE_OPTIONS = ['Oxidation', 'Reduction'] as const
const COOLING_OPTIONS = ['Fast', 'Normal', 'Slow'] as const
const LIGHTING_OPTIONS = ['Studio Neutral', 'Daylight', 'Warm Indoor'] as const

function nearestConeIndex(tempC: number): number {
  return CONES.reduce(
    (best, _, i) =>
      Math.abs(CONES[i].tempC - tempC) < Math.abs(CONES[best].tempC - tempC) ? i : best,
    0,
  )
}

function formatTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function App() {
  const openRealisticButtonRef = useRef<HTMLButtonElement | null>(null)
  const openAiButtonRef = useRef<HTMLButtonElement | null>(null)
  const modalPanelRef = useRef<HTMLDivElement | null>(null)
  const lastOpenedPreviewRef = useRef<'realistic' | 'ai' | null>(null)
  const wasModalOpenRef = useRef(false)

  const [form, setForm] = useState<GlazeRequest>({
    color: '#7f9e87',
    firingTempC: 1222,
    surfaceFinish: 'Satin',
    stability: 'High',
    effects: ['Variegated'],
    feldsparSubstitute: 'Potash Feldspar',
    colorCharacter: 'Natural',
    foodSafe: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [tempUnit, setTempUnit] = useState<TempUnit>('C')
  const [tempInputStr, setTempInputStr] = useState('1222')
  const [secondaryColor, setSecondaryColor] = useState('#c17a3a')
  const [secondaryHexInput, setSecondaryHexInput] = useState('#c17a3a')
  const [effectIntensity, setEffectIntensity] = useState(50)
  const [activePreviewModal, setActivePreviewModal] = useState<'realistic' | 'ai' | null>(null)
  const [realismControls, setRealismControls] = useState<RealismControls>({
    clayBody: 'White Stoneware',
    thickness: 'Medium',
    atmosphere: 'Oxidation',
    cooling: 'Normal',
    lighting: 'Studio Neutral',
  })

  useEffect(() => {
    if (!activePreviewModal) {
      if (wasModalOpenRef.current) {
        if (lastOpenedPreviewRef.current === 'ai') {
          openAiButtonRef.current?.focus()
        } else {
          openRealisticButtonRef.current?.focus()
        }
        wasModalOpenRef.current = false
      }
      return
    }

    wasModalOpenRef.current = true

    const panel = modalPanelRef.current
    if (!panel) return

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')

    const focusable = getFocusable()
    ;(focusable[0] ?? panel).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setActivePreviewModal(null)
        return
      }

      if (event.key !== 'Tab') return

      const items = getFocusable()
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
    }, [activePreviewModal])

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

  const selectedRecipe = recipes[0]
  const hasGeneratedRecipes = recipes.length > 0

  useEffect(() => {
    if (!hasGeneratedRecipes && activePreviewModal) {
      setActivePreviewModal(null)
    }
  }, [activePreviewModal, hasGeneratedRecipes])

  const materialProfile = useMemo(
    () =>
      buildMaterialProfile({
        color: form.color,
        secondaryColor: showSecondaryColor ? secondaryColor : undefined,
        surfaceFinish: form.surfaceFinish,
        effect: form.effects[0] ?? 'None',
        intensity: effectIntensity,
        firingTempC: form.firingTempC,
        stability: form.stability,
        foodSafe: Boolean(form.foodSafe),
        recipeIngredients: selectedRecipe?.ingredients,
        controls: realismControls,
      }),
    [
      effectIntensity,
      form.color,
      form.effects,
      form.firingTempC,
      form.foodSafe,
      form.stability,
      form.surfaceFinish,
      realismControls,
      secondaryColor,
      selectedRecipe?.ingredients,
      showSecondaryColor,
    ],
  )

  const previewSeedKey = useMemo(
    () =>
      JSON.stringify({
        recipe: selectedRecipe?.name ?? 'none',
        ingredients: selectedRecipe?.ingredients ?? {},
        controls: realismControls,
        form,
        effectIntensity,
        secondaryColor: showSecondaryColor ? secondaryColor : null,
      }),
    [effectIntensity, form, realismControls, secondaryColor, selectedRecipe?.ingredients, selectedRecipe?.name, showSecondaryColor],
  )

  const buildExportPayload = () => {
    const effect = form.effects[0] ?? 'None'
    const params = {
      color: form.color,
      firingTempC: form.firingTempC,
      firingTempF: cToF(form.firingTempC),
      cone: CONES[coneIndex].name,
      surfaceFinish: form.surfaceFinish,
      stability: form.stability,
      feldsparSubstitute: form.feldsparSubstitute ?? 'Potash Feldspar',
      colorCharacter: form.colorCharacter ?? 'Natural',
      foodSafe: form.foodSafe ? 'Yes' : 'No',
      effect,
      intensity: effect === 'None' ? undefined : effectIntensity,
      secondaryColor: showSecondaryColor ? secondaryColor : undefined,
      realismControls,
    }

    return {
      exportedAt: new Date().toISOString(),
      parameters: params,
      recipes,
    }
  }

  const handleExportJson = () => {
    const payload = buildExportPayload()
    const fileName = `glaze-recipes-${formatTimestamp()}.json`
    downloadFile(fileName, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  const handlePrint = () => {
    setError(null)
    const payload = buildExportPayload()

    const paramsEntries = Object.entries(payload.parameters)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        const title = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (s) => s.toUpperCase())
        return `<tr><th>${escapeHtml(title)}</th><td>${escapeHtml(String(value))}</td></tr>`
      })
      .join('')

    const recipeSections = payload.recipes
      .map((recipe) => {
        const ingredients = Object.entries(recipe.ingredients)
          .map(
            ([ingredient, percent]) =>
              `<tr><td>${escapeHtml(ingredient)}</td><td>${percent.toFixed(2)}%</td></tr>`,
          )
          .join('')

        return `
          <section class="recipe">
            <h3>${escapeHtml(recipe.name)}</h3>
            <p class="range">${escapeHtml(recipe.firingRange)}</p>
            <p>${escapeHtml(recipe.rationale)}</p>
            <table>
              <thead><tr><th>Ingredient</th><th>Percent</th></tr></thead>
              <tbody>${ingredients}</tbody>
            </table>
          </section>
        `
      })
      .join('')

    const documentHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Glaze Recipe Report</title>
        <style>
          body { font-family: Georgia, 'Times New Roman', serif; margin: 24px; color: #1f1a16; }
          h1, h2, h3 { margin: 0 0 8px; }
          h1 { font-size: 26px; }
          h2 { margin-top: 24px; font-size: 20px; }
          h3 { font-size: 18px; }
          p { margin: 0 0 10px; line-height: 1.45; }
          .meta { color: #5f4b3f; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { text-align: left; border: 1px solid #d7c8bb; padding: 6px 8px; font-size: 14px; }
          th { background: #f6eee6; }
          .recipe { border-top: 2px solid #e1d4c7; margin-top: 18px; padding-top: 14px; break-inside: avoid; }
          .range { color: #5f4b3f; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>Ceramic Glaze Composer - Recipe Report</h1>
        <p class="meta">Generated ${escapeHtml(payload.exportedAt)}</p>
        <h2>Glaze Parameters</h2>
        <table>
          <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
          <tbody>${paramsEntries}</tbody>
        </table>
        <h2>Recipes</h2>
        ${recipeSections}
      </body>
      </html>
    `

    // Use a hidden iframe for printing to avoid pop-up blockers.
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument
    const iframeWin = iframe.contentWindow

    if (!iframeDoc || !iframeWin) {
      document.body.removeChild(iframe)
      setError('Could not initialize print document in this browser.')
      return
    }

    iframeDoc.open()
    iframeDoc.write(documentHtml)
    iframeDoc.close()

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 500)
    }

    iframeWin.onafterprint = cleanup
    window.setTimeout(() => {
      iframeWin.focus()
      iframeWin.print()
      cleanup()
    }, 150)
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
            recipeIngredients={selectedRecipe?.ingredients}
            selectedRecipeName={selectedRecipe?.name}
            firingTempC={form.firingTempC}
            stability={form.stability}
            foodSafe={form.foodSafe ?? false}
          />

          <div className="preview-actions">
            <p className="deterministic-note">Deterministic render: On</p>
            <button
              ref={openAiButtonRef}
              type="button"
              className="ghost-btn"
              disabled={!hasGeneratedRecipes}
              onMouseEnter={preloadRealisticTilePreview3D}
              onFocus={preloadRealisticTilePreview3D}
              onTouchStart={preloadRealisticTilePreview3D}
              onClick={() => {
                if (!hasGeneratedRecipes) return
                lastOpenedPreviewRef.current = 'ai'
                setActivePreviewModal('ai')
              }}
            >
              Open Local Preview Modal
            </button>
            <button
              ref={openRealisticButtonRef}
              type="button"
              className="ghost-btn"
              disabled={!hasGeneratedRecipes}
              onMouseEnter={preloadRealisticTilePreview3D}
              onFocus={preloadRealisticTilePreview3D}
              onTouchStart={preloadRealisticTilePreview3D}
              onClick={() => {
                if (!hasGeneratedRecipes) return
                lastOpenedPreviewRef.current = 'realistic'
                setActivePreviewModal('realistic')
              }}
            >
              Open Realistic Tile Render
            </button>
          </div>

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
                  setTempInputStr(String(next === 'C' ? form.firingTempC : cToF(form.firingTempC)))
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
                setTempInputStr(String(tempUnit === 'C' ? newTempC : cToF(newTempC)))
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
                  setTempInputStr(String(tempUnit === 'C' ? form.firingTempC : cToF(form.firingTempC)))
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
            Color character
            <select
              value={form.colorCharacter ?? 'Natural'}
              onChange={(event) => setForm({ ...form, colorCharacter: event.target.value })}
            >
              <option>Natural</option>
              <option>Clean</option>
              <option>Earthy</option>
              <option>Vibrant</option>
            </select>
          </label>

          <label>
            Dinnerware / food safe
            <select
              value={form.foodSafe ? 'Yes' : 'No'}
              onChange={(event) => setForm({ ...form, foodSafe: event.target.value === 'Yes' })}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
            <p className="field-note">
              Food-safe mode biases formulas toward more stable functional chemistry, but lab-style leach
              testing is still required before production dinnerware use.
            </p>
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
            <>
              <div className="results-actions">
                <button type="button" className="ghost-btn" onClick={handlePrint}>Print Recipe Sheet</button>
                <button type="button" className="ghost-btn" onClick={handleExportJson}>Export JSON</button>
              </div>
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
            </>
          )}
        </section>
      </section>

      {activePreviewModal && hasGeneratedRecipes && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={activePreviewModal === 'ai' ? 'Local glaze concept renderer' : 'Realistic glaze tile renderer'}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActivePreviewModal(null)
            }
          }}
        >
          <div className="modal-panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="modal-head">
              <h3>{activePreviewModal === 'ai' ? 'Local Glaze Concept Render' : 'Realistic Test Tile Render'}</h3>
              <button type="button" className="ghost-btn" onClick={() => setActivePreviewModal(null)}>
                Close
              </button>
            </div>

            {activePreviewModal === 'ai' ? (
              <AIPreview
                material={materialProfile}
                seedKey={previewSeedKey}
                lighting={realismControls.lighting}
                clayBody={realismControls.clayBody}
                effect={form.effects[0] ?? 'None'}
                selectedRecipeName={selectedRecipe?.name}
                selectedRecipeFiringRange={selectedRecipe?.firingRange}
                selectedRecipeRationale={selectedRecipe?.rationale}
                selectedRecipeIngredients={selectedRecipe?.ingredients}
              />
            ) : (
              <Suspense fallback={<p className="glaze-preview-caption">Loading 3D renderer...</p>}>
                <RealisticTilePreview3D
                  material={materialProfile}
                  lighting={realismControls.lighting}
                  clayBody={realismControls.clayBody}
                  effect={form.effects[0] ?? 'None'}
                  seedKey={previewSeedKey}
                />
              </Suspense>
            )}

            {activePreviewModal === 'realistic' ? (
              <div className="realism-controls">
                <h3>Realism Controls</h3>
                <div className="realism-grid">
                  <label>
                    Clay body
                    <select
                      value={realismControls.clayBody}
                      onChange={(event) =>
                        setRealismControls({
                          ...realismControls,
                          clayBody: event.target.value as RealismControls['clayBody'],
                        })
                      }
                    >
                      {CLAY_BODY_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Thickness
                    <select
                      value={realismControls.thickness}
                      onChange={(event) =>
                        setRealismControls({
                          ...realismControls,
                          thickness: event.target.value as RealismControls['thickness'],
                        })
                      }
                    >
                      {THICKNESS_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Atmosphere
                    <select
                      value={realismControls.atmosphere}
                      onChange={(event) =>
                        setRealismControls({
                          ...realismControls,
                          atmosphere: event.target.value as RealismControls['atmosphere'],
                        })
                      }
                    >
                      {ATMOSPHERE_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cooling profile
                    <select
                      value={realismControls.cooling}
                      onChange={(event) =>
                        setRealismControls({
                          ...realismControls,
                          cooling: event.target.value as RealismControls['cooling'],
                        })
                      }
                    >
                      {COOLING_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Lighting preset
                    <select
                      value={realismControls.lighting}
                      onChange={(event) =>
                        setRealismControls({
                          ...realismControls,
                          lighting: event.target.value as RealismControls['lighting'],
                        })
                      }
                    >
                      {LIGHTING_OPTIONS.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="ai-modal-note">
                <p className="glaze-preview-caption">
                  This modal shows the AI concept render only. Use the preview controls to compare it with the fast preview.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
