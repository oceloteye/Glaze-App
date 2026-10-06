import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { buildFiringScheduleExport, firingScheduleFileStem, firingScheduleToCsv } from '../lib/firingScheduleExport'
import { CONES, EFFECTS_WITH_SECONDARY } from '../app/constants'
import type {
  GenerateRecipesResponse,
  GlazeRequest,
  RecipeExportPayload,
  RecipeSuggestion,
  ScheduleLength,
  TempUnit,
} from '../app/types'
import {
  cToF,
  downloadFile,
  escapeHtml,
  formatTimestamp,
  nearestConeIndex,
  splitIngredients,
  sumPercent,
  type IngredientEntry,
} from '../app/utils'

const DEFAULT_FORM: GlazeRequest = {
  color: '#7f9e87',
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

export function useGlazeComposer() {
  const [form, setForm] = useState<GlazeRequest>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [tempUnit, setTempUnit] = useState<TempUnit>('C')
  const [tempInputStr, setTempInputStr] = useState('1222')
  const [secondaryColor, setSecondaryColor] = useState('#808080')
  const [secondaryHexInput, setSecondaryHexInput] = useState('#808080')
  const [effectIntensity, setEffectIntensity] = useState(50)
  const [scheduleLength, setScheduleLength] = useState<ScheduleLength>('medium')

  const currentEffect = form.effects[0] ?? ''
  const showSecondaryColor = EFFECTS_WITH_SECONDARY.has(currentEffect)
  const coneIndex = useMemo(() => nearestConeIndex(form.firingTempC, CONES), [form.firingTempC])
  const selectedRecipe = recipes[0]
  const hasGeneratedRecipes = recipes.length > 0

  const scheduleFor = (recipe: RecipeSuggestion) =>
    recipe.firingSchedules?.find((schedule) => schedule.length === scheduleLength) ?? recipe.firingSchedules?.[0]

  const buildExportPayload = (): RecipeExportPayload => {
    const effect = form.effects[0] ?? 'None'
    return {
      exportedAt: new Date().toISOString(),
      parameters: {
        color: form.color,
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

  const handlePrint = () => {
    setError(null)
    const payload = buildExportPayload()

    const paramsEntries = Object.entries(payload.parameters)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase())
        return `<tr><th>${escapeHtml(title)}</th><td>${escapeHtml(String(value))}</td></tr>`
      })
      .join('')

    const recipeSections = payload.recipes
      .map((recipe) => {
        const { base, colorants } = splitIngredients(recipe.ingredients)
        const ingredientRows = (title: string, entries: IngredientEntry[]) =>
          entries.length === 0
            ? ''
            : `<tr class="group"><th>${escapeHtml(title)}</th><th>${sumPercent(entries).toFixed(2)}%</th></tr>` +
              entries
                .map(
                  ([ingredient, percent]) =>
                    `<tr><td>${escapeHtml(ingredient)}</td><td>${percent.toFixed(2)}%</td></tr>`,
                )
                .join('')
        const ingredients = ingredientRows('Base glaze', base) + ingredientRows('Colorants & additives', colorants)

        const umf = recipe.umf
        const oxideRows = (title: string, oxides: Record<string, number>) => {
          const rows = Object.entries(oxides)
          if (rows.length === 0) return ''
          return `<tr class="group"><th>${escapeHtml(title)}</th><th></th></tr>${rows
            .map(([oxide, value]) => `<tr><td>${escapeHtml(oxide)}</td><td>${value.toFixed(3)}</td></tr>`)
            .join('')}`
        }
        const umfHtml =
          umf && Object.keys(umf.fluxes).length > 0
            ? `
            <h4>Unity molecular formula — Si:Al ${umf.siAlRatio.toFixed(1)}, R2O:RO ${umf.r2oShare.toFixed(2)}:${(1 - umf.r2oShare).toFixed(2)}</h4>
            <table>
              <thead><tr><th>Oxide</th><th>Moles (unity)</th></tr></thead>
              <tbody>${oxideRows('Fluxes', umf.fluxes)}${oxideRows('Stabilizers', umf.stabilizers)}${oxideRows('Glass formers', umf.glassFormers)}${oxideRows('Colorants', umf.colorants)}</tbody>
            </table>
          `
            : ''

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
            <p>${escapeHtml(recipe.rationale)}</p>
            <table>
              <thead><tr><th>Ingredient</th><th>Percent</th></tr></thead>
              <tbody>${ingredients}</tbody>
            </table>
            ${umfHtml}
            ${scheduleHtml}
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
          h4 { font-size: 15px; margin: 14px 0 4px; }
          p { margin: 0 0 10px; line-height: 1.45; }
          .meta { color: #5f4b3f; margin-bottom: 18px; }
          .notes { margin: 6px 0 0; padding-left: 18px; font-size: 13px; color: #5f4b3f; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { text-align: left; border: 1px solid #d7c8bb; padding: 6px 8px; font-size: 14px; }
          th { background: #f6eee6; }
          tr.group th { background: #ece2d6; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #5f4b3f; }
          .recipe { border-top: 2px solid #e1d4c7; margin-top: 18px; padding-top: 14px; break-inside: avoid; }
          .range { color: #5f4b3f; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>Glaze Lab - Recipe Report</h1>
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

  return {
    form,
    setForm,
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
    selectedRecipe,
    hasGeneratedRecipes,
    handleSubmit,
    handlePrint,
    handleExportJson,
    handleExportFiringSchedule,
  }
}

export type GlazeComposer = ReturnType<typeof useGlazeComposer>
