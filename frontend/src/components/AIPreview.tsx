import { useEffect, useMemo, useRef } from 'react'
import { describeRecipeVisualSignals } from '../lib/glazeMaterialModel'
import { createNoiseMap, sampleNoise } from '../lib/seededNoise'
import type { ClayBody, LightingPreset, MaterialProfile, RecipeVisualSignals } from '../types/rendering'

interface Props {
  material: MaterialProfile
  seedKey: string
  lighting: LightingPreset
  clayBody: ClayBody
  effect: string
  selectedRecipeName?: string
  selectedRecipeFiringRange?: string
  selectedRecipeRationale?: string
  selectedRecipeIngredients?: Record<string, number>
}

function hashStr(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function clayBodyTone(clayBody: ClayBody) {
  switch (clayBody) {
    case 'Porcelain':
      return { r: 240, g: 235, b: 229 }
    case 'Buff Stoneware':
      return { r: 224, g: 206, b: 182 }
    case 'Iron-rich Stoneware':
      return { r: 189, g: 158, b: 132 }
    default:
      return { r: 231, g: 218, b: 200 }
  }
}

function lightingSky(lighting: LightingPreset) {
  switch (lighting) {
    case 'Daylight':
      return ['#edf4fa', '#dfe9f2'] as const
    case 'Warm Indoor':
      return ['#f5e3d4', '#ead2bd'] as const
    default:
      return ['#f8efe3', '#ece0d3'] as const
  }
}

function labelFor(value: number, thresholds: [number, number], names: [string, string, string]) {
  if (value < thresholds[0]) return names[0]
  if (value < thresholds[1]) return names[1]
  return names[2]
}

function describeForecast(material: MaterialProfile, effect: string) {
  const effectName = effect || 'Neutral'
  const flow = labelFor(material.flow, [0.42, 0.72], ['tight flow', 'balanced flow', 'strong pooling'])
  const gloss = labelFor(material.gloss, [0.38, 0.72], ['matte finish', 'satin finish', 'gloss-forward'])
  const texture = labelFor(material.roughness, [0.28, 0.58], ['smooth body', 'light texture', 'textured surface'])
  const edge = labelFor(material.edgeBreak, [0.35, 0.7], ['crisp edges', 'softened edges', 'broken edges'])
  return [effectName, flow, gloss, texture, edge]
}

function drawAiConcept(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  material: MaterialProfile,
  seedKey: string,
  lighting: LightingPreset,
  clayBody: ClayBody,
  effect: string,
  signals: RecipeVisualSignals,
) {
  const rng = seededRng(hashStr(`${seedKey}:ai-preview`))
  const noise = {
    coarse: createNoiseMap(width, height, `${seedKey}:ai-noise:coarse`),
    mid: createNoiseMap(width, height, `${seedKey}:ai-noise:mid`),
    fine: createNoiseMap(width, height, `${seedKey}:ai-noise:fine`),
  }
  const body = clayBodyTone(clayBody)
  const [skyStart, skyEnd] = lightingSky(lighting)

  ctx.clearRect(0, 0, width, height)

  const background = ctx.createLinearGradient(0, 0, 0, height)
  background.addColorStop(0, skyStart)
  background.addColorStop(1, skyEnd)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(62, 42, 30, 0.08)'
  ctx.beginPath()
  ctx.ellipse(width * 0.5, height * 0.68, width * 0.34, height * 0.11, 0, 0, Math.PI * 2)
  ctx.fill()

  const tileX = 22
  const tileY = 20
  const tileW = width - 44
  const tileH = height - 56
  const glazeInset = 14
  const glazeX = tileX + glazeInset
  const glazeY = tileY + glazeInset
  const glazeW = tileW - glazeInset * 2
  const glazeH = tileH - glazeInset * 2
  const base = material.baseRgb
  const accent = material.accentRgb
  const glazeRadius = 18
  const ironStrength = clamp(signals.iron / 8, 0, 1)
  const rutileStrength = clamp(signals.rutile / 8, 0, 1)
  const opacifierStrength = clamp(signals.opacifier / 10, 0, 1)
  const boronStrength = clamp(signals.boron / 20, 0, 1)
  const cobaltStrength = clamp(signals.cobalt / 2, 0, 1)
  const copperStrength = clamp(signals.copper / 3, 0, 1)
  const manganeseStrength = clamp(signals.manganese / 4, 0, 1)

  const recipeAccent = {
    r: mix(accent.r, 58, cobaltStrength * 0.65),
    g: mix(accent.g, 118, copperStrength * 0.6),
    b: mix(accent.b, 176, cobaltStrength * 0.8),
  }
  const ironTone = {
    r: mix(base.r, 118, 0.55),
    g: mix(base.g, 88, 0.6),
    b: mix(base.b, 56, 0.72),
  }

  ctx.fillStyle = `rgb(${body.r},${body.g},${body.b})`
  ctx.fillRect(tileX, tileY, tileW, tileH)

  const bodyShade = ctx.createLinearGradient(tileX, tileY, tileX + tileW, tileY + tileH)
  bodyShade.addColorStop(0, 'rgba(255,255,255,0.18)')
  bodyShade.addColorStop(0.55, 'rgba(255,255,255,0)')
  bodyShade.addColorStop(1, 'rgba(34, 22, 14, 0.16)')
  ctx.fillStyle = bodyShade
  ctx.fillRect(tileX, tileY, tileW, tileH)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(glazeX, glazeY, glazeW, glazeH, glazeRadius)
  ctx.clip()

  const glazeGrad = ctx.createLinearGradient(glazeX, glazeY, glazeX, glazeY + glazeH)
  glazeGrad.addColorStop(0, `rgba(${mix(base.r, 255, 0.14)},${mix(base.g, 255, 0.14)},${mix(base.b, 255, 0.14)},0.95)`)
  glazeGrad.addColorStop(0.5, `rgba(${base.r},${base.g},${base.b},0.88)`)
  glazeGrad.addColorStop(1, `rgba(${Math.max(0, base.r - 28)},${Math.max(0, base.g - 22)},${Math.max(0, base.b - 18)},0.96)`)
  ctx.fillStyle = glazeGrad
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  const translucency = clamp(1 - material.opacity, 0.08, 0.92)
  const bodyGlow = ctx.createLinearGradient(glazeX, glazeY, glazeX, glazeY + glazeH)
  bodyGlow.addColorStop(0, `rgba(${body.r},${body.g},${body.b},${0.03 + translucency * 0.04})`)
  bodyGlow.addColorStop(0.72, `rgba(${body.r},${body.g},${body.b},${0.08 + translucency * 0.14})`)
  bodyGlow.addColorStop(1, `rgba(${body.r},${body.g},${body.b},${0.16 + translucency * 0.2})`)
  ctx.fillStyle = bodyGlow
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  const opacityVeil = ctx.createLinearGradient(glazeX, glazeY, glazeX + glazeW, glazeY + glazeH)
  opacityVeil.addColorStop(0, `rgba(255,255,255,${material.opacity * 0.1})`)
  opacityVeil.addColorStop(0.45, `rgba(255,255,255,${material.opacity * 0.18 + opacifierStrength * 0.08})`)
  opacityVeil.addColorStop(1, `rgba(245,244,240,${material.opacity * 0.22 + opacifierStrength * 0.12})`)
  ctx.fillStyle = opacityVeil
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  if (ironStrength > 0.05) {
    const ironWash = ctx.createLinearGradient(glazeX, glazeY, glazeX, glazeY + glazeH)
    ironWash.addColorStop(0, `rgba(${ironTone.r},${ironTone.g},${ironTone.b},${0.03 + ironStrength * 0.05})`)
    ironWash.addColorStop(1, `rgba(${ironTone.r},${ironTone.g},${ironTone.b},${0.06 + ironStrength * 0.12})`)
    ctx.fillStyle = ironWash
    ctx.fillRect(glazeX, glazeY, glazeW, glazeH)
  }

  const brushCount = Math.round(12 + material.flow * 18)
  for (let i = 0; i < brushCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const w = glazeW * (0.18 + rng() * 0.36)
    const h = 10 + rng() * 26
    const alpha = 0.03 + material.variegationStrength * 0.06 + rng() * 0.04
    const stroke = ctx.createLinearGradient(x - w * 0.3, y, x + w * 0.3, y + h)
    if (i % 3 === 0) {
      stroke.addColorStop(0, `rgba(${recipeAccent.r},${recipeAccent.g},${recipeAccent.b},${alpha + boronStrength * 0.03})`)
      stroke.addColorStop(1, 'rgba(0,0,0,0)')
    } else {
      stroke.addColorStop(0, `rgba(255,255,255,${alpha * (0.85 + boronStrength * 0.15)})`)
      stroke.addColorStop(1, 'rgba(0,0,0,0)')
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rng() - 0.5) * 0.4)
    ctx.fillStyle = stroke
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h)
    ctx.restore()
  }

  const bloomCount = Math.round(6 + material.crystalDensity * 11)
  for (let i = 0; i < bloomCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const radius = 10 + rng() * 24
    const n = sampleNoise(noise.mid, x, y)
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, radius)
    bloom.addColorStop(0, `rgba(${mix(recipeAccent.r, 188, rutileStrength * 0.45)},${mix(recipeAccent.g, 156, rutileStrength * 0.38)},${mix(recipeAccent.b, 112, rutileStrength * 0.3)},${0.06 + n * 0.09 + rutileStrength * 0.06})`)
    bloom.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bloom
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const speckleCount = Math.round(18 + material.speckleDensity * 180 + ironStrength * 42 + manganeseStrength * 26)
  for (let i = 0; i < speckleCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const radius = 0.45 + rng() * (0.8 + material.speckleDensity * 1.8 + ironStrength * 1.1)
    const darkness = 28 + Math.round(rng() * 45)
    const speckleColor = ironStrength > 0.08
      ? {
          r: mix(darkness, ironTone.r, 0.52),
          g: mix(Math.max(18, darkness - 10), ironTone.g, 0.56),
          b: mix(Math.max(12, darkness - 16), ironTone.b, 0.6),
        }
      : { r: darkness, g: Math.max(18, darkness - 10), b: Math.max(12, darkness - 16) }
    ctx.fillStyle = `rgba(${speckleColor.r},${speckleColor.g},${speckleColor.b},${0.16 + material.speckleDensity * 0.3 + ironStrength * 0.08})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const grainCount = Math.round(80 + material.roughness * 140)
  for (let i = 0; i < grainCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const n = sampleNoise(noise.fine, x, y)
    const px = clamp(x, glazeX, glazeX + glazeW - 1)
    const py = clamp(y, glazeY, glazeY + glazeH - 1)
    ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
    ctx.fillRect(px, py, 1, 1)
  }

  const pitCount = Math.round(material.microPitting * 42)
  for (let i = 0; i < pitCount; i++) {
    const x = glazeX + 8 + rng() * Math.max(1, glazeW - 16)
    const y = glazeY + 8 + rng() * Math.max(1, glazeH - 16)
    const radius = 0.8 + rng() * 1.4
    ctx.beginPath()
    ctx.arc(x, y, radius + 0.8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(42, 29, 20, 0.18)'
    ctx.fill()
  }

  const poolAlpha = 0.1 + material.pooling * 0.22 + boronStrength * 0.08
  const pooling = ctx.createLinearGradient(0, glazeY + glazeH * 0.42, 0, glazeY + glazeH)
  pooling.addColorStop(0, 'rgba(0,0,0,0)')
  pooling.addColorStop(1, `rgba(0,0,0,${poolAlpha})`)
  ctx.fillStyle = pooling
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  const highlight = ctx.createLinearGradient(glazeX, glazeY, glazeX + glazeW * 0.7, glazeY + glazeH * 0.35)
  highlight.addColorStop(0, `rgba(255,255,255,${0.14 + material.gloss * 0.22 + boronStrength * 0.06})`)
  highlight.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlight
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  const edgeBreak = ctx.createLinearGradient(glazeX, glazeY, glazeX + glazeW, glazeY)
  edgeBreak.addColorStop(0, `rgba(${body.r},${body.g},${body.b},${material.edgeBreak * 0.22})`)
  edgeBreak.addColorStop(0.18, 'rgba(0,0,0,0)')
  edgeBreak.addColorStop(0.82, 'rgba(0,0,0,0)')
  edgeBreak.addColorStop(1, `rgba(${body.r},${body.g},${body.b},${material.edgeBreak * 0.18})`)
  ctx.fillStyle = edgeBreak
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  ctx.restore()

  const frame = ctx.createLinearGradient(tileX, tileY, tileX + tileW, tileY + tileH)
  frame.addColorStop(0, 'rgba(255,255,255,0.24)')
  frame.addColorStop(1, 'rgba(28,18,12,0.18)')
  ctx.strokeStyle = frame
  ctx.lineWidth = 1.5
  ctx.strokeRect(tileX + 0.75, tileY + 0.75, tileW - 1.5, tileH - 1.5)

  const tags = describeForecast(material, effect)
  ctx.font = '600 11px Georgia, serif'
  ctx.textBaseline = 'middle'
  let chipX = 18
  const chipY = height - 23
  for (const tag of tags) {
    const textWidth = ctx.measureText(tag).width
    const chipWidth = textWidth + 18
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.strokeStyle = 'rgba(82,58,42,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(chipX, chipY - 9, chipWidth, 20, 999)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(49, 34, 23, 0.92)'
    ctx.fillText(tag, chipX + 9, chipY)
    chipX += chipWidth + 6
  }
}

export function AIPreview({
  material,
  seedKey,
  lighting,
  clayBody,
  effect,
  selectedRecipeName,
  selectedRecipeFiringRange,
  selectedRecipeRationale,
}: Props) {
  const signals = material.recipeSignals
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ingredientTags = useMemo(() => describeRecipeVisualSignals(signals), [signals])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawAiConcept(ctx, canvas.width, canvas.height, material, seedKey, lighting, clayBody, effect, signals)
  }, [material, seedKey, lighting, clayBody, effect, signals])

  const summary = useMemo(() => describeForecast(material, effect), [material, effect])

  return (
    <div className="glaze-preview-wrap ai-preview-wrap">
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        className="ai-preview-canvas"
        aria-label="Local glaze concept preview"
      />
      <p className="glaze-preview-caption">
        Local concept preview {selectedRecipeName ? `for ${selectedRecipeName}` : '(formula forecast)'}
      </p>
      <p className="glaze-preview-caption">Procedural tile render based on shared material and recipe chemistry signals.</p>
      {selectedRecipeFiringRange ? <p className="glaze-preview-caption">Firing range: {selectedRecipeFiringRange}</p> : null}
      {selectedRecipeRationale ? <p className="glaze-preview-caption">Recipe note: {selectedRecipeRationale}</p> : null}
      <div className="ai-preview-tags" aria-label="AI preview highlights">
        {summary.slice(1).map((tag) => (
          <span key={tag} className="ai-preview-tag">
            {tag}
          </span>
        ))}
      </div>
      {ingredientTags.length > 0 ? (
        <>
          <p className="glaze-preview-caption">Recipe signals reflected in local fallback</p>
          <div className="ai-preview-tags" aria-label="Recipe-driven preview signals">
            {ingredientTags.map((tag) => (
              <span key={tag} className="ai-preview-tag">
                {tag}
              </span>
            ))}
          </div>
        </>
      ) : null}
      <p className="glaze-preview-selected">Forecast confidence: {material.confidence}</p>
    </div>
  )
}
