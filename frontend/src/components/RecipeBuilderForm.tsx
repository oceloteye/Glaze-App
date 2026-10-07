import { useState } from 'react'
import { CONES } from '../app/constants'
import type { MaterialInfo } from '../app/types'
import type { RecipeBuilder } from '../hooks/useRecipeBuilder'

interface Props {
  builder: RecipeBuilder
}

const CATEGORY_ORDER = ['Feldspars & frits', 'Fluxes', 'Clays & stabilizers', 'Glass formers', 'Opacifiers', 'Colorants']

function groupByCategory(materials: MaterialInfo[]) {
  const groups = new Map<string, MaterialInfo[]>()
  for (const material of materials) {
    const list = groups.get(material.category) ?? []
    list.push(material)
    groups.set(material.category, list)
  }
  return CATEGORY_ORDER.filter((category) => groups.has(category)).map((category) => ({
    category,
    materials: groups.get(category)!,
  }))
}

function MaterialRow({
  name,
  material,
  parts,
  percent,
  onChange,
  onRemove,
}: {
  name: string
  material: MaterialInfo | undefined
  parts: number
  percent: number
  onChange: (parts: number) => void
  onRemove: () => void
}) {
  const max = Math.max(material?.maxParts ?? 100, Math.ceil(parts))
  const step = material?.category === 'Colorants' ? 0.1 : 0.5
  const inputId = `parts-${name.replace(/\W+/g, '-').toLowerCase()}`

  return (
    <li className="builder-row">
      <div className="builder-row__head">
        <div className="builder-row__title">
          <label htmlFor={inputId} className="builder-row__name">
            {name}
          </label>
          {material ? <span className="builder-row__role">{material.role}</span> : null}
        </div>
        <div className="builder-row__amounts">
          <input
            id={inputId}
            type="number"
            className="builder-row__number"
            min={0}
            step={step}
            value={Number.isInteger(parts) ? parts : parts.toFixed(1)}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={`${name} parts`}
          />
          <span className="builder-row__unit">parts</span>
          <span className="builder-row__percent">{percent.toFixed(1)}%</span>
          <button type="button" className="builder-row__remove" onClick={onRemove} aria-label={`Remove ${name}`}>
            ×
          </button>
        </div>
      </div>
      <input
        type="range"
        className="builder-row__slider"
        min={0}
        max={max}
        step={step}
        value={parts}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${name} parts slider`}
      />
      {material ? <p className="builder-row__description">{material.description}</p> : null}
    </li>
  )
}

export function RecipeBuilderForm({ builder }: Props) {
  const {
    availableMaterials,
    materialsError,
    materialByName,
    rows,
    totalParts,
    percentages,
    setFiringTempC,
    coneIndex,
    atmosphere,
    setAtmosphere,
    addMaterial,
    removeMaterial,
    setParts,
    clearRecipe,
    loadStarter,
  } = builder

  const [pendingMaterial, setPendingMaterial] = useState('')
  const grouped = groupByCategory(availableMaterials)

  const handleAdd = () => {
    if (!pendingMaterial) return
    addMaterial(pendingMaterial)
    setPendingMaterial('')
  }

  return (
    <section className="panel builder-panel" aria-labelledby="builder-heading">
      <div className="builder-panel__head">
        <h2 id="builder-heading">Recipe</h2>
        <div className="results-actions">
          <button type="button" className="ghost-btn ghost-btn--small" onClick={loadStarter}>
            Load cone 6 base
          </button>
          <button type="button" className="ghost-btn ghost-btn--small" onClick={clearRecipe} disabled={rows.length === 0}>
            Clear
          </button>
        </div>
      </div>

      <div className="builder-firing">
        <label className="builder-firing__cone">
          <span className="temp-header">
            <span>Firing cone</span>
            <span className="cone-label">
              {CONES[coneIndex].name} · {CONES[coneIndex].tempC}°C
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={CONES.length - 1}
            value={coneIndex}
            className="temp-slider"
            onChange={(event) => setFiringTempC(CONES[Number(event.target.value)].tempC)}
          />
        </label>
        <fieldset className="builder-firing__atmosphere">
          <legend>Atmosphere</legend>
          {(['Oxidation', 'Reduction'] as const).map((option) => (
            <label key={option} className={option === atmosphere ? 'builder-chip builder-chip--active' : 'builder-chip'}>
              <input
                type="radio"
                name="atmosphere"
                value={option}
                checked={atmosphere === option}
                onChange={() => setAtmosphere(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="builder-add">
        <label className="builder-add__select">
          <span className="visually-hidden">Material to add</span>
          <select value={pendingMaterial} onChange={(event) => setPendingMaterial(event.target.value)}>
            <option value="">Add a material…</option>
            {grouped.map(({ category, materials }) => (
              <optgroup key={category} label={category}>
                {materials.map((material) => (
                  <option key={material.name} value={material.name}>
                    {material.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-btn" onClick={handleAdd} disabled={!pendingMaterial}>
          Add
        </button>
      </div>
      {materialsError ? <p className="error-msg">{materialsError}</p> : null}

      {rows.length === 0 ? (
        <p className="empty-msg">Add materials to start building a glaze, or load the cone 6 base to see how a balanced recipe looks.</p>
      ) : (
        <>
          <ul className="builder-rows">
            {rows.map((row) => (
              <MaterialRow
                key={row.name}
                name={row.name}
                material={materialByName.get(row.name)}
                parts={row.parts}
                percent={percentages[row.name] ?? 0}
                onChange={(parts) => setParts(row.name, parts)}
                onRemove={() => removeMaterial(row.name)}
              />
            ))}
          </ul>
          <p className="builder-total">
            <span>Total</span>
            <span>
              {Number.isInteger(totalParts) ? totalParts : totalParts.toFixed(1)} parts = 100%
            </span>
          </p>
        </>
      )}
    </section>
  )
}
