import type { GlazeComposer } from '../hooks/useGlazeComposer'
import type { FiringSchedule, RecipeSuggestion, ScheduleLength, Umf } from '../app/types'
import { INGREDIENT_INFO, OXIDE_INFO } from '../app/constants'
import { splitIngredients, sumPercent, type IngredientEntry } from '../app/utils'

interface Props {
  composer: GlazeComposer
}

type ExportFormat = 'json' | 'csv'

const SCHEDULE_LENGTHS: Array<{ value: ScheduleLength; label: string; hint: string }> = [
  { value: 'very-short', label: 'Very short', hint: '~4 h to peak — small electric kilns, thin test tiles' },
  { value: 'short', label: 'Short', hint: 'Fast ramps, brief soak — thin, well-dried work' },
  { value: 'medium', label: 'Medium', hint: 'Standard studio schedule' },
  { value: 'long', label: 'Long', hint: 'Slow ramps, extended soak, controlled cool — thick or large pieces' },
]

function formatScheduleTime(schedule: FiringSchedule) {
  return `~${schedule.estimatedHours} h total (${schedule.heatingHours} h heat / ${schedule.coolingHours} h cool)`
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

function formatOxide(oxide: string) {
  // Render the numeric subscripts (SiO2 -> SiO₂)
  return oxide.split(/(\d+)/).map((part, index) =>
    /^\d+$/.test(part) ? <sub key={index}>{part}</sub> : part,
  )
}

function UmfColumn({ title, oxides }: { title: string; oxides: Record<string, number> }) {
  const entries = Object.entries(oxides)
  if (entries.length === 0) return null
  return (
    <div className="umf__column">
      <span className="umf__column-title">{title}</span>
      {entries.map(([oxide, value]) => (
        <div className="umf__row" key={oxide} title={OXIDE_INFO[oxide]}>
          <span>{formatOxide(oxide)}</span>
          <span>{value.toFixed(3)}</span>
        </div>
      ))}
    </div>
  )
}

function UmfSection({ umf }: { umf: Umf }) {
  const fluxCount = Object.keys(umf.fluxes).length
  if (fluxCount === 0) return null
  const roShare = 1 - umf.r2oShare
  return (
    <details className="umf">
      <summary>
        <span>Unity molecular formula</span>
        <span className="umf__meta">
          Si:Al {umf.siAlRatio.toFixed(1)} · R₂O:RO {umf.r2oShare.toFixed(2)}:{roShare.toFixed(2)}
        </span>
      </summary>
      <div className="umf__grid">
        <UmfColumn title="Fluxes (unity)" oxides={umf.fluxes} />
        <UmfColumn title="Stabilizers" oxides={umf.stabilizers} />
        <UmfColumn title="Glass formers" oxides={umf.glassFormers} />
        <UmfColumn title="Colorants" oxides={umf.colorants} />
      </div>
      <p className="umf__note">
        Moles per unit of flux, from typical material analyses; colorants are shown but excluded from unity.
      </p>
    </details>
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
    recipes,
    handlePrint,
    handleExportJson,
    handleExportFiringSchedule,
    scheduleLength,
    setScheduleLength,
    scheduleFor,
  } = composer

  return (
    <section className="panel results-panel">
      <h2>Recipe Suggestions</h2>
      {recipes.length === 0 ? (
        <p className="empty-msg">Submit parameters to get glaze composition options.</p>
      ) : (
        <>
          <div className="results-actions">
            <button type="button" className="ghost-btn" onClick={handlePrint}>
              Print Recipe Sheet
            </button>
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
                <div className="recipe-head">
                  <h3>{recipe.name}</h3>
                  <span>{recipe.firingRange}</span>
                </div>
                <p>{recipe.rationale}</p>
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
              </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
