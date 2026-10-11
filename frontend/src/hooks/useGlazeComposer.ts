import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { buildFiringScheduleExport, firingScheduleFileStem, firingScheduleToCsv } from '../lib/firingScheduleExport'
import { CONES, EFFECTS_WITH_SECONDARY } from '../app/constants'
import { renderGlazePreviewDataUrl } from '../GlazePreview'
import { recipePreviewOptions } from '../lib/builderPreview'
import { predictGlazeColor } from '../lib/glazeColor'
import { DEFAULT_HUE_FAMILY, familyHex, hueFamily } from '../lib/hueFamilies'
import { ingredientRowsHtml, openPrintSheet, parametersTableHtml, previewFigureHtml, umfHtml } from '../lib/printSheet'
import { useSessionState } from './useSessionState'
import type {
  GenerateRecipesResponse,
  GlazeRequest,
  RecipeExportPayload,
  RecipePreviewResponse,
  RecipeSuggestion,
  ScheduleLength,
  TempUnit,
} from '../app/types'
import { cToF, downloadFile, escapeHtml, formatTimestamp, nearestConeIndex } from '../app/utils'

const DEFAULT_FORM: GlazeRequest = {
  color: familyHex(DEFAULT_HUE_FAMILY, 40, 50),
  hueFamily: DEFAULT_HUE_FAMILY,
  saturation: 40,
  depth: 50,
  firingTempC: 1222,
  surfaceFinish: 'Satin',
  stability: 'High',
  opacity: 'Semi-opaque',
  effects: [],
  feldsparSubstitute: 'Potash Feldspar',
  colorCharacter: 'Natural',
  atmosphere: 'Oxidation',
  foodSafe: true,
}

const KEY = 'glaze-lab:generator:'
const PREVIEW_DEBOUNCE_MS = 180

/** The colour field is always derived from the palette so a stale stored hex can never disagree with it. */
function withDerivedColor(form: GlazeRequest): GlazeRequest {
  const family = hueFamily(form.hueFamily).id
  const saturation = form.saturation ?? 50
  const depth = form.depth ?? 50
  return { ...form, hueFamily: family, saturation, depth, color: familyHex(family, saturation, depth) }
}

export function useGlazeComposer() {
  const [form, setFormState] = useSessionState<GlazeRequest>(`${KEY}form`, (stored) =>
    withDerivedColor({ ...DEFAULT_FORM, ...stored }),
  )
  const setForm = (next: GlazeRequest) => setFormState(withDerivedColor(next))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipes, setRecipes] = useSessionState<RecipeSuggestion[]>(`${KEY}recipes`, (stored) =>
    Array.isArray(stored) ? stored : [],
  )
  const [referencePreview, setReferencePreview] = useState<RecipePreviewResponse | null>(null)
  const [tempUnit, setTempUnit] = useSessionState<TempUnit>(`${KEY}tempUnit`, (stored) => stored ?? 'C')
  const [tempInputStr, setTempInputStr] = useSessionState<string>(`${KEY}tempInput`, (stored) => stored ?? '1222')
  const [secondaryColor, setSecondaryColor] = useSessionState<string>(`${KEY}secondary`, (stored) => stored ?? '#808080')
  const [secondaryHexInput, setSecondaryHexInput] = useSessionState<string>(
    `${KEY}secondaryInput`,
    (stored) => stored ?? '#808080',
  )
  const [effectIntensity, setEffectIntensity] = useSessionState<number>(`${KEY}intensity`, (stored) => stored ?? 50)
  const [scheduleLength, setScheduleLength] = useSessionState<ScheduleLength>(
    `${KEY}scheduleLength`,
    (stored) => stored ?? 'medium',
  )

  const currentEffect = form.effects[0] ?? ''
  const showSecondaryColor = EFFECTS_WITH_SECONDARY.has(currentEffect)
  const coneIndex = useMemo(() => nearestConeIndex(form.firingTempC, CONES), [form.firingTempC])
  const hasGeneratedRecipes = recipes.length > 0

  const requestBody = (): GlazeRequest => ({
    ...form,
    intensity: effectIntensity,
    secondaryColor: showSecondaryColor ? secondaryColor : undefined,
  })
  const requestJson = JSON.stringify(requestBody())

  // The reference tile shows the predicted colour of the recipe that would lead, so it and the recipe
  // previews come from the same model; while the backend is unreachable it falls back to the palette hex.
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/recipes/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestJson,
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Preview failed: ${response.status}`)
        setReferencePreview((await response.json()) as RecipePreviewResponse)
      } catch {
        if (!controller.signal.aborted) setReferencePreview(null)
      }
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [requestJson])

  const referenceColor = referencePreview
    ? predictGlazeColor(
        referencePreview.ingredients,
        (form.atmosphere ?? '').toLowerCase() === 'reduction',
        form.firingTempC,
      )
    : form.color

  const scheduleFor = (recipe: RecipeSuggestion) =>
    recipe.firingSchedules?.find((schedule) => schedule.length === scheduleLength) ?? recipe.firingSchedules?.[0]

  const buildExportPayload = (): RecipeExportPayload => {
    const effect = form.effects[0] ?? 'None'
    return {
      exportedAt: new Date().toISOString(),
      parameters: {
        hueFamily: hueFamily(form.hueFamily).label,
        saturation: form.saturation,
        depth: form.depth,
        color: form.color,
        predictedColor: referenceColor,
        firingTempC: form.firingTempC,
        firingTempF: cToF(form.firingTempC),
        cone: CONES[coneIndex].name,
        surfaceFinish: form.surfaceFinish,
        stability: form.stability,
        opacity: form.opacity,
        feldsparSubstitute: form.feldsparSubstitute ?? 'Potash Feldspar',
        colorCharacter: form.colorCharacter ?? 'Natural',
        foodSafe: form.foodSafe ? 'Yes' : 'No',
        effect,
        intensity: effect === 'None' ? undefined : effectIntensity,
        secondaryColor: showSecondaryColor ? secondaryColor : undefined,
      },
      scheduleLength,
      recipes,
    }
  }

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
        body: JSON.stringify(requestBody()),
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

  const handleExportJson = () => {
    const payload = buildExportPayload()
    const fileName = `glaze-recipes-${formatTimestamp()}.json`
    downloadFile(fileName, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  const handleExportFiringSchedule = (recipe: RecipeSuggestion, format: 'json' | 'csv') => {
    const schedule = scheduleFor(recipe)
    if (!schedule) return
    const doc = buildFiringScheduleExport(recipe, schedule)
    const stem = firingScheduleFileStem(recipe, schedule)
    if (format === 'csv') {
      downloadFile(`${stem}.csv`, firingScheduleToCsv(doc), 'text/csv;charset=utf-8')
    } else {
      downloadFile(`${stem}.json`, JSON.stringify(doc, null, 2), 'application/json;charset=utf-8')
    }
  }

  const handlePrint = (options: { includePreview?: boolean } = {}) => {
    setError(null)
    const payload = buildExportPayload()
    const previewFor = (recipe: RecipeSuggestion) =>
      options.includePreview
        ? renderGlazePreviewDataUrl(
            recipePreviewOptions(recipe, { firingTempC: form.firingTempC, atmosphere: form.atmosphere }),
          )
        : null

    const recipeSections = payload.recipes
      .map((recipe) => {
        const schedule = scheduleFor(recipe)
        const scheduleRows = schedule
          ? schedule.segments
              .map((segment) => {
                const rate =
                  segment.rateCPerHour === null
                    ? 'Full'
                    : `${segment.rateCPerHour}°C / ${segment.rateFPerHour}°F per hr`
                const hold = segment.holdMinutes === 0 ? '—' : `${segment.holdMinutes} min`
                return `<tr><td>${escapeHtml(segment.phase)}</td><td>${escapeHtml(rate)}</td><td>${segment.targetTempC}°C / ${segment.targetTempF}°F</td><td>${escapeHtml(hold)}</td><td>${escapeHtml(segment.note)}</td></tr>`
              })
              .join('')
          : ''
        const scheduleNotes = schedule
          ? schedule.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')
          : ''
        const scheduleHtml = schedule
          ? `
            <h4>Recommended firing schedule (${escapeHtml(schedule.length.replace('-', ' '))}) — cone ${escapeHtml(schedule.cone)}, ${escapeHtml(schedule.atmosphere)}, ${escapeHtml(schedule.coolingStrategy)}</h4>
            <p class="notes">~${schedule.estimatedHours} h total: ${schedule.heatingHours} h heating (to end of soak) + ${schedule.coolingHours} h cooling to 150°C</p>
            <table>
              <thead><tr><th>Phase</th><th>Rate</th><th>Target</th><th>Hold</th><th>Note</th></tr></thead>
              <tbody>${scheduleRows}</tbody>
            </table>
            <ul class="notes">${scheduleNotes}</ul>
          `
          : ''

        return `
          <section class="recipe">
            <h3>${escapeHtml(recipe.name)}</h3>
            <p class="range">${escapeHtml(recipe.firingRange)}</p>
            ${previewFigureHtml(previewFor(recipe), `Predicted appearance of ${recipe.name} from its chemistry`, `Predicted from chemistry — colour goal ${hueFamily(form.hueFamily).label} (${form.color.toUpperCase()})`)}
            <p>${escapeHtml(recipe.rationale)}</p>
            <table>
              <thead><tr><th>Ingredient</th><th>Percent</th></tr></thead>
              <tbody>${ingredientRowsHtml(recipe.ingredients)}</tbody>
            </table>
            ${umfHtml(recipe.umf)}
            ${scheduleHtml}
          </section>
        `
      })
      .join('')

    const opened = openPrintSheet(
      'Glaze Recipe Report',
      `
        <h1>Glaze Lab - Recipe Report</h1>
        <p class="meta">Generated ${escapeHtml(payload.exportedAt)}</p>
        <h2>Glaze Parameters</h2>
        ${parametersTableHtml(payload.parameters)}
        <h2>Recipes</h2>
        ${recipeSections}
      `,
    )
    if (!opened) setError('Could not initialize print document in this browser.')
  }

  return {
    form,
    setForm,
    referencePreview,
    referenceColor,
    loading,
    error,
    recipes,
    setRecipes,
    tempUnit,
    setTempUnit,
    tempInputStr,
    setTempInputStr,
    secondaryColor,
    setSecondaryColor,
    secondaryHexInput,
    setSecondaryHexInput,
    effectIntensity,
    setEffectIntensity,
    scheduleLength,
    setScheduleLength,
    scheduleFor,
    currentEffect,
    showSecondaryColor,
    coneIndex,
    hasGeneratedRecipes,
    handleSubmit,
    handlePrint,
    handleExportJson,
    handleExportFiringSchedule,
  }
}

export type GlazeComposer = ReturnType<typeof useGlazeComposer>
