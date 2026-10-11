import { HUE_FAMILIES, familyHex, hueFamily } from '../lib/hueFamilies'
import type { GlazeRequest } from '../app/types'

interface Props {
  form: GlazeRequest
  setForm: (next: GlazeRequest) => void
  /** Predicted colour of the recipe that would lead for the current settings, when the backend has answered. */
  predictedColor?: string
  routeName?: string
}

export function HueFamilyPicker({ form, setForm, predictedColor, routeName }: Props) {
  const selected = hueFamily(form.hueFamily)
  const saturation = form.saturation ?? 50
  const depth = form.depth ?? 50

  return (
    <div className="hue-picker">
      <span className="hue-picker-title">Colour goal</span>
      <div className="hue-chips" role="radiogroup" aria-label="Hue family">
        {HUE_FAMILIES.map((family) => {
          const active = family.id === selected.id
          return (
            <button
              key={family.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`hue-chip${active ? ' hue-chip-active' : ''}${family.stainNote ? ' hue-chip-stain' : ''}`}
              title={family.stainNote ? `${family.label} — stain only` : `${family.label} — ${family.system}`}
              onClick={() => setForm({ ...form, hueFamily: family.id })}
            >
              <span className="hue-chip-swatch" style={{ background: familyHex(family.id, saturation, depth) }} />
              <span className="hue-chip-label">{family.label}</span>
              {family.stainNote ? <span className="hue-chip-flag" aria-label="stain only">stain</span> : null}
            </button>
          )
        })}
      </div>

      <label className="hue-slider">
        <span className="hue-slider-head">
          <span>Saturation</span>
          <span className="hue-slider-value">{saturation}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={saturation}
          className="finish-slider"
          onChange={(event) => setForm({ ...form, saturation: Number(event.target.value) })}
        />
        <span className="finish-labels">
          <span>Muted</span>
          <span>Pure</span>
        </span>
      </label>

      <label className="hue-slider">
        <span className="hue-slider-head">
          <span>Depth</span>
          <span className="hue-slider-value">{depth}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={depth}
          className="finish-slider"
          onChange={(event) => setForm({ ...form, depth: Number(event.target.value) })}
        />
        <span className="finish-labels">
          <span>Light</span>
          <span>Deep</span>
        </span>
      </label>

      <p className="field-note">
        {selected.label} · {selected.system}
        {routeName ? ` · leads with ${routeName}` : ''}
        {predictedColor ? ` · predicted ${predictedColor.toUpperCase()}` : ''}
      </p>
      {selected.stainNote ? <p className="field-note hue-stain-note">{selected.stainNote}</p> : null}
    </div>
  )
}
