import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { GlazeComposer } from '../hooks/useGlazeComposer'
import type { FiringSchedule, RecipeSuggestion, ScheduleLength } from '../app/types'
import { INGREDIENT_INFO } from '../app/constants'
import { splitIngredients, sumPercent, type IngredientEntry } from '../app/utils'
import { renderGlazePreviewDataUrl } from '../GlazePreview'
import { builderHref } from '../lib/builderHandoff'
import { recipePreviewOptions, type RecipePreviewContext } from '../lib/builderPreview'
import { UmfSection } from './UmfSection'

interface Props {
  composer: GlazeComposer
}

type ExportFormat = 'json' | 'csv'

const THUMB_SIZE = 96

const SCHEDULE_LENGTHS: Array<{ value: ScheduleLength; label: string; hint: string }> = [
  { value: 'very-short', label: 'Very short', hint: '~4 h to peak — small electric kilns, thin test tiles' },
  { value: 'short', label: 'Short', hint: 'Fast ramps, brief soak — thin, well-dried work' },
  { value: 'medium', label: 'Medium', hint: 'Standard studio schedule' },
  { value: 'long', label: 'Long', hint: 'Slow ramps, extended soak, controlled cool — thick or large pieces' },
]

function formatScheduleTime(schedule: FiringSchedule) {
  return `~${schedule.estimatedHours} h total (${schedule.heatingHours} h heat / ${schedule.coolingHours} h cool)`
}

/** Small tile of what the recipe's own chemistry predicts, as distinct from the colour that was asked for. */
function RecipeThumb({ recipe, context }: { recipe: RecipeSuggestion; context: RecipePreviewContext }) {
  const options = useMemo(() => recipePreviewOptions(recipe, context), [recipe, context])
  const src = useMemo(() => renderGlazePreviewDataUrl(options, THUMB_SIZE * 2), [options])
  if (!src) return null
  return (
    <figure
      className="recipe-thumb"
      title="Estimated from this recipe's ingredients — the same prediction the Recipe Builder shows"
    >
      <img src={src} alt={`Predicted appearance of ${recipe.name} from its chemistry`} width={THUMB_SIZE} height={THUMB_SIZE} />
      <figcaption>
        <span className="recipe-thumb__label">From chemistry</span>
        <span className="recipe-thumb__hex">{options.color.toUpperCase()}</span>
      </figcaption>
    </figure>
  )
}

function formatRate(rateC: number | null, rateF: number | null) {
  if (rateC === null || rateF === null) return 'Full'
  return `${rateC}°C / ${rateF}°F per hr`
}

function formatHold(minutes: number) {
  if (minutes === 0) return '—'
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
  }
  return `${minutes} min`
}

function IngredientName({ name }: { name: string }) {
  const info = INGREDIENT_INFO[name]
  if (!info) return <strong>{name}</strong>
  return (
    <strong className="ingredient-name" tabIndex={0}>
      {name}
      <span className="ingredient-tip" role="tooltip">
        <span className="ingredient-tip__role">{info.role}</span>
        {info.description}
      </span>
    </strong>
  )
}

function IngredientGroup({ title, entries }: { title: string; entries: IngredientEntry[] }) {
  if (entries.length === 0) return null
  return (
    <div className="ingredient-group">
      <div className="ingredient-group__head">
        <span>{title}</span>
        <span>{sumPercent(entries).toFixed(2)}%</span>
      </div>
      <ul>
        {entries.map(([ingredient, percent]) => (
          <li key={ingredient}>
            <IngredientName name={ingredient} />
            <span>{percent.toFixed(2)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FiringScheduleSection({
  recipe,
  schedule,
  onExport,
}: {
  recipe: RecipeSuggestion
  schedule: FiringSchedule
  onExport: (recipe: RecipeSuggestion, format: ExportFormat) => void
}) {
  return (
    <details className="firing-schedule">
      <summary>
        <span>Recommended firing schedule</span>
        <span className="firing-schedule__meta">
          {schedule.length} · Cone {schedule.cone} · {schedule.atmosphere} · {schedule.coolingStrategy} · {formatScheduleTime(schedule)}
        </span>
      </summary>
      <div className="firing-schedule__actions">
        <span>Export for controller:</span>
        <button type="button" className="ghost-btn ghost-btn--small" onClick={() => onExport(recipe, 'json')}>
          JSON
        </button>
        <button type="button" className="ghost-btn ghost-btn--small" onClick={() => onExport(recipe, 'csv')}>
          CSV
        </button>
      </div>
      <table className="firing-schedule__table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Rate</th>
            <th>Target</th>
            <th>Hold</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {schedule.segments.map((segment, index) => (
            <tr key={index} className={`firing-schedule__row firing-schedule__row--${segment.phase.toLowerCase()}`}>
              <td>{segment.phase}</td>
              <td>{formatRate(segment.rateCPerHour, segment.rateFPerHour)}</td>
              <td>
                {segment.targetTempC}°C / {segment.targetTempF}°F
              </td>
              <td>{formatHold(segment.holdMinutes)}</td>
              <td className="firing-schedule__note">{segment.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {schedule.notes.length > 0 && (
        <ul className="firing-schedule__notes">
          {schedule.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </details>
  )
}

export function RecipeResultsPanel({ composer }: Props) {
  const {
    form,
    recipes,
    handlePrint,
    handleExportJson,
    handleExportFiringSchedule,
    scheduleLength,
    setScheduleLength,
    scheduleFor,
  } = composer
  const [printPreview, setPrintPreview] = useState(false)
  const previewContext = useMemo<RecipePreviewContext>(
    () => ({ firingTempC: form.firingTempC, atmosphere: form.atmosphere }),
    [form.firingTempC, form.atmosphere],
  )

  return (
    <section className="panel results-panel">
      <h2>Recipe Suggestions</h2>
      {recipes.length === 0 ? (
        <p className="empty-msg">Submit parameters to get glaze composition options.</p>
      ) : (
        <>
          <div className="results-actions">
            <button type="button" className="ghost-btn" onClick={() => handlePrint({ includePreview: printPreview })}>
              Print Recipe Sheet
            </button>
            <label className="print-option">
              <input
                type="checkbox"
                checked={printPreview}
                onChange={(event) => setPrintPreview(event.target.checked)}
              />
              Include preview image
            </label>
            <button type="button" className="ghost-btn" onClick={handleExportJson}>
              Export JSON
            </button>
          </div>
          <div className="schedule-length" role="group" aria-label="Firing schedule length">
            <span className="schedule-length__label">Firing schedule length</span>
            <div className="schedule-length__options">
              {SCHEDULE_LENGTHS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  aria-pressed={scheduleLength === option.value}
                  className={`schedule-length__option${scheduleLength === option.value ? ' schedule-length__option--active' : ''}`}
                  onClick={() => setScheduleLength(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="recipe-list">
            {recipes.map((recipe) => {
              const schedule = scheduleFor(recipe)
              const { base, colorants } = splitIngredients(recipe.ingredients)
              return (
              <article className="recipe-card" key={recipe.name}>
                <div className="recipe-card__top">
                  <div className="recipe-card__intro">
                    <div className="recipe-head">
                      <h3>{recipe.name}</h3>
                      <span>{recipe.firingRange}</span>
                    </div>
                    {recipe.route && recipe.route.signature.length > 0 && (
                      <p className="recipe-route">
                        <span className="recipe-route-label">Colour from</span>{' '}
                        {recipe.route.signature.join(' + ')}
                      </p>
                    )}
                    <p>{recipe.rationale}</p>
                  </div>
                  <RecipeThumb recipe={recipe} context={previewContext} />
                </div>
                <IngredientGroup title="Base glaze" entries={base} />
                <IngredientGroup title="Colorants & additives" entries={colorants} />
                {recipe.umf && <UmfSection umf={recipe.umf} />}
                {schedule && (
                  <FiringScheduleSection
                    recipe={recipe}
                    schedule={schedule}
                    onExport={handleExportFiringSchedule}
                  />
                )}
                <div className="recipe-card__actions">
                  <Link
                    className="ghost-btn ghost-btn--small"
                    to={builderHref(recipe, { firingTempC: form.firingTempC, atmosphere: form.atmosphere })}
                    title="Open this recipe in the Recipe Builder to adjust it material by material (Ctrl/Cmd-click for a new tab)"
                  >
                    Open in Recipe Builder
                  </Link>
                </div>
              </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
