import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONES } from '../app/constants'
import type { AnalyzeResponse, MaterialInfo } from '../app/types'
import { nearestConeIndex } from '../app/utils'
import { predictGlazeColor } from '../lib/glazeColor'

export type BuilderRow = { name: string; parts: number }

export const STARTER_RECIPE: BuilderRow[] = [
  { name: 'Potash Feldspar', parts: 40 },
  { name: 'Whiting', parts: 20 },
  { name: 'EPK Kaolin', parts: 15 },
  { name: 'Silica', parts: 25 },
]

const ANALYZE_DEBOUNCE_MS = 200

export function useRecipeBuilder() {
  const [materials, setMaterials] = useState<MaterialInfo[]>([])
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [rows, setRows] = useState<BuilderRow[]>(STARTER_RECIPE)
  const [firingTempC, setFiringTempC] = useState(1222)
  const [atmosphere, setAtmosphere] = useState<'Oxidation' | 'Reduction'>('Oxidation')
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

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
    [materialByName],
  )

  const removeMaterial = useCallback((name: string) => {
    setRows((current) => current.filter((row) => row.name !== name))
  }, [])

  const setParts = useCallback((name: string, parts: number) => {
    const clean = Number.isFinite(parts) ? Math.max(0, parts) : 0
    setRows((current) => current.map((row) => (row.name === name ? { ...row, parts: clean } : row)))
  }, [])

  const clearRecipe = useCallback(() => {
    setRows([])
    setAnalysis(null)
  }, [])

  const loadStarter = useCallback(() => setRows(STARTER_RECIPE), [])

  const availableMaterials = useMemo(
    () => materials.filter((m) => !rows.some((row) => row.name === m.name)),
    [materials, rows],
  )

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
    addMaterial,
    removeMaterial,
    setParts,
    clearRecipe,
    loadStarter,
  }
}

export type RecipeBuilder = ReturnType<typeof useRecipeBuilder>
