import { useEffect, useRef } from 'react'

interface Props {
  color: string
  surfaceFinish: string
  effect: string
  secondaryColor?: string
  intensity?: number
  recipeIngredients?: Record<string, number>
  selectedRecipeName?: string
  firingTempC?: number
  stability?: string
  foodSafe?: boolean
}

type IngredientMap = Record<string, number>

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

/** FNV-1a 32-bit hash — deterministic seed from the inputs */
function hashStr(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** Knuth LCG — deterministic RNG seeded from hashStr */
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

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function ingredientTotal(ingredients: IngredientMap | undefined, keys: string[]) {
  if (!ingredients) return 0
  return keys.reduce((sum, key) => sum + (ingredients[key] ?? 0), 0)
}

function deriveChemistry(
  ingredients: IngredientMap | undefined,
  firingTempC: number,
  stability: string,
  foodSafe: boolean,
) {
  const silica = ingredientTotal(ingredients, ['Silica', 'Flint', 'Quartz'])
  const alumina = ingredientTotal(ingredients, ['Kaolin', 'EPK', 'Ball Clay', 'Alumina Hydrate'])
  const flux = ingredientTotal(ingredients, [
    'Potash Feldspar',
    'Soda Feldspar',
    'Nepheline Syenite',
    'Frit 3134',
    'Frit 3124',
    'Whiting',
    'Dolomite',
    'Talc',
    'Zinc Oxide',
  ])
  const boron = ingredientTotal(ingredients, ['Frit 3134', 'Frit 3124', 'Gerstley Borate', 'Colemanite'])
  const opacifier = ingredientTotal(ingredients, ['Zircopax', 'Tin Oxide'])
  const iron = ingredientTotal(ingredients, ['Red Iron Oxide', 'Yellow Iron Oxide'])
  const manganese = ingredientTotal(ingredients, ['Manganese Dioxide'])
  const rutile = ingredientTotal(ingredients, ['Rutile', 'Titanium Dioxide'])
  const cobalt = ingredientTotal(ingredients, ['Cobalt Carbonate', 'Cobalt Oxide'])
  const copper = ingredientTotal(ingredients, ['Copper Carbonate', 'Copper Oxide'])

  const tempBias = clamp((firingTempC - 1180) / 150, -0.6, 0.9)
  const baseFlow = (flux * 0.012 + boron * 0.02 + tempBias) - (silica * 0.006 + alumina * 0.01)
  const flow = clamp(0.45 + baseFlow, 0.05, 1)

  const chemistryGloss = clamp(0.25 + flow * 0.7 - opacifier * 0.01 - alumina * 0.004, 0, 1)
  const opacity = clamp(0.12 + opacifier * 0.04 + alumina * 0.006 + rutile * 0.01, 0, 0.95)
  const speckle = clamp((iron + manganese + rutile * 0.6) / 14, 0, 1)
  const crystal = clamp((zincOrTitaniaHint(ingredients) + boron * 0.4) / 20, 0, 1)
  const variegation = clamp((rutile * 0.75 + iron * 0.35 + copper * 0.45) / 10, 0, 1)
  const chromaShift = clamp((cobalt * 0.05 + copper * 0.03) - (iron * 0.01 + rutile * 0.008), -0.3, 0.3)

  const stabilityBias = stability === 'Low' ? 0.12 : stability === 'Medium' ? 0.05 : -0.04
  const foodSafeBias = foodSafe ? -0.08 : 0

  return {
    flow: clamp(flow + stabilityBias + foodSafeBias, 0.05, 1),
    gloss: clamp(chemistryGloss - (foodSafe ? 0.05 : 0), 0, 1),
    opacity: clamp(opacity + (foodSafe ? 0.03 : 0), 0, 1),
    speckle,
    crystal,
    variegation,
    chromaShift,
  }
}

function zincOrTitaniaHint(ingredients: IngredientMap | undefined) {
  return ingredientTotal(ingredients, ['Zinc Oxide', 'Titanium Dioxide', 'Rutile'])
}

function drawGlaze(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  surfaceFinish: string,
  effect: string,
  secondaryColor?: string,
  intensity: number = 50,
  recipeIngredients?: IngredientMap,
  firingTempC: number = 1222,
  stability: string = 'High',
  foodSafe: boolean = false,
) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) color = '#808080'
  const secHex = secondaryColor && /^#[0-9a-fA-F]{6}$/.test(secondaryColor) ? secondaryColor : null
  const t = intensity / 100   // 0 = subtle, 1 = heavy

  ctx.clearRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * 0.44
  const chemistry = deriveChemistry(recipeIngredients, firingTempC, stability, foodSafe)
  let { r, g, b } = hexToRgb(color)
  const neutralLift = 245
  r = mix(r, neutralLift, chemistry.opacity * 0.12)
  g = mix(g, neutralLift, chemistry.opacity * 0.12)
  b = mix(b, neutralLift, chemistry.opacity * 0.12)
  if (chemistry.chromaShift < 0) {
    const down = Math.abs(chemistry.chromaShift)
    r = mix(r, 128, down * 0.25)
    g = mix(g, 128, down * 0.25)
    b = mix(b, 128, down * 0.25)
  }
  const recipeSeed = recipeIngredients ? JSON.stringify(Object.entries(recipeIngredients).sort()) : 'no-recipe'
  const rng = seededRng(hashStr(color + surfaceFinish + effect + (secHex ?? '') + recipeSeed))

  // ── clip to disc ──────────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()

  // ── base fill ─────────────────────────────────────────────────
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, w, h)

  // More melt generally gives stronger vertical pooling and edge darkening.
  const poolStrength = clamp(chemistry.flow * 0.75, 0, 0.8)
  if (poolStrength > 0.05) {
    const pool = ctx.createLinearGradient(0, cy - radius, 0, cy + radius)
    pool.addColorStop(0, `rgba(255,255,255,${0.05 + poolStrength * 0.1})`)
    pool.addColorStop(0.55, 'rgba(255,255,255,0)')
    pool.addColorStop(1, `rgba(0,0,0,${0.08 + poolStrength * 0.25})`)
    ctx.fillStyle = pool
    ctx.fillRect(0, 0, w, h)
  }

  // ── effect layer (underneath the surface-finish sheen) ────────
  switch (effect) {
    case 'Speckled': {
      const sec2 = secHex ? hexToRgb(secHex) : null
      const dotCount = Math.round(60 + t * 300 + chemistry.speckle * 220)
      for (let i = 0; i < dotCount; i++) {
        const x = rng() * w
        const y = rng() * h
        const dotR = 0.5 + t * 2.5
        const a = (0.2 + rng() * 0.4) * (0.35 + t * 0.65)
        ctx.beginPath()
        ctx.arc(x, y, dotR, 0, Math.PI * 2)
        if (sec2 && rng() > 0.45) {
          ctx.fillStyle = `rgba(${sec2.r},${sec2.g},${sec2.b},${a})`
        } else {
          const dark = rng() > 0.12
          ctx.fillStyle = dark
            ? `rgba(${Math.max(0, r - 70)},${Math.max(0, g - 70)},${Math.max(0, b - 70)},${a})`
            : `rgba(255,255,255,${a * 0.45})`
        }
        ctx.fill()
      }
      break
    }

    case 'Crystalline': {
      const count = Math.round(2 + t * 9 + chemistry.crystal * 8)
      for (let c = 0; c < count; c++) {
        const kx = cx + (rng() - 0.5) * radius * 1.6
        const ky = cy + (rng() - 0.5) * radius * 1.6
        const kr = (8 + rng() * 20) * (0.4 + t * 0.9)   // size scales with intensity
        const rays = 6 + Math.floor(rng() * 4)
        const rot = rng() * Math.PI
        const facetAlpha = 0.06 + t * 0.22
        for (let i = 0; i < rays; i++) {
          const a1 = rot + (i / rays) * Math.PI * 2
          const a2 = rot + ((i + 1) / rays) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(kx, ky)
          ctx.lineTo(kx + Math.cos(a1) * kr, ky + Math.sin(a1) * kr)
          ctx.lineTo(kx + Math.cos(a2) * kr, ky + Math.sin(a2) * kr)
          ctx.closePath()
          const sec3 = secHex ? hexToRgb(secHex) : null
          if (i % 2 === 0 && sec3) {
            ctx.fillStyle = `rgba(${sec3.r},${sec3.g},${sec3.b},${facetAlpha * 2.2})`
          } else {
            ctx.fillStyle = i % 2 === 0
              ? `rgba(255,255,255,${facetAlpha * 1.4})`
              : `rgba(0,0,0,${facetAlpha})`
          }
          ctx.fill()
        }
        const cg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * 0.7)
        cg.addColorStop(0, `rgba(255,255,255,${0.15 + t * 0.25})`)
        cg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = cg
        ctx.beginPath()
        ctx.arc(kx, ky, kr * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'Variegated': {
      const sec4 = secHex ? hexToRgb(secHex) : null
      const streakAlpha = 0.03 + t * 0.14 + chemistry.variegation * 0.12
      const spotCount = Math.round(6 + t * 20 + chemistry.variegation * 20)
      for (let i = 0; i < 12; i++) {
        const x0 = rng() * w
        const x1 = x0 + (rng() - 0.5) * 60
        const sg = ctx.createLinearGradient(x0, 0, x1, h)
        if (sec4 && rng() > 0.35) {
          sg.addColorStop(0, 'rgba(0,0,0,0)')
          sg.addColorStop(0.3, `rgba(${sec4.r},${sec4.g},${sec4.b},${streakAlpha})`)
          sg.addColorStop(0.7, `rgba(${sec4.r},${sec4.g},${sec4.b},${streakAlpha * 0.6})`)
          sg.addColorStop(1, 'rgba(0,0,0,0)')
        } else {
          const bright = rng() > 0.45
          sg.addColorStop(0, 'rgba(255,255,255,0)')
          sg.addColorStop(0.3, `rgba(${bright ? 255 : 0},${bright ? 255 : 0},${bright ? 255 : 0},${streakAlpha})`)
          sg.addColorStop(0.7, `rgba(${bright ? 255 : 0},${bright ? 255 : 0},${bright ? 255 : 0},${streakAlpha * 0.6})`)
          sg.addColorStop(1, 'rgba(255,255,255,0)')
        }
        ctx.fillStyle = sg
        ctx.fillRect(0, 0, w, h)
      }
      // rutile / iron spots
      for (let i = 0; i < spotCount; i++) {
        const sx = rng() * w
        const sy = rng() * h
        const sr = 2 + rng() * 5
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        const spotR = sec4 ? sec4.r : Math.min(255, r + 60)
        const spotG = sec4 ? sec4.g : Math.max(0, g - 20)
        const spotB = sec4 ? sec4.b : 0
        sg.addColorStop(0, `rgba(${spotR},${spotG},${spotB},${(0.15 + rng() * 0.2) * (0.3 + t * 0.7)})`)
        sg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.arc(sx, sy, sr, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'Opaque': {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + t * 0.24 + chemistry.opacity * 0.28})`
      ctx.fillRect(0, 0, w, h)
      const blobCount = Math.round(2 + t * 5)
      for (let i = 0; i < blobCount; i++) {
        const ox = cx + (rng() - 0.5) * radius
        const oy = cy + (rng() - 0.5) * radius
        const or2 = 18 + rng() * 38
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or2)
        og.addColorStop(0, `rgba(255,255,255,${0.06 + t * 0.1})`)
        og.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = og
        ctx.beginPath()
        ctx.arc(ox, oy, or2, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'Translucent': {
      const haze = clamp(0.08 + t * 0.28 + chemistry.opacity * 0.15, 0.06, 0.45)
      ctx.fillStyle = `rgba(255,255,255,${haze})`
      ctx.fillRect(0, 0, w, h)
      const tg = ctx.createLinearGradient(0, 0, w * 0.5, h * 0.5)
      tg.addColorStop(0, `rgba(255,255,255,${0.06 + t * 0.22})`)
      tg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = tg
      ctx.fillRect(0, 0, w, h)
      break
    }

    case 'Melt': {
      const melt = secHex ? hexToRgb(secHex) : { r: Math.min(255, r + 80), g: Math.max(0, g - 30), b: Math.max(0, b - 30) }
      const numDrips = Math.round(1 + t * 6 + chemistry.flow * 5)
      for (let d = 0; d < numDrips; d++) {
        const ax = cx + (rng() - 0.5) * radius * 1.2
        const startY = cy - radius * (0.5 + rng() * 0.45)
        const dripLen = radius * (0.3 + t * 0.8 + chemistry.flow * 0.55)
        const endY = Math.min(startY + dripLen, cy + radius * 0.92)
        const topW = 5 + rng() * 10
        const tipW = 0.5 + rng() * 2
        const alpha = (0.3 + rng() * 0.3) * (0.4 + t * 0.6)
        ctx.beginPath()
        ctx.moveTo(ax - topW, startY)
        ctx.bezierCurveTo(
          ax - topW * 0.6, startY + dripLen * 0.55,
          ax - tipW,       endY - dripLen * 0.18,
          ax,              endY,
        )
        ctx.bezierCurveTo(
          ax + tipW,       endY - dripLen * 0.18,
          ax + topW * 0.6, startY + dripLen * 0.55,
          ax + topW,       startY,
        )
        ctx.closePath()
        const dg = ctx.createLinearGradient(ax, startY, ax, endY)
        dg.addColorStop(0,    `rgba(${melt.r},${melt.g},${melt.b},${alpha})`)
        dg.addColorStop(0.78, `rgba(${melt.r},${melt.g},${melt.b},${alpha * 0.6})`)
        dg.addColorStop(1,    `rgba(${melt.r},${melt.g},${melt.b},0)`)
        ctx.fillStyle = dg
        ctx.fill()
        const blobR = tipW * 2.2 + rng() * 3
        const bg2 = ctx.createRadialGradient(ax, endY, 0, ax, endY, blobR)
        bg2.addColorStop(0, `rgba(${melt.r},${melt.g},${melt.b},${alpha * 0.9})`)
        bg2.addColorStop(1, `rgba(${melt.r},${melt.g},${melt.b},0)`)
        ctx.beginPath()
        ctx.arc(ax, endY, blobR, 0, Math.PI * 2)
        ctx.fillStyle = bg2
        ctx.fill()
      }
      const poolH = (8 + rng() * 14) * (0.2 + t * 0.8)
      const pg = ctx.createLinearGradient(0, cy + radius - poolH, 0, cy + radius)
      pg.addColorStop(0, `rgba(${melt.r},${melt.g},${melt.b},0)`)
      pg.addColorStop(1, `rgba(${melt.r},${melt.g},${melt.b},${0.2 + t * 0.4})`)
      ctx.fillStyle = pg
      ctx.fillRect(0, cy + radius - poolH, w, poolH)
      break
    }

    case 'Flame': {
      // Flame color: use secondary, else derive a lighter/shifted tone from base
      const flameRgb = secHex
        ? hexToRgb(secHex)
        : { r: Math.min(255, r + 90), g: Math.min(255, g + 60), b: Math.max(0, b - 40) }
      const flameCount = Math.round(3 + t * 9 + chemistry.flow * 4)

      for (let f = 0; f < flameCount; f++) {
        // anchor along bottom third of the disc, spread across width
        const ax = cx + (rng() - 0.5) * radius * 1.5
        const baseY = cy + radius * (0.1 + rng() * 0.6)  // root near bottom
        const flameH = radius * (0.35 + t * 0.85)        // height scales with intensity
        const tipX  = ax + (rng() - 0.5) * 28            // slight lateral drift at tip
        const tipY  = baseY - flameH
        const halfW = 4 + rng() * 9                       // base half-width
        const ctrlLean = (rng() - 0.5) * 20

        // left edge of flame
        const lx1 = ax - halfW + ctrlLean
        const ly1 = baseY - flameH * 0.45
        // right edge of flame
        const rx1 = ax + halfW + ctrlLean
        const ry1 = baseY - flameH * 0.45

        ctx.beginPath()
        ctx.moveTo(ax - halfW, baseY)
        ctx.bezierCurveTo(lx1, ly1, tipX - 3, tipY + flameH * 0.15, tipX, tipY)
        ctx.bezierCurveTo(tipX + 3, tipY + flameH * 0.15, rx1, ry1, ax + halfW, baseY)
        ctx.closePath()

        const alpha = (0.22 + rng() * 0.38) * (0.3 + t * 0.7)
        const fg = ctx.createLinearGradient(ax, baseY, tipX, tipY)
        fg.addColorStop(0,    `rgba(${flameRgb.r},${flameRgb.g},${flameRgb.b},${alpha})`)
        fg.addColorStop(0.55, `rgba(${flameRgb.r},${flameRgb.g},${flameRgb.b},${alpha * 0.7})`)
        fg.addColorStop(1,    `rgba(${flameRgb.r},${flameRgb.g},${flameRgb.b},0)`)
        ctx.fillStyle = fg
        ctx.fill()

        // inner bright core — white-hot center streak
        const coreW = halfW * 0.28
        ctx.beginPath()
        ctx.moveTo(ax - coreW, baseY)
        ctx.bezierCurveTo(ax - coreW + ctrlLean * 0.5, ly1, tipX - 1, tipY + flameH * 0.22, tipX, tipY)
        ctx.bezierCurveTo(tipX + 1, tipY + flameH * 0.22, ax + coreW + ctrlLean * 0.5, ry1, ax + coreW, baseY)
        ctx.closePath()
        const cg2 = ctx.createLinearGradient(ax, baseY, tipX, tipY)
        cg2.addColorStop(0,   `rgba(255,255,255,${alpha * 0.55})`)
        cg2.addColorStop(0.6, `rgba(255,255,255,${alpha * 0.15})`)
        cg2.addColorStop(1,   'rgba(255,255,255,0)')
        ctx.fillStyle = cg2
        ctx.fill()
      }

      // scattered metallic reduction spots (gold/copper glints)
      const spotCount = Math.round(5 + t * 20)
      for (let i = 0; i < spotCount; i++) {
        const sx = cx + (rng() - 0.5) * radius * 1.8
        const sy = cy + (rng() - 0.5) * radius * 1.8
        const sr = 1.2 + rng() * 3.5
        const sg2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        // warm gold glint
        sg2.addColorStop(0, `rgba(210,170,60,${(0.3 + rng() * 0.45) * (0.3 + t * 0.7)})`)
        sg2.addColorStop(1, 'rgba(210,170,60,0)')
        ctx.fillStyle = sg2
        ctx.beginPath()
        ctx.arc(sx, sy, sr, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
  }

  // ── surface-finish sheen ──────────────────────────────────────
  const finishTarget =
    surfaceFinish === 'Glossy' ? 0.92 : surfaceFinish === 'Satin' ? 0.55 : 0.2
  const effectiveGloss = clamp((finishTarget + chemistry.gloss) / 2, 0, 1)

  if (effectiveGloss > 0.72) {
    const bg = ctx.createRadialGradient(cx - radius * 0.22, cy - radius * 0.22, 0, cx, cy, radius)
    bg.addColorStop(0, `rgba(255,255,255,${0.2 + effectiveGloss * 0.2})`)
    bg.addColorStop(0.38, 'rgba(255,255,255,0.04)')
    bg.addColorStop(1, `rgba(0,0,0,${0.18 + effectiveGloss * 0.16})`)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    // specular highlight
    const spec = ctx.createRadialGradient(
      cx - radius * 0.37, cy - radius * 0.37, 0,
      cx - radius * 0.37, cy - radius * 0.37, radius * 0.19,
    )
    spec.addColorStop(0, `rgba(255,255,255,${0.6 + effectiveGloss * 0.35})`)
    spec.addColorStop(0.45, `rgba(255,255,255,${0.16 + effectiveGloss * 0.2})`)
    spec.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = spec
    ctx.fillRect(0, 0, w, h)
  } else if (effectiveGloss > 0.38) {
    const sg = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.15, 0, cx, cy, radius)
    sg.addColorStop(0, `rgba(255,255,255,${0.1 + effectiveGloss * 0.18})`)
    sg.addColorStop(0.48, 'rgba(255,255,255,0.02)')
    sg.addColorStop(1, `rgba(0,0,0,${0.1 + (1 - effectiveGloss) * 0.18})`)
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, w, h)
  } else {
    // Matte — almost flat, just a gentle edge shadow
    const mg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    mg.addColorStop(0.55, 'rgba(255,255,255,0)')
    mg.addColorStop(1, 'rgba(0,0,0,0.12)')
    ctx.fillStyle = mg
    ctx.fillRect(0, 0, w, h)
  }

  ctx.restore()

  // ── inner rim shadow (3-D depth) ──────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  const rim = ctx.createRadialGradient(cx, cy, radius * 0.82, cx, cy, radius)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = rim
  ctx.fill()
  ctx.strokeStyle = 'rgba(60,40,20,0.18)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

export function GlazePreview({
  color,
  surfaceFinish,
  effect,
  secondaryColor,
  intensity = 50,
  recipeIngredients,
  selectedRecipeName,
  firingTempC,
  stability,
  foodSafe,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawGlaze(
      ctx,
      canvas.width,
      canvas.height,
      color,
      surfaceFinish,
      effect,
      secondaryColor,
      intensity,
      recipeIngredients,
      firingTempC,
      stability,
      foodSafe,
    )
  }, [color, surfaceFinish, effect, secondaryColor, intensity, recipeIngredients, firingTempC, stability, foodSafe])

  return (
    <div className="glaze-preview-wrap">
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        className="glaze-preview-canvas"
        aria-label="Glaze appearance preview"
      />
      <p className="glaze-preview-caption">
        {recipeIngredients ? 'Preview (calibrated to top recipe)' : 'Preview (input estimate)'}
      </p>
      {selectedRecipeName ? (
        <p className="glaze-preview-selected">Selected: {selectedRecipeName}</p>
      ) : null}
    </div>
  )
}
