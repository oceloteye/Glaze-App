import { useEffect, useMemo, useRef, useState } from 'react'
import { createNoiseMap, sampleNoise } from '../lib/seededNoise'
import type { ClayBody, LightingPreset, MaterialProfile } from '../types/rendering'

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

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${byte(rgb.r)}${byte(rgb.g)}${byte(rgb.b)}`
}

interface GeminiPreviewResponse {
  provider: string
  imageDataUrl: string | null
  prompt: string
  message: string
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

  const brushCount = Math.round(12 + material.flow * 18)
  for (let i = 0; i < brushCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const w = glazeW * (0.18 + rng() * 0.36)
    const h = 10 + rng() * 26
    const alpha = 0.03 + material.variegationStrength * 0.06 + rng() * 0.04
    const stroke = ctx.createLinearGradient(x - w * 0.3, y, x + w * 0.3, y + h)
    if (i % 3 === 0) {
      stroke.addColorStop(0, `rgba(${accent.r},${accent.g},${accent.b},${alpha})`)
      stroke.addColorStop(1, 'rgba(0,0,0,0)')
    } else {
      stroke.addColorStop(0, `rgba(255,255,255,${alpha * 0.85})`)
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
    bloom.addColorStop(0, `rgba(${accent.r},${accent.g},${accent.b},${0.06 + n * 0.09})`)
    bloom.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bloom
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

  const poolAlpha = 0.1 + material.pooling * 0.22
  const pooling = ctx.createLinearGradient(0, glazeY + glazeH * 0.42, 0, glazeY + glazeH)
  pooling.addColorStop(0, 'rgba(0,0,0,0)')
  pooling.addColorStop(1, `rgba(0,0,0,${poolAlpha})`)
  ctx.fillStyle = pooling
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  const highlight = ctx.createLinearGradient(glazeX, glazeY, glazeX + glazeW * 0.7, glazeY + glazeH * 0.35)
  highlight.addColorStop(0, `rgba(255,255,255,${0.14 + material.gloss * 0.22})`)
  highlight.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlight
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
  selectedRecipeIngredients,
}: Props) {
  const baseColorHex = rgbToHex(material.baseRgb)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [remoteMessage, setRemoteMessage] = useState('')
  const [isLoadingGemini, setIsLoadingGemini] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawAiConcept(ctx, canvas.width, canvas.height, material, seedKey, lighting, clayBody, effect)
  }, [material, seedKey, lighting, clayBody, effect])

  useEffect(() => {
    const controller = new AbortController()
    const fetchGeminiPreview = async () => {
      setIsLoadingGemini(true)
      setRemoteMessage('Generating glaze preview with Google Gemini...')

      try {
        const accentHex = rgbToHex(material.accentRgb)
        const secondaryColorHex = accentHex.toLowerCase() !== baseColorHex.toLowerCase() ? accentHex : undefined

        const response = await fetch('/api/ai/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            baseColorHex,
            secondaryColorHex,
            surfaceFinish: material.gloss >= 0.72 ? 'Glossy' : material.gloss >= 0.4 ? 'Satin' : 'Matte',
            effect: effect || 'None',
            clayBody,
            lighting,
            selectedRecipeName,
            selectedRecipeFiringRange,
            selectedRecipeRationale,
            selectedRecipeIngredients,
            confidence: material.confidence,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`AI preview request failed with status ${response.status}`)
        }

        const data = (await response.json()) as GeminiPreviewResponse
        setImageDataUrl(data.imageDataUrl)
        setRemoteMessage(data.message || '')
      } catch (error) {
        if (!controller.signal.aborted) {
          setImageDataUrl(null)
          setRemoteMessage(error instanceof Error ? error.message : 'Unable to generate Gemini preview.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingGemini(false)
        }
      }
    }

    fetchGeminiPreview()

    return () => {
      controller.abort()
    }
  }, [
    baseColorHex,
    material,
    effect,
    clayBody,
    lighting,
    selectedRecipeName,
    selectedRecipeFiringRange,
    selectedRecipeRationale,
    selectedRecipeIngredients,
  ])

  const summary = useMemo(() => describeForecast(material, effect), [material, effect])

  return (
    <div className="glaze-preview-wrap ai-preview-wrap">
      {imageDataUrl ? (
        <img src={imageDataUrl} alt="AI glaze concept preview" className="ai-preview-image" />
      ) : (
        <canvas
          ref={canvasRef}
          width={220}
          height={220}
          className="ai-preview-canvas"
          aria-label="AI glaze concept preview"
        />
      )}
      <p className="glaze-preview-caption">
        AI concept preview via Google Gemini {selectedRecipeName ? `for ${selectedRecipeName}` : '(formula forecast)'}
      </p>
      {isLoadingGemini || remoteMessage ? <p className="glaze-preview-caption">{remoteMessage}</p> : null}
      <div className="ai-preview-tags" aria-label="AI preview highlights">
        {summary.slice(1).map((tag) => (
          <span key={tag} className="ai-preview-tag">
            {tag}
          </span>
        ))}
      </div>
      <p className="glaze-preview-selected">Forecast confidence: {material.confidence}</p>
    </div>
  )
}
