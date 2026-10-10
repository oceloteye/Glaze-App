import { describe, it } from 'vitest'
import { predictGlazeColor } from './glazeColor'
import { hexToHsl } from './colorBands'

/**
 * Diagnostic sweep: asks the running generator for a grid of target colours and prints how far each
 * suggested recipe's predicted colour lands from what was asked. Needs a backend:
 *   GENERATOR_URL=http://localhost:8080 SWEEP_HUES=240,340 npx vitest run colourSweep
 */
const GENERATOR_URL = import.meta.env.GENERATOR_URL as string | undefined

const BASE = new Set([
  'Potash Feldspar', 'Custer Feldspar', 'Soda Feldspar', 'Nepheline Syenite', 'Ferro Frit 3134', 'Ferro Frit 3124',
  'Whiting', 'Wollastonite', 'Dolomite', 'Talc', 'Gerstley Borate', 'Lithium Carbonate', 'Spodumene',
  'Strontium Carbonate', 'EPK Kaolin', 'Ball Clay', 'Bentonite', 'Silica', 'Zircopax', 'Tin Oxide',
])

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}

function hueDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function colourants(ing: Record<string, number>) {
  return Object.entries(ing)
    .filter(([n, a]) => !BASE.has(n) && a > 0.05)
    .map(([n, a]) => `${n.replace(' Carbonate', 'Carb').replace(' Dioxide', 'O2').replace(' Oxide', 'Ox')} ${a.toFixed(1)}`)
    .join(', ')
}

async function ask(color: string, tempC: number, atmosphere: string) {
  const res = await fetch(`${GENERATOR_URL}/api/recipes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      color, firingTempC: tempC, surfaceFinish: 'Glossy', stability: 'Medium', opacity: 'Semi-opaque',
      effects: [], intensity: 50, atmosphere, foodSafe: false,
    }),
  })
  if (!res.ok) throw new Error(`${res.status} for ${color}`)
  return (await res.json()) as { recipes: { name: string; ingredients: Record<string, number> }[] }
}

describe.runIf(GENERATOR_URL)('colour sweep', () => {
  it('prints generator round-trip error per target colour', async () => {
    const [hueFrom, hueTo] = ((import.meta.env.SWEEP_HUES as string | undefined) ?? '0,359').split(',').map(Number)
    const tempC = Number(import.meta.env.TEMP_C ?? 1222)
    const atmosphere = (import.meta.env.ATMOSPHERE as string | undefined) ?? 'oxidation'
    const reduction = atmosphere === 'reduction'
    const rows: string[] = []
    for (let h = hueFrom; h <= hueTo; h += 20) {
      for (const [s, l] of [[0.6, 0.35], [0.6, 0.55], [0.3, 0.45]]) {
        const target = hslToHex(h, s, l)
        const { recipes } = await ask(target, tempC, atmosphere)
        const parts = recipes.map((r) => {
          const hex = predictGlazeColor(r.ingredients, reduction, tempC)
          const got = hexToHsl(hex)
          const dh = hueDist(got.h, h)
          const flag = dh > 30 || Math.abs(got.l - l) > 0.18 ? ' ✗' : ''
          return `${hex} h${got.h.toFixed(0).padStart(3)} s${got.s.toFixed(2)} l${got.l.toFixed(2)}${flag}  [${colourants(r.ingredients)}]`
        })
        rows.push(`ask ${target} h${String(h).padStart(3)} s${s} l${l}\n    ${parts.join('\n    ')}`)
      }
    }
    console.log('\n' + rows.join('\n'))
  }, 120_000)
})
