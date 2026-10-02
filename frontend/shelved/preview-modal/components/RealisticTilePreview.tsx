import { useEffect, useRef } from 'react'
import { createNoiseMap, sampleNoise, type NoiseMap } from '../lib/seededNoise'
import type { ClayBody, LightingPreset, MaterialProfile } from '../types/rendering'

interface Props {
  material: MaterialProfile
  seedKey: string
  lighting: LightingPreset
  clayBody: ClayBody
}

interface TileGeometry {
  tileX: number
  tileY: number
  tileW: number
  tileH: number
  glazeX: number
  glazeY: number
  glazeW: number
  glazeH: number
}

interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  material: MaterialProfile
  lighting: LightingPreset
  clayBody: ClayBody
  geometry: TileGeometry
  noise: {
    coarse: NoiseMap
    mid: NoiseMap
    fine: NoiseMap
  }
}

type RenderPass = {
  name: string
  draw: (state: RenderContext) => void
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function clayBodyTone(clayBody: ClayBody) {
  switch (clayBody) {
    case 'Porcelain':
      return { r: 239, g: 235, b: 229 }
    case 'Buff Stoneware':
      return { r: 223, g: 205, b: 180 }
    case 'Iron-rich Stoneware':
      return { r: 188, g: 158, b: 132 }
    default:
      return { r: 230, g: 217, b: 198 }
  }
}

function backgroundPass(state: RenderContext) {
  const { ctx, width, height, lighting } = state
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  if (lighting === 'Warm Indoor') {
    bg.addColorStop(0, '#f2dfcf')
    bg.addColorStop(1, '#e5d1bf')
  } else if (lighting === 'Daylight') {
    bg.addColorStop(0, '#e9eff4')
    bg.addColorStop(1, '#dde7f0')
  } else {
    bg.addColorStop(0, '#f5ede4')
    bg.addColorStop(1, '#eadfd2')
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
}

function tileBodyPass(state: RenderContext) {
  const { ctx, clayBody, geometry } = state
  const { tileX, tileY, tileW, tileH } = geometry
  const body = clayBodyTone(clayBody)

  ctx.fillStyle = 'rgba(42,28,20,0.18)'
  ctx.beginPath()
  ctx.ellipse(tileX + tileW * 0.5, tileY + tileH + 10, tileW * 0.45, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgb(${body.r},${body.g},${body.b})`
  ctx.fillRect(tileX - 3, tileY - 3, tileW + 6, tileH + 6)

  const bevel = ctx.createLinearGradient(tileX - 3, tileY - 3, tileX + tileW + 3, tileY + tileH + 3)
  bevel.addColorStop(0, 'rgba(255,255,255,0.3)')
  bevel.addColorStop(1, 'rgba(30,20,12,0.18)')
  ctx.fillStyle = bevel
  ctx.fillRect(tileX - 3, tileY - 3, tileW + 6, tileH + 6)

  ctx.strokeStyle = 'rgba(78,56,40,0.26)'
  ctx.lineWidth = 1
  ctx.strokeRect(tileX - 2.5, tileY - 2.5, tileW + 5, tileH + 5)
}

function glazeBasePass(state: RenderContext) {
  const { ctx, material, geometry } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry
  const base = material.baseRgb

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  const coat = ctx.createLinearGradient(glazeX, glazeY, glazeX, glazeY + glazeH)
  coat.addColorStop(0, `rgba(${Math.min(255, base.r + 14)},${Math.min(255, base.g + 14)},${Math.min(255, base.b + 14)},${0.88 - material.opacity * 0.2})`)
  coat.addColorStop(0.55, `rgba(${base.r},${base.g},${base.b},${0.9 - material.opacity * 0.15})`)
  coat.addColorStop(1, `rgba(${Math.max(0, base.r - 22)},${Math.max(0, base.g - 22)},${Math.max(0, base.b - 22)},${0.93})`)
  ctx.fillStyle = coat
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)
  ctx.restore()
}

function flowRunsPass(state: RenderContext, rng: () => number) {
  const { ctx, material, geometry } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry
  const base = material.baseRgb
  const runs = Math.round(2 + material.flow * 11)

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  for (let i = 0; i < runs; i++) {
    const x = glazeX + rng() * glazeW
    const startY = glazeY + glazeH * (0.08 + rng() * 0.35)
    const len = glazeH * (0.2 + material.flow * 0.52 + rng() * 0.2)
    const endY = clamp(startY + len, glazeY + glazeH * 0.2, glazeY + glazeH * 0.97)
    const halfW = 2 + rng() * 6
    const alpha = 0.05 + material.flow * 0.2

    ctx.beginPath()
    ctx.moveTo(x - halfW, startY)
    ctx.bezierCurveTo(x - halfW * 0.6, startY + len * 0.4, x - 2, endY - len * 0.2, x, endY)
    ctx.bezierCurveTo(x + 2, endY - len * 0.2, x + halfW * 0.6, startY + len * 0.4, x + halfW, startY)
    ctx.closePath()

    const runGrad = ctx.createLinearGradient(x, startY, x, endY)
    runGrad.addColorStop(0, `rgba(${Math.max(0, base.r - 16)},${Math.max(0, base.g - 16)},${Math.max(0, base.b - 16)},${alpha})`)
    runGrad.addColorStop(0.8, `rgba(${Math.max(0, base.r - 20)},${Math.max(0, base.g - 20)},${Math.max(0, base.b - 20)},${alpha * 0.6})`)
    runGrad.addColorStop(1, `rgba(${Math.max(0, base.r - 30)},${Math.max(0, base.g - 30)},${Math.max(0, base.b - 30)},0)`)
    ctx.fillStyle = runGrad
    ctx.fill()
  }

  ctx.restore()
}

function poolingPass(state: RenderContext) {
  const { ctx, material, geometry } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry
  const poolingAlpha = 0.08 + material.pooling * 0.24

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  const pool = ctx.createLinearGradient(0, glazeY + glazeH * 0.5, 0, glazeY + glazeH)
  pool.addColorStop(0, 'rgba(0,0,0,0)')
  pool.addColorStop(1, `rgba(0,0,0,${poolingAlpha})`)
  ctx.fillStyle = pool
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  ctx.restore()
}

function variegationSpecklePass(state: RenderContext, rng: () => number) {
  const { ctx, material, geometry, noise } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry
  const accent = material.accentRgb
  const base = material.baseRgb

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  const varCount = Math.round(8 + material.variegationStrength * 26)
  for (let i = 0; i < varCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const r = 8 + rng() * 22
    const n = sampleNoise(noise.coarse, x, y)
    const alpha = 0.02 + material.variegationStrength * (0.08 + n * 0.08)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(${accent.r},${accent.g},${accent.b},${alpha})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const speckleCount = Math.round(25 + material.speckleDensity * 260)
  for (let i = 0; i < speckleCount; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const n = sampleNoise(noise.mid, x, y)
    const r = 0.45 + n * 1.8
    const a = 0.06 + material.speckleDensity * (0.16 + n * 0.25)
    ctx.fillStyle = `rgba(${Math.max(0, base.r - 90)},${Math.max(0, base.g - 90)},${Math.max(0, base.b - 90)},${a})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function crystalAndPittingPass(state: RenderContext, rng: () => number) {
  const { ctx, material, geometry, noise } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  const pinholes = Math.round(material.microPitting * 55)
  for (let i = 0; i < pinholes; i++) {
    const x = glazeX + rng() * glazeW
    const y = glazeY + rng() * glazeH
    const n = sampleNoise(noise.fine, x, y)
    const r = 0.5 + n * 1.2
    ctx.fillStyle = 'rgba(30,24,20,0.18)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const crystalCount = Math.round(material.crystalDensity * 16)
  for (let i = 0; i < crystalCount; i++) {
    const cx = glazeX + rng() * glazeW
    const cy = glazeY + rng() * glazeH
    const rr = 5 + rng() * 11
    const rays = 5 + Math.floor(rng() * 4)
    const rot = rng() * Math.PI
    const alpha = 0.08 + material.crystalDensity * 0.17
    for (let r = 0; r < rays; r++) {
      const a1 = rot + (r / rays) * Math.PI * 2
      const a2 = rot + ((r + 1) / rays) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr)
      ctx.lineTo(cx + Math.cos(a2) * rr, cy + Math.sin(a2) * rr)
      ctx.closePath()
      ctx.fillStyle = r % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 0.45})`
      ctx.fill()
    }
  }

  ctx.restore()
}

function edgeBreakPass(state: RenderContext) {
  const { ctx, material, geometry } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry

  const breakAlpha = 0.05 + material.edgeBreak * 0.18
  const edgeBreak = ctx.createLinearGradient(glazeX, glazeY, glazeX + glazeW, glazeY)
  edgeBreak.addColorStop(0, `rgba(255,255,255,${breakAlpha})`)
  edgeBreak.addColorStop(0.5, 'rgba(255,255,255,0)')
  edgeBreak.addColorStop(1, `rgba(255,255,255,${breakAlpha * 0.75})`)

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()
  ctx.strokeStyle = edgeBreak
  ctx.lineWidth = 3
  ctx.strokeRect(glazeX + 1.5, glazeY + 1.5, glazeW - 3, glazeH - 3)
  ctx.restore()
}

function roughnessPass(state: RenderContext) {
  const { ctx, material, geometry, noise } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  const roughCount = Math.round(180 + material.roughness * 520)
  for (let i = 0; i < roughCount; i++) {
    const x = glazeX + ((i * 17) % glazeW)
    const y = glazeY + ((i * 31) % glazeH)
    const n = sampleNoise(noise.fine, x, y)
    const alpha = 0.01 + material.roughness * 0.045 * n
    ctx.fillStyle = n > 0.52 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 0.8})`
    ctx.fillRect(x, y, 1, 1)
  }

  ctx.restore()
}

function highlightPass(state: RenderContext) {
  const { ctx, material, lighting, geometry } = state
  const { glazeX, glazeY, glazeW, glazeH } = geometry

  const lightingBoost = lighting === 'Daylight' ? 1.1 : lighting === 'Warm Indoor' ? 0.9 : 1
  const highlightAlpha = (0.16 + material.gloss * 0.5) * lightingBoost

  ctx.save()
  ctx.beginPath()
  ctx.rect(glazeX, glazeY, glazeW, glazeH)
  ctx.clip()

  const gloss = ctx.createLinearGradient(glazeX, glazeY, glazeX + glazeW * 0.72, glazeY + glazeH * 0.42)
  gloss.addColorStop(0, `rgba(255,255,255,${highlightAlpha})`)
  gloss.addColorStop(0.6, 'rgba(255,255,255,0.04)')
  gloss.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gloss
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  const streak = ctx.createLinearGradient(glazeX + glazeW * 0.68, glazeY, glazeX + glazeW, glazeY + glazeH * 0.6)
  streak.addColorStop(0, `rgba(255,255,255,${0.04 + material.gloss * 0.18})`)
  streak.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = streak
  ctx.fillRect(glazeX, glazeY, glazeW, glazeH)

  ctx.restore()
}

function framePass(state: RenderContext) {
  const { ctx, geometry } = state
  const { tileX, tileY, tileW, tileH } = geometry
  ctx.strokeStyle = 'rgba(62,45,33,0.26)'
  ctx.lineWidth = 1.2
  ctx.strokeRect(tileX + 0.6, tileY + 0.6, tileW - 1.2, tileH - 1.2)
}

function runRenderGraph(state: RenderContext, seedKey: string) {
  const rng = seededRng(hashStr(seedKey))
  const passes: RenderPass[] = [
    { name: 'background', draw: backgroundPass },
    { name: 'tile-body', draw: tileBodyPass },
    { name: 'glaze-base', draw: glazeBasePass },
    { name: 'flow-runs', draw: (s) => flowRunsPass(s, rng) },
    { name: 'pooling', draw: poolingPass },
    { name: 'variegation-speckle', draw: (s) => variegationSpecklePass(s, rng) },
    { name: 'crystal-pitting', draw: (s) => crystalAndPittingPass(s, rng) },
    { name: 'edge-break', draw: edgeBreakPass },
    { name: 'roughness', draw: roughnessPass },
    { name: 'highlights', draw: highlightPass },
    { name: 'frame', draw: framePass },
  ]

  for (const pass of passes) {
    pass.draw(state)
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  material: MaterialProfile,
  seedKey: string,
  lighting: LightingPreset,
  clayBody: ClayBody,
) {
  ctx.clearRect(0, 0, width, height)

  const tileX = 24
  const tileY = 18
  const tileW = width - 48
  const tileH = height - 34
  const glazeInset = 8

  const state: RenderContext = {
    ctx,
    width,
    height,
    material,
    lighting,
    clayBody,
    geometry: {
      tileX,
      tileY,
      tileW,
      tileH,
      glazeX: tileX + glazeInset,
      glazeY: tileY + glazeInset,
      glazeW: tileW - glazeInset * 2,
      glazeH: tileH - glazeInset * 2,
    },
    noise: {
      coarse: createNoiseMap(width, height, `${seedKey}:coarse`),
      mid: createNoiseMap(width, height, `${seedKey}:mid`),
      fine: createNoiseMap(width, height, `${seedKey}:fine`),
    },
  }

  runRenderGraph(state, seedKey)
}

export function RealisticTilePreview({ material, seedKey, lighting, clayBody }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawTile(ctx, canvas.width, canvas.height, material, seedKey, lighting, clayBody)
  }, [material, seedKey, lighting, clayBody])

  return (
    <div className="glaze-preview-wrap realistic-wrap">
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        className="realistic-preview-canvas"
        aria-label="Realistic test tile preview"
      />
      <p className="glaze-preview-caption">Realistic test tile (phase 2 deterministic)</p>
      <p className="glaze-preview-selected">Confidence: {material.confidence}</p>
    </div>
  )
}
