import type { Umf } from '../app/types'
import { OXIDE_INFO } from '../app/constants'

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

export function UmfSection({ umf, open }: { umf: Umf; open?: boolean }) {
  const fluxCount = Object.keys(umf.fluxes).length
  if (fluxCount === 0) return null
  const roShare = 1 - umf.r2oShare
  return (
    <details className="umf" open={open}>
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
