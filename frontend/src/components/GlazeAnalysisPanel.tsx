import { GlazePreview } from '../GlazePreview'
import { CONES } from '../app/constants'
import type { GlazeProperties } from '../app/types'
import type { RecipeBuilder } from '../hooks/useRecipeBuilder'
import { UmfSection } from './UmfSection'

interface Props {
  builder: RecipeBuilder
}

function surfaceForPreview(surface: string | undefined) {
  if (surface === 'Glossy' || surface === 'Satin') return surface
  if (surface === 'Matte' || surface === 'Dry matte') return 'Matte'
  return 'Satin'
}

function stabilityForPreview(meltLabel: string | undefined) {
  if (meltLabel === 'Runny' || meltLabel === 'Fluid') return 'Low'
  if (meltLabel === 'Balanced') return 'Medium'
  return 'High'
}

function effectForPreview(percentages: Record<string, number>) {
  if ((percentages['Manganese Granules'] ?? 0) > 0 || (percentages['Ilmenite (granular)'] ?? 0) > 0) return 'Speckled'
  if ((percentages['Zinc Oxide'] ?? 0) >= 8 && ((percentages['Titanium Dioxide'] ?? 0) > 0 || (percentages['Rutile'] ?? 0) > 0)) {
    return 'Crystalline'
  }
  if ((percentages['Rutile'] ?? 0) >= 3) return 'Variegated'
  return ''
}

function Meter({ label, value, text, hint }: { label: string; value: number; text: string; hint: string }) {
  const width = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
  return (
    <div className="meter" title={hint}>
      <div className="meter__head">
        <span>{label}</span>
        <span className="meter__value">{text}</span>
      </div>
      <div className="meter__track" aria-hidden="true">
        <div className="meter__fill" style={{ width }} />
      </div>
    </div>
  )
}

function PropertyMeters({ properties }: { properties: GlazeProperties }) {
  const expansionPosition = (properties.expansion - 40) / 50
  return (
    <div className="meters">
      <Meter
        label="Melt"
        value={properties.melt}
        text={properties.meltLabel}
        hint="How far the fluxes can melt the silica and alumina at this cone, from unfused to runny."
      />
      <Meter
        label="Gloss"
        value={properties.gloss}
        text={properties.surface}
        hint="Driven by the silica:alumina ratio, boron and matting oxides like magnesium and excess calcium."
      />
      <Meter
        label="Opacity"
        value={properties.opacity}
        text={properties.opacityLabel}
        hint="Zirconium, tin, titanium and phosphorus opacify; underfired or matte glazes also look cloudier."
      />
      <Meter
        label="Durability"
        value={properties.durability}
        text={properties.durabilityLabel}
        hint="Hardness and leach resistance: enough silica and alumina, not too much boron, alkali or lithium."
      />
      <Meter
        label="Expansion"
        value={expansionPosition}
        text={`${properties.expansion.toFixed(0)} ×10⁻⁷/°C · ${properties.expansionLabel}`}
        hint="Estimated thermal expansion from oxide factors. Most clay bodies sit near 55–70; higher crazes, much lower shivers."
      />
    </div>
  )
}

export function GlazeAnalysisPanel({ builder }: Props) {
  const { analysis, analyzing, analysisError, percentages, previewColor, firingTempC, coneIndex, atmosphere, rows } = builder
  const properties = analysis?.properties

  return (
    <section className="panel analysis-panel" aria-labelledby="analysis-heading">
      <h2 id="analysis-heading">Predicted result</h2>

      <GlazePreview
        color={previewColor}
        surfaceFinish={surfaceForPreview(properties?.surface)}
        effect={effectForPreview(percentages)}
        recipeIngredients={rows.length > 0 ? percentages : undefined}
        firingTempC={firingTempC}
        stability={stabilityForPreview(properties?.meltLabel)}
        opacity={properties?.opacityLabel ?? 'Semi-opaque'}
        foodSafe={false}
        coneLabel={CONES[coneIndex].name}
        atmosphere={atmosphere}
        caption={rows.length === 0 ? 'Add materials to see a preview' : 'Live estimate from your recipe'}
      />

      {analysisError ? <p className="error-msg">{analysisError}</p> : null}

      {properties ? (
        <div className={analyzing ? 'analysis-body analysis-body--stale' : 'analysis-body'}>
          <PropertyMeters properties={properties} />
          {analysis ? <UmfSection umf={analysis.umf} /> : null}
        </div>
      ) : rows.length > 0 ? (
        <p className="empty-msg">Analysing…</p>
      ) : null}
    </section>
  )
}
