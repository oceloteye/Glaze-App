import { beforeAll, describe, expect, it } from 'vitest'
import { predictGlazeColor } from './glazeColor'
import { REFERENCE_GLAZES, toPercentages, type ReferenceGlaze } from './referenceGlazes'
import { describeMiss, formatHsl, hexToHsl } from './colorBands'

/**
 * Round-trip calibration of the recipe generator against the colour model.
 * For every reference glaze we ask the generator for the colour the model predicts for that reference
 * (same cone and atmosphere), then run each generated recipe back through the model and check it lands
 * in the same band. Needs a running backend:
 *   GENERATOR_URL=http://localhost:8080 npx vitest run generatorCalibration
 */
const GENERATOR_URL = import.meta.env.GENERATOR_URL as string | undefined

type Suggestion = { name: string; ingredients: Record<string, number> }
type Variant = { name: string; hex: string; misses: string[]; ingredients: Record<string, number> }
type Result = { ref: ReferenceGlaze; asked: string; variants: Variant[] }

const BASE_MATERIALS = new Set([
  'Potash Feldspar', 'Custer Feldspar', 'Soda Feldspar', 'Nepheline Syenite', 'Ferro Frit 3134', 'Ferro Frit 3124',
  'Whiting', 'Wollastonite', 'Dolomite', 'Talc', 'Gerstley Borate', 'Lithium Carbonate', 'Spodumene',
  'Strontium Carbonate', 'EPK Kaolin', 'Ball Clay', 'Bentonite', 'Silica',
])

function colourants(ingredients: Record<string, number>) {
  return Object.entries(ingredients)
    .filter(([name, amount]) => !BASE_MATERIALS.has(name) && amount > 0.05)
    .map(([name, amount]) => `${name} ${amount.toFixed(2)}`)
    .join(', ')
}

/** True when the variant contains every material of the reference's signature chemistry. */
function matchesSignature(variant: Variant, signature: string[]) {
  return signature.every((material) => (variant.ingredients[material] ?? 0) > 0.1)
}

function requestFor(ref: ReferenceGlaze, asked: string) {
  return {
    color: asked,
    firingTempC: ref.tempC,
    surfaceFinish: /matte/i.test(`${ref.name} ${ref.looksLike}`) ? 'Matte' : 'Glossy',
    stability: 'Medium',
    opacity: /opaque|white/i.test(ref.looksLike) ? 'Opaque' : 'Translucent',
    effects: [],
    intensity: 50,
    atmosphere: ref.reduction ? 'reduction' : 'oxidation',
    foodSafe: false,
  }
}

async function roundTrip(ref: ReferenceGlaze): Promise<Result> {
  const asked = predictGlazeColor(toPercentages(ref.recipe), ref.reduction, ref.tempC)
  const response = await fetch(`${GENERATOR_URL}/api/recipes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestFor(ref, asked)),
  })
  if (!response.ok) throw new Error(`generate failed (${response.status}) for ${ref.name}`)
  const { recipes } = (await response.json()) as { recipes: Suggestion[] }
  const variants = recipes.map((recipe) => {
    const hex = predictGlazeColor(toPercentages(recipe.ingredients), ref.reduction, ref.tempC)
    return {
      name: recipe.name.split('—').pop()!.trim(),
      hex,
      misses: describeMiss(hexToHsl(hex), ref.expect),
      ingredients: recipe.ingredients,
    }
  })
  return { ref, asked, variants }
}

describe.runIf(GENERATOR_URL)('generator round-trips the reference glazes', () => {
  const results = new Map<string, Result>()

  beforeAll(async () => {
    const all = await Promise.all(REFERENCE_GLAZES.map(roundTrip))
    for (const result of all) results.set(result.ref.name, result)

    const rows = all.map(({ ref, asked, variants }) => {
      const hits = variants.filter((v) => v.misses.length === 0).length
      const summary = variants
        .map((v) => {
          const sig = ref.signature ? (matchesSignature(v, ref.signature) ? ' ◆' : ' ◇') : ''
          return `${v.name} ${v.hex}${v.misses.length ? ' ✗' : ''}${sig}`
        })
        .join('  ')
      const detail = import.meta.env.PRINT_COLORS
        ? variants.map((v) => `\n      ${v.name}: ${colourants(v.ingredients)}`).join('')
        : ''
      return `${hits}/${variants.length}  asked ${formatHsl(asked)}  ${ref.name.padEnd(42)} ${summary}${detail}`
    })
    console.log('\n' + rows.join('\n'))
  }, 60_000)

  it.each(REFERENCE_GLAZES.map((ref) => [ref.name, ref] as const))('%s', (_name, ref) => {
    const { asked, variants } = results.get(ref.name)!
    const failures = variants
      .filter((v) => v.misses.length > 0)
      .map((v) => `${v.name} → ${v.hex}: ${v.misses.join(', ')}`)
    expect(failures, `asked for ${asked} (${ref.looksLike})`).toEqual([])

    if (ref.signature) {
      const offered = variants.map((v) => `${v.name}: ${colourants(v.ingredients)}`)
      expect(
        variants.some((v) => matchesSignature(v, ref.signature!)),
        `no variant reaches the colour via ${ref.signature.join(' + ')}; offered\n  ${offered.join('\n  ')}`,
      ).toBe(true)
    }
  })
})
