import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CONES } from '../app/constants'
import type { AnalyzeResponse, GlazeWarning, MaterialInfo } from '../app/types'
import { cToF, downloadFile, escapeHtml, formatTimestamp, nearestConeIndex } from '../app/utils'
import { renderGlazePreviewDataUrl } from '../GlazePreview'
import { parseBuilderHandoff } from '../lib/builderHandoff'
import { effectForPreview, stabilityForPreview, surfaceForPreview } from '../lib/builderPreview'
import { predictGlazeColor } from '../lib/glazeColor'
import {
  formatParts,
  ingredientRowsHtml,
  openPrintSheet,
  parametersTableHtml,
  previewFigureHtml,
  umfHtml,
} from '../lib/printSheet'
import { useSessionState } from './useSessionState'

export type BuilderRow = { name: string; parts: number }

const SEVERITY_LABEL: Record<GlazeWarning['severity'], string> = { danger: 'Danger', caution: 'Caution', info: 'Note' }
const SEVERITY_RANK: Record<GlazeWarning['severity'], number> = { danger: 0, caution: 1, info: 2 }

export const STARTER_RECIPE: BuilderRow[] = [
  { name: 'Potash Feldspar', parts: 40 },
  { name: 'Whiting', parts: 20 },
  { name: 'EPK Kaolin', parts: 15 },
  { name: 'Silica', parts: 25 },
]

const ANALYZE_DEBOUNCE_MS = 200
const KEY = 'glaze-lab:builder:'

export function useRecipeBuilder() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Lazy initialisers so a handed-off recipe is in place on the first render; the handoff beats stored state.
  const [handoff] = useState(() => parseBuilderHandoff(searchParams))
  const [materials, setMaterials] = useState<MaterialInfo[]>([])
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [rows, setRows] = useSessionState<BuilderRow[]>(
    `${KEY}rows`,
    (stored) => handoff?.rows ?? (Array.isArray(stored) ? stored : STARTER_RECIPE),
  )
  const [firingTempC, setFiringTempC] = useSessionState<number>(
    `${KEY}tempC`,
    (stored) => handoff?.firingTempC ?? stored ?? 1222,
  )
  const [atmosphere, setAtmosphere] = useSessionState<'Oxidation' | 'Reduction'>(
    `${KEY}atmosphere`,
    (stored) => handoff?.atmosphere ?? stored ?? 'Oxidation',
  )
  const [loadedRecipeName, setLoadedRecipeName] = useSessionState<string | null>(
    `${KEY}loadedName`,
    (stored) => (handoff ? (handoff.name ?? null) : (stored ?? null)),
  )
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  useEffect(() => {
    if (handoff) setSearchParams({}, { replace: true })
  }, [handoff, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/materials', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load materials (${response.status})`)
        setMaterials((await response.json()) as MaterialInfo[])
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setMaterialsError(err instanceof Error ? err.message : 'Could not load materials')
      })
    return () => controller.abort()
  }, [])

  const materialByName = useMemo(() => new Map(materials.map((m) => [m.name, m])), [materials])
  const coneIndex = useMemo(() => nearestConeIndex(firingTempC, CONES), [firingTempC])
  const totalParts = useMemo(() => rows.reduce((sum, row) => sum + row.parts, 0), [rows])

  /** Client-side normalisation so the percentages and the preview update instantly. */
  const percentages = useMemo(() => {
    const out: Record<string, number> = {}
    if (totalParts <= 0) return out
    for (const row of rows) out[row.name] = (row.parts / totalParts) * 100
    return out
  }, [rows, totalParts])

  const reduction = atmosphere === 'Reduction'
  const previewColor = useMemo(
    () => predictGlazeColor(percentages, reduction, firingTempC),
    [percentages, reduction, firingTempC],
  )

  useEffect(() => {
    if (rows.length === 0 || totalParts <= 0) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setAnalyzing(true)
      const parts = Object.fromEntries(rows.map((row) => [row.name, row.parts]))
      fetch('/api/recipes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts, firingTempC, atmosphere: atmosphere.toLowerCase() }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Analysis failed (${response.status})`)
          setAnalysis((await response.json()) as AnalyzeResponse)
          setAnalysisError(null)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setAnalysisError(err instanceof Error ? err.message : 'Analysis failed')
        })
        .finally(() => {
          if (!controller.signal.aborted) setAnalyzing(false)
        })
    }, ANALYZE_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [rows, totalParts, firingTempC, atmosphere])

  const addMaterial = useCallback(
    (name: string) => {
      const material = materialByName.get(name)
      if (!material) return
      setRows((current) => {
        if (current.some((row) => row.name === name)) return current
        const isColorant = material.category === 'Colorants'
        const starting = isColorant ? Math.min(2, material.maxParts) : Math.min(10, material.maxParts)
        return [...current, { name, parts: starting }]
      })
    },
    [materialByName, setRows],
  )

  const removeMaterial = useCallback(
    (name: string) => {
      setRows((current) => current.filter((row) => row.name !== name))
    },
    [setRows],
  )

  const setParts = useCallback(
    (name: string, parts: number) => {
      const clean = Number.isFinite(parts) ? Math.max(0, parts) : 0
      setRows((current) => current.map((row) => (row.name === name ? { ...row, parts: clean } : row)))
    },
    [setRows],
  )

  const clearRecipe = useCallback(() => {
    setRows([])
    setAnalysis(null)
    setLoadedRecipeName(null)
  }, [setRows, setLoadedRecipeName])

  const loadStarter = useCallback(() => {
    setRows(STARTER_RECIPE)
    setLoadedRecipeName(null)
  }, [setRows, setLoadedRecipeName])

  const availableMaterials = useMemo(
    () => materials.filter((m) => !rows.some((row) => row.name === m.name)),
    [materials, rows],
  )

  const recipeTitle = loadedRecipeName ?? 'Custom recipe'

  const buildExportPayload = () => ({
    exportedAt: new Date().toISOString(),
    name: recipeTitle,
    parameters: {
      firingTempC,
      firingTempF: cToF(firingTempC),
      cone: CONES[coneIndex].name,
      atmosphere,
      totalParts: Math.round(totalParts * 100) / 100,
    },
    recipe: rows.map((row) => ({ ...row, percent: Math.round((percentages[row.name] ?? 0) * 100) / 100 })),
    predictedColor: previewColor,
    umf: analysis?.umf,
    properties: analysis?.properties,
    warnings: analysis?.warnings ?? [],
  })

  const handleExportJson = () => {
    const payload = buildExportPayload()
    downloadFile(`glaze-builder-${formatTimestamp()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  const handlePrint = (options: { includePreview?: boolean } = {}) => {
    const payload = buildExportPayload()
    const properties = analysis?.properties
    const previewUrl = options.includePreview
      ? renderGlazePreviewDataUrl({
          color: previewColor,
          surfaceFinish: surfaceForPreview(properties?.surface),
          effect: effectForPreview(percentages),
          recipeIngredients: percentages,
          firingTempC,
          stability: stabilityForPreview(properties?.meltLabel),
          opacity: properties?.opacityLabel ?? 'Semi-opaque',
          foodSafe: false,
          atmosphere,
        })
      : null

    const parts = Object.fromEntries(rows.map((row) => [row.name, row.parts]))
    const propertiesHtml = properties
      ? `
        <h4>Predicted properties</h4>
        <table>
          <tbody>
            <tr><th>Melt</th><td>${escapeHtml(properties.meltLabel)}</td></tr>
            <tr><th>Surface</th><td>${escapeHtml(properties.surface)}</td></tr>
            <tr><th>Opacity</th><td>${escapeHtml(properties.opacityLabel)}</td></tr>
            <tr><th>Durability</th><td>${escapeHtml(properties.durabilityLabel)}</td></tr>
            <tr><th>Expansion</th><td>${properties.expansion.toFixed(0)} ×10⁻⁷/°C · ${escapeHtml(properties.expansionLabel)}</td></tr>
          </tbody>
        </table>
      `
      : ''
    const warnings = [...payload.warnings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    const warningsHtml =
      warnings.length === 0
        ? ''
        : `<h2>What to know</h2>${warnings
            .map(
              (warning) =>
                `<div class="warning warning--${warning.severity}"><strong>${escapeHtml(SEVERITY_LABEL[warning.severity])} — ${escapeHtml(warning.title)}</strong><p>${escapeHtml(warning.message)}</p></div>`,
            )
            .join('')}`

    const opened = openPrintSheet(
      'Glaze Builder Recipe',
      `
        <h1>Glaze Lab - Recipe Builder</h1>
        <p class="meta">Generated ${escapeHtml(payload.exportedAt)}</p>
        <h2>Firing</h2>
        ${parametersTableHtml(payload.parameters)}
        <section class="recipe">
          <h3>${escapeHtml(recipeTitle)}</h3>
          ${previewFigureHtml(previewUrl, `Predicted appearance of ${recipeTitle}`, `Predicted appearance — ${previewColor.toUpperCase()}`)}
          <table>
            <thead><tr><th>Ingredient</th><th>Parts</th><th>Percent</th></tr></thead>
            <tbody>${ingredientRowsHtml(percentages, parts)}<tr class="group"><th>Total</th><th>${formatParts(totalParts)}</th><th>100%</th></tr></tbody>
          </table>
          ${propertiesHtml}
          ${umfHtml(analysis?.umf)}
        </section>
        ${warningsHtml}
      `,
    )
    if (!opened) setAnalysisError('Could not initialize print document in this browser.')
  }

  return {
    materials,
    materialByName,
    availableMaterials,
    materialsError,
    rows,
    totalParts,
    percentages,
    firingTempC,
    setFiringTempC,
    coneIndex,
    atmosphere,
    setAtmosphere,
    analysis,
    analyzing,
    analysisError,
    previewColor,
    loadedRecipeName,
    addMaterial,
    removeMaterial,
    setParts,
    clearRecipe,
    loadStarter,
    handlePrint,
    handleExportJson,
  }
}

export type RecipeBuilder = ReturnType<typeof useRecipeBuilder>
