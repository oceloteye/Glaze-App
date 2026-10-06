import type { GlazeWarning, WarningCategory, WarningSeverity } from '../app/types'

interface Props {
  warnings: GlazeWarning[]
  stale: boolean
}

const CATEGORY_LABELS: Record<WarningCategory, { title: string; blurb: string }> = {
  maturity: { title: 'Melt & maturity', blurb: 'Will it melt properly at this cone, and how much will it move?' },
  fit: { title: 'Glaze fit', blurb: 'Thermal expansion versus the clay body: crazing and shivering.' },
  application: { title: 'Application & defects', blurb: 'Bucket behaviour and firing faults like crawling and pinholes.' },
  'food-safety': { title: 'Food safety', blurb: 'Leaching risks for surfaces that touch food and drink.' },
  toxicity: { title: 'Handling & toxicity', blurb: 'Studio safety when weighing, mixing and firing.' },
}

const CATEGORY_ORDER: WarningCategory[] = ['maturity', 'fit', 'application', 'food-safety', 'toxicity']
const SEVERITY_RANK: Record<WarningSeverity, number> = { danger: 0, caution: 1, info: 2 }
const SEVERITY_LABEL: Record<WarningSeverity, string> = { danger: 'Danger', caution: 'Caution', info: 'Note' }

export function GlazeWarningsPanel({ warnings, stale }: Props) {
  if (warnings.length === 0) return null

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: warnings
      .filter((warning) => warning.category === category)
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
  })).filter((group) => group.items.length > 0)

  const counts = warnings.reduce(
    (acc, warning) => ({ ...acc, [warning.severity]: acc[warning.severity] + 1 }),
    { danger: 0, caution: 0, info: 0 } as Record<WarningSeverity, number>,
  )

  return (
    <section className={stale ? 'panel warnings-panel warnings-panel--stale' : 'panel warnings-panel'} aria-labelledby="warnings-heading">
      <div className="warnings-panel__head">
        <h2 id="warnings-heading">What to know</h2>
        <p className="warnings-panel__summary">
          {counts.danger > 0 ? <span className="severity severity--danger">{counts.danger} danger</span> : null}
          {counts.caution > 0 ? <span className="severity severity--caution">{counts.caution} caution</span> : null}
          {counts.info > 0 ? <span className="severity severity--info">{counts.info} notes</span> : null}
        </p>
      </div>

      <div className="warnings-grid">
        {grouped.map(({ category, items }) => (
          <div key={category} className="warning-group">
            <h3>{CATEGORY_LABELS[category].title}</h3>
            <p className="warning-group__blurb">{CATEGORY_LABELS[category].blurb}</p>
            <ul>
              {items.map((warning) => (
                <li key={warning.title} className={`warning warning--${warning.severity}`}>
                  <div className="warning__head">
                    <span className={`severity severity--${warning.severity}`}>{SEVERITY_LABEL[warning.severity]}</span>
                    <strong>{warning.title}</strong>
                  </div>
                  <p>{warning.message}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
