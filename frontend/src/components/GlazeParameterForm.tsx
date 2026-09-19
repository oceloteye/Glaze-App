import { GlazePreview } from '../GlazePreview'
import { ATMOSPHERE_OPTIONS, EFFECTS, SURFACE_FINISHES, SECONDARY_COLOR_LABEL, CONES } from '../app/constants'
import { fToC, syncTemperatureInput } from '../app/utils'
import type { GlazeComposer } from '../hooks/useGlazeComposer'

interface Props {
  composer: GlazeComposer
}

export function GlazeParameterForm({ composer }: Props) {
  const {
    form,
    loading,
    error,
    selectedRecipe,
    hasGeneratedRecipes,
    openAiButtonRef,
    openRealisticButtonRef,
    openPreview,
    handleSubmit,
    currentEffect,
    showSecondaryColor,
    secondaryColor,
    secondaryHexInput,
    setSecondaryColor,
    setSecondaryHexInput,
    effectIntensity,
    setEffectIntensity,
    setForm,
    tempUnit,
    setTempUnit,
    tempInputStr,
    setTempInputStr,
    coneIndex,
    
  } = composer

  return (
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
          onMouseEnter={() => undefined}
          onFocus={() => undefined}
          onTouchStart={() => undefined}
          onClick={() => openPreview('ai')}
        >
          Open Local Preview Modal
        </button>
        <button
          ref={openRealisticButtonRef}
          type="button"
          className="ghost-btn"
          disabled={!hasGeneratedRecipes}
          onMouseEnter={() => undefined}
          onFocus={() => undefined}
          onTouchStart={() => undefined}
          onClick={() => openPreview('realistic')}
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
              const value = event.target.value
              if (/^#[0-9a-fA-F]{0,6}$/.test(value)) {
                setForm({ ...form, color: value })
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
              const next = tempUnit === 'C' ? 'F' : 'C'
              setTempUnit(next)
              setTempInputStr(syncTemperatureInput(next, form.firingTempC))
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
            const index = Number(event.target.value)
            const newTempC = CONES[index].tempC
            setForm({ ...form, firingTempC: newTempC })
            setTempInputStr(syncTemperatureInput(tempUnit, newTempC))
          }}
        />
        <div className="temp-manual">
          <input
            type="number"
            value={tempInputStr}
            onChange={(event) => {
              const value = event.target.value
              setTempInputStr(value)
              const raw = Number(value)
              if (!Number.isNaN(raw) && value !== '') {
                const celsius = tempUnit === 'C' ? raw : fToC(raw)
                if (celsius >= CONES[0].tempC && celsius <= CONES[CONES.length - 1].tempC) {
                  setForm({ ...form, firingTempC: celsius })
                }
              }
            }}
            onBlur={() => {
              setTempInputStr(syncTemperatureInput(tempUnit, form.firingTempC))
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
            value={SURFACE_FINISHES.indexOf(form.surfaceFinish as (typeof SURFACE_FINISHES)[number])}
            className="finish-slider"
            onChange={(event) => setForm({ ...form, surfaceFinish: SURFACE_FINISHES[Number(event.target.value)] })}
          />
          <div className="finish-labels">
            {SURFACE_FINISHES.map((finish) => (
              <span key={finish} className={form.surfaceFinish === finish ? 'finish-active' : ''}>
                {finish}
              </span>
            ))}
          </div>
        </div>
      </label>

      <label>
        Stability target
        <select value={form.stability} onChange={(event) => setForm({ ...form, stability: event.target.value })}>
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
        Kiln atmosphere
        <select
          value={form.atmosphere ?? 'Oxidation'}
          onChange={(event) => setForm({ ...form, atmosphere: event.target.value })}
        >
          {ATMOSPHERE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="field-note">
          Currently limited to oxidation and reduction so the recipe model can stay predictable.
        </p>
      </label>

      <label>
        Dinnerware / food safe
        <select value={form.foodSafe ? 'Yes' : 'No'} onChange={(event) => setForm({ ...form, foodSafe: event.target.value === 'Yes' })}>
          <option>No</option>
          <option>Yes</option>
        </select>
        <p className="field-note">
          Food-safe mode biases formulas toward more stable functional chemistry, but lab-style leach testing is still required before production dinnerware use.
        </p>
      </label>

      <label>
        Effect
        <select
          value={form.effects[0] ?? ''}
          onChange={(event) => {
            const value = event.target.value
            setForm({ ...form, effects: value ? [value] : [] })
          }}
        >
          {EFFECTS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
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
                const value = event.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(value)) {
                  setSecondaryHexInput(value)
                  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                    setSecondaryColor(value)
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
  )
}
