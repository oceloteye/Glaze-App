import { useEffect, useRef } from 'react'
import { ironRedStrength } from './lib/glazeColor'

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
  opacity?: string
  foodSafe?: boolean
  coneLabel?: string
  atmosphere?: string
  /** Overrides the default "Calibrated to top recipe" / "Estimate from inputs" caption. */
  caption?: string
}

const PREVIEW_SIZE = 240
const TILE_CORNER = 22
const TILE_RGB = { r: 226, g: 211, b: 190 }

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
  opacityTarget: string,
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
  const opacityBias = opacityTarget === 'Opaque' ? 0.3 : opacityTarget === 'Translucent' ? -0.2 : 0
  // how far the glaze will move in the kiln: the stability target dominates, recipe chemistry nudges it
  const stabilityMelt = stability === 'Low' ? 0.85 : stability === 'Medium' ? 0.4 : 0.08

  return {
    flow: clamp(flow + stabilityBias + foodSafeBias, 0.05, 1),
    melt: clamp(stabilityMelt + (flow - 0.5) * 0.3, 0, 1),
    gloss: clamp(chemistryGloss - (foodSafe ? 0.05 : 0), 0, 1),
    opacity: clamp(opacity + opacityBias + (foodSafe ? 0.03 : 0), 0, 1),
    speckle,
    crystal,
    variegation,
    chromaShift,
  }
}

function zincOrTitaniaHint(ingredients: IngredientMap | undefined) {
  return ingredientTotal(ingredients, ['Zinc Oxide', 'Titanium Dioxide', 'Rutile'])
}

type Rgb = { r: number; g: number; b: number }
type Rgba = [number, number, number, number]

/** Smooth 2D value noise on a seeded, wrapping lattice with fBm octaves. Inputs in unit space. */
function makeNoise(rng: () => number, grid: number) {
  const lattice = new Float32Array(grid * grid)
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng()
  const fade = (v: number) => v * v * (3 - 2 * v)
  const at = (ix: number, iy: number) =>
    lattice[(((iy % grid) + grid) % grid) * grid + (((ix % grid) + grid) % grid)]
  const sample = (x: number, y: number) => {
    const gx = x * grid
    const gy = y * grid
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const fx = fade(gx - x0)
    const fy = fade(gy - y0)
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx
    return top + (bottom - top) * fy
  }
  return (x: number, y: number, octaves: number) => {
    let value = 0
    let amplitude = 0.5
    let frequency = 1
    let total = 0
    for (let o = 0; o < octaves; o++) {
      value += sample(x * frequency, y * frequency) * amplitude
      total += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return value / total
  }
}

/** Rasterises `shade` onto a small offscreen canvas; drawn scaled up so it is smoothed for free. */
function noiseLayer(size: number, shade: (x: number, y: number) => Rgba) {
  const layer = document.createElement('canvas')
  layer.width = size
  layer.height = size
  const lctx = layer.getContext('2d')
  if (!lctx) return null
  const image = lctx.createImageData(size, size)
  const data = image.data
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const [cr, cg, cb, ca] = shade((px + 0.5) / size, (py + 0.5) / size)
      const i = (py * size + px) * 4
      data[i] = cr
      data[i + 1] = cg
      data[i + 2] = cb
      data[i + 3] = Math.round(clamp(ca, 0, 1) * 255)
    }
  }
  lctx.putImageData(image, 0, 0)
  return layer
}

function paintLayer(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement | null, w: number, h: number) {
  if (layer) ctx.drawImage(layer, 0, 0, w, h)
}

/** A run hanging off the bottom of the dab: centre offset from cx, half-width and depth, all in px. */
type Lobe = { x: number; w: number; d: number }

/** Extra sag of the lower outline at horizontal offset `dx` from the centre. */
function lobeDepth(lobes: Lobe[], dx: number) {
  let d = 0
  for (const l of lobes) {
    const u = (dx - l.x) / l.w
    if (Math.abs(u) > 3.2) continue
    // flat-bottomed tongue with a long, shallow tail so it fillets into the pool
    d += l.d * (0.8 * Math.exp(-1.2 * u * u * u * u) + 0.2 * Math.exp(-(u * u) / 3.24))
  }
  return d
}

/** Lower outline of the dab sampled left→right, including sag and any runs. */
function lowerEdge(cx: number, cy: number, radius: number, sag: number, lobes: Lobe[]) {
  const steps = 96
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const dx = -radius + (2 * radius * i) / steps
    const base = Math.sqrt(Math.max(0, radius * radius - dx * dx)) * (1 + sag)
    // runs fade out toward the sides so the outline still meets the circle cleanly
    const sideFade = clamp(1 - Math.pow(Math.abs(dx) / radius, 6), 0, 1)
    pts.push({ x: cx + dx, y: cy + base + lobeDepth(lobes, dx) * sideFade })
  }
  return pts
}

/** A few runs of mixed size: one hero, one medium, and short lobes that barely leave the pool. */
function makeLobes(radius: number, melt: number, flow: number, maxDepth: number, rng: () => number) {
  const count = 3 + Math.round(rng() * 1.5 + flow)
  const span = 1.3
  const slot = span / count
  const order = Array.from({ length: count }, (_, i) => i).sort(() => rng() - 0.5)
  const push = melt * (0.8 + flow * 0.4)
  return order.map<Lobe>((i, k) => {
    const x = (-span / 2 + slot * (i + 0.15 + rng() * 0.7)) * radius
    const w = radius * (0.09 + rng() * 0.09) * (k === 0 ? 1.25 : 1)
    const reach = k === 0 ? 0.42 + rng() * 0.22 : k === 1 ? 0.16 + rng() * 0.14 : 0.03 + rng() * 0.08
    return { x, w, d: Math.min(maxDepth, radius * reach * push) }
  })
}

/** Thick-glass shading for each run: deeper tone toward the tip, lit shoulder, dark meniscus. */
function shadeLobes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sag: number,
  lobes: Lobe[],
  gloss: number,
) {
  for (const l of lobes) {
    if (l.d < radius * 0.05) continue
    const ax = cx + l.x
    const edgeY = cy + Math.sqrt(Math.max(0, radius * radius - l.x * l.x)) * (1 + sag)
    const tipY = edgeY + lobeDepth(lobes, l.x)
    const span = tipY - edgeY
    // glass thickens toward the tip
    const body = ctx.createLinearGradient(0, edgeY - l.w * 0.5, 0, tipY)
    body.addColorStop(0, 'rgba(0,0,0,0)')
    body.addColorStop(0.65, 'rgba(0,0,0,0.08)')
    body.addColorStop(1, 'rgba(0,0,0,0.26)')
    ctx.fillStyle = body
    ctx.fillRect(ax - l.w * 2.6, edgeY - l.w * 0.5, l.w * 5.2, span + l.w)
    // rounded sides: shade the flank away from the light, lift the one toward it
    const flank = ctx.createLinearGradient(ax - l.w * 1.1, 0, ax + l.w * 1.1, 0)
    flank.addColorStop(0, 'rgba(255,255,255,0.08)')
    flank.addColorStop(0.35, 'rgba(255,255,255,0)')
    flank.addColorStop(0.7, 'rgba(0,0,0,0)')
    flank.addColorStop(1, 'rgba(0,0,0,0.22)')
    ctx.fillStyle = flank
    ctx.fillRect(ax - l.w * 1.1, edgeY + l.w * 0.2, l.w * 2.2, span)
    // lit shoulder on the swelling tip
    const hl = ctx.createRadialGradient(ax - l.w * 0.3, tipY - l.w * 0.95, 0, ax - l.w * 0.2, tipY - l.w * 0.8, l.w * 0.9)
    hl.addColorStop(0, `rgba(255,255,255,${0.14 + gloss * 0.3})`)
    hl.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hl
    ctx.fillRect(ax - l.w * 1.5, tipY - l.w * 2, l.w * 3, l.w * 2)
    // meniscus: the underside of the bead goes dark
    const men = ctx.createLinearGradient(0, tipY - l.w * 0.7, 0, tipY)
    men.addColorStop(0, 'rgba(0,0,0,0)')
    men.addColorStop(1, 'rgba(0,0,0,0.38)')
    ctx.fillStyle = men
    ctx.fillRect(ax - l.w * 1.6, tipY - l.w * 0.7, l.w * 3.2, l.w * 0.7)
  }
}

/** Glaze dab outline; `sag` stretches the lower half so a fluid melt visibly slumps, `lobes` hang runs off it. */
function discPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, sag: number, lobes: Lobe[] = []) {
  ctx.beginPath()
  ctx.arc(cx, cy, radius, Math.PI, 0)
  if (lobes.length === 0) {
    ctx.ellipse(cx, cy, radius, radius * (1 + sag), 0, 0, Math.PI)
  } else {
    const edge = lowerEdge(cx, cy, radius, sag, lobes)
    for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(edge[i].x, edge[i].y)
  }
  ctx.closePath()
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Bisque tile the glaze sits on: warm buff gradient with a light grog speckle. */
function drawTile(ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number) {
  roundedRectPath(ctx, 0, 0, w, h, TILE_CORNER)
  const base = ctx.createLinearGradient(0, 0, w * 0.4, h)
  base.addColorStop(0, `rgb(${TILE_RGB.r + 10},${TILE_RGB.g + 10},${TILE_RGB.b + 10})`)
  base.addColorStop(1, `rgb(${TILE_RGB.r - 14},${TILE_RGB.g - 16},${TILE_RGB.b - 18})`)
  ctx.fillStyle = base
  ctx.fill()

  ctx.save()
  ctx.clip()
  for (let i = 0; i < 260; i++) {
    const x = rng() * w
    const y = rng() * h
    const dark = rng() > 0.3
    ctx.fillStyle = dark ? `rgba(120,90,60,${0.05 + rng() * 0.08})` : `rgba(255,255,255,${0.12 + rng() * 0.18})`
    ctx.beginPath()
    ctx.arc(x, y, 0.5 + rng() * 1.1, 0, Math.PI * 2)
    ctx.fill()
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(70,45,25,0.16)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, TILE_CORNER)
  ctx.strokeStyle = 'rgba(90,60,35,0.22)'
  ctx.lineWidth = 1
  ctx.stroke()
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
  opacityTarget: string = 'Semi-opaque',
  foodSafe: boolean = false,
  reduction: boolean = false,
) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) color = '#808080'
  const secHex = secondaryColor && /^#[0-9a-fA-F]{6}$/.test(secondaryColor) ? secondaryColor : null
  const t = intensity / 100   // 0 = subtle, 1 = heavy

  ctx.clearRect(0, 0, w, h)

  const chemistry = deriveChemistry(recipeIngredients, firingTempC, stability, opacityTarget, foodSafe)
  const ironRed = recipeIngredients ? ironRedStrength(recipeIngredients, reduction, firingTempC) : 0
  const melt = chemistry.melt
  // a fluid dab slumps and runs, so it is set smaller and higher to leave room for the tongues
  const cx = w / 2
  const radius = Math.min(w, h) * 0.37 * (1 - melt * 0.12)
  const cy = h / 2 - radius * melt * 0.36
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
  const rng = seededRng(hashStr(color + surfaceFinish + effect + (secHex ?? '') + stability + opacityTarget + recipeSeed))
  const sag = melt * 0.22
  const bottomY = cy + radius * (1 + sag)
  // a fluid glaze runs off the dab as a few tongues that are part of the same outline
  const lobes = melt > 0.55 ? makeLobes(radius, melt, chemistry.flow, h - 8 - bottomY, rng) : []

  drawTile(ctx, w, h, seededRng(hashStr('tile')))

  // ── drop shadow under the glaze dab ───────────────────────────────
  ctx.save()
  ctx.shadowColor = 'rgba(50,30,15,0.35)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.fillStyle = `rgb(${r},${g},${b})`
  discPath(ctx, cx, cy, radius, sag, lobes)
  ctx.fill()
  ctx.restore()

  // ── clip to disc ──────────────────────────────────────────────
  ctx.save()
  discPath(ctx, cx, cy, radius, sag, lobes)
  ctx.clip()

  // ── base fill ─────────────────────────────────────────────────
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, w, h)

  // More melt generally gives stronger vertical pooling and edge darkening.
  const poolStrength = clamp(chemistry.flow * 0.75, 0, 0.8)
  if (poolStrength > 0.05) {
    const pool = ctx.createLinearGradient(0, cy - radius, 0, bottomY)
    pool.addColorStop(0, `rgba(255,255,255,${0.05 + poolStrength * 0.1})`)
    pool.addColorStop(0.55, 'rgba(255,255,255,0)')
    pool.addColorStop(1, `rgba(0,0,0,${0.08 + poolStrength * 0.25})`)
    ctx.fillStyle = pool
    ctx.fillRect(0, 0, w, h)
  }

  // ── opacity: a property of the glaze, drawn under any colour effect ──
  if (opacityTarget === 'Opaque') {
    ctx.fillStyle = `rgba(255,252,246,${0.2 + chemistry.opacity * 0.25})`
    ctx.fillRect(0, 0, w, h)
    const cloudNoise = makeNoise(rng, 4)
    paintLayer(
      ctx,
      noiseLayer(96, (x, y) => {
        const n = cloudNoise(x, y, 3)
        return n > 0.5 ? [255, 253, 248, (n - 0.5) * 0.45] : [60, 45, 30, (0.5 - n) * 0.12]
      }),
      w,
      h,
    )
    // fine orange-peel texture from the opacifier
    const peelNoise = makeNoise(rng, 24)
    paintLayer(
      ctx,
      noiseLayer(160, (x, y) => {
        const n = peelNoise(x, y, 2)
        return n > 0.5 ? [255, 255, 255, (n - 0.5) * 0.16] : [0, 0, 0, (0.5 - n) * 0.1]
      }),
      w,
      h,
    )
  } else if (opacityTarget === 'Translucent') {
    const thicknessNoise = makeNoise(rng, 5)
    const seeThrough = clamp(0.65 - chemistry.opacity * 0.4, 0.3, 0.7)
    // thin over the noise peaks and toward the top, so the clay reads through; pooled areas go deeper
    paintLayer(
      ctx,
      noiseLayer(128, (x, y) => {
        const thin = clamp(thicknessNoise(x, y, 3) * 0.7 + (1 - y) * 0.3, 0, 1)
        return thin > 0.5
          ? [TILE_RGB.r, TILE_RGB.g, TILE_RGB.b, (thin - 0.5) * 2 * seeThrough]
          : [Math.round(r * 0.6), Math.round(g * 0.6), Math.round(b * 0.6), (0.5 - thin) * 0.6 * seeThrough]
      }),
      w,
      h,
    )
    const tg = ctx.createLinearGradient(0, cy - radius, 0, bottomY)
    tg.addColorStop(0, 'rgba(255,255,255,0.18)')
    tg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = tg
    ctx.fillRect(0, 0, w, h)
  }

  // ── effect layer (underneath the surface-finish sheen) ────────
  switch (effect) {
    case 'Speckled': {
      const halo: Rgb = secHex ? hexToRgb(secHex) : { r: 150, g: 95, b: 55 }
      const field = makeNoise(rng, 6)
      // faint iron bleed under the specks
      paintLayer(ctx, noiseLayer(96, (x, y) => [120, 80, 50, (field(x, y, 3) - 0.5) * 0.2 * (0.5 + t)]), w, h)

      const dotCount = Math.round(50 + t * 230 + chemistry.speckle * 180)
      let placed = 0
      let tries = 0
      while (placed < dotCount && tries < dotCount * 4) {
        tries++
        const x = rng() * w
        const y = rng() * h
        // clump along the noise field instead of a flat scatter
        if (rng() > 0.35 + field(x / w, y / h, 2) * 0.9) continue
        placed++
        const size = (0.6 + rng() ** 2 * 3) * (0.55 + t * 0.7)
        const strength = (0.45 + rng() * 0.45) * (0.4 + t * 0.6)
        const bloom = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2)
        bloom.addColorStop(0, `rgba(${halo.r},${halo.g},${halo.b},${strength * 0.45})`)
        bloom.addColorStop(1, `rgba(${halo.r},${halo.g},${halo.b},0)`)
        ctx.fillStyle = bloom
        ctx.beginPath()
        ctx.arc(x, y, size * 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(32,20,12,${strength})`
        ctx.beginPath()
        ctx.ellipse(x, y, size, size * (0.75 + rng() * 0.25), rng() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
        if (size > 1.8) {
          ctx.fillStyle = `rgba(255,255,255,${strength * 0.35})`
          ctx.beginPath()
          ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }

    case 'Crystalline': {
      const tint: Rgb = secHex ? hexToRgb(secHex) : { r: 250, g: 244, b: 230 }
      const count = Math.round(2 + t * 7 + chemistry.crystal * 7)
      const drawRosette = (kx: number, ky: number, kr: number, detail: boolean) => {
        ctx.save()
        ctx.translate(kx, ky)
        ctx.rotate(rng() * Math.PI)
        ctx.scale(1, 0.8 + rng() * 0.2)
        // the melt around a crystal is depleted and reads slightly darker
        const depletion = ctx.createRadialGradient(0, 0, kr * 0.9, 0, 0, kr * 1.35)
        depletion.addColorStop(0, 'rgba(0,0,0,0.14)')
        depletion.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = depletion
        ctx.beginPath()
        ctx.arc(0, 0, kr * 1.35, 0, Math.PI * 2)
        ctx.fill()
        const body = ctx.createRadialGradient(0, 0, 0, 0, 0, kr)
        body.addColorStop(0, `rgba(${tint.r},${tint.g},${tint.b},${0.55 + t * 0.3})`)
        body.addColorStop(0.7, `rgba(${tint.r},${tint.g},${tint.b},${0.3 + t * 0.25})`)
        body.addColorStop(1, `rgba(${tint.r},${tint.g},${tint.b},0.05)`)
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.arc(0, 0, kr, 0, Math.PI * 2)
        ctx.fill()
        if (detail) {
          const needles = 36 + Math.floor(rng() * 40)
          ctx.lineCap = 'round'
          for (let i = 0; i < needles; i++) {
            const a = (i / needles) * Math.PI * 2 + (rng() - 0.5) * 0.08
            const len = kr * (0.7 + rng() * 0.35)
            ctx.strokeStyle =
              rng() > 0.4
                ? `rgba(255,255,255,${0.25 + t * 0.3})`
                : `rgba(${tint.r},${tint.g},${tint.b},${0.2 + t * 0.2})`
            ctx.lineWidth = 0.5 + rng() * 0.9
            ctx.beginPath()
            ctx.moveTo(Math.cos(a) * kr * 0.08, Math.sin(a) * kr * 0.08)
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len)
            ctx.stroke()
          }
          ctx.fillStyle = 'rgba(40,30,20,0.35)'
          ctx.beginPath()
          ctx.arc(0, 0, kr * 0.08, 0, Math.PI * 2)
          ctx.fill()
        }
        const cap = ctx.createRadialGradient(-kr * 0.2, -kr * 0.2, 0, -kr * 0.2, -kr * 0.2, kr * 0.5)
        cap.addColorStop(0, `rgba(255,255,255,${0.3 + t * 0.3})`)
        cap.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = cap
        ctx.beginPath()
        ctx.arc(0, 0, kr, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      for (let c = 0; c < count * 2; c++) {
        drawRosette(cx + (rng() - 0.5) * radius * 1.7, cy + (rng() - 0.5) * radius * 1.7, 2 + rng() * 4, false)
      }
      for (let c = 0; c < count; c++) {
        drawRosette(
          cx + (rng() - 0.5) * radius * 1.5,
          cy + (rng() - 0.5) * radius * 1.5,
          (9 + rng() * 22) * (0.45 + t * 0.85),
          true,
        )
      }
      break
    }

    case 'Variegated': {
      const flowNoise = makeNoise(rng, 5)
      const amount = clamp(0.25 + t * 0.5 + chemistry.variegation * 0.35, 0.2, 1)
      const cream: Rgb = { r: 252, g: 243, b: 222 }
      const shade: Rgb = secHex
        ? hexToRgb(secHex)
        : { r: Math.round(r * 0.55), g: Math.round(g * 0.62), b: Math.min(255, Math.round(b * 0.7 + 45)) }
      // stretched vertically so the two-phase break-up reads as flow
      const phase = (x: number, y: number) => flowNoise(x * 1.6, y * 0.7, 4)
      paintLayer(
        ctx,
        noiseLayer(128, (x, y) => {
          const n = phase(x, y)
          const light = clamp((n - 0.52) * 4, 0, 1)
          if (light > 0) return [cream.r, cream.g, cream.b, light * 0.7 * amount]
          return [shade.r, shade.g, shade.b, clamp((0.46 - n) * 4, 0, 1) * 0.55 * amount]
        }),
        w,
        h,
      )
      // seams where the phases meet
      paintLayer(
        ctx,
        noiseLayer(128, (x, y) => [50, 35, 25, clamp(1 - Math.abs(phase(x, y) - 0.49) / 0.025, 0, 1) * 0.28 * amount]),
        w,
        h,
      )
      // titania crystals glint in the lighter phase
      const spotCount = Math.round(4 + t * 14 + chemistry.variegation * 14)
      for (let i = 0; i < spotCount; i++) {
        const sx = rng() * w
        const sy = rng() * h
        if (phase(sx / w, sy / h) < 0.5) continue
        const sr = 2 + rng() * 4
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        sg.addColorStop(0, `rgba(255,252,240,${(0.3 + rng() * 0.3) * amount})`)
        sg.addColorStop(1, 'rgba(255,252,240,0)')
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.arc(sx, sy, sr, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'Flame': {
      const flameRgb: Rgb = secHex
        ? hexToRgb(secHex)
        : { r: Math.min(255, r + 110), g: Math.min(255, Math.round(g * 0.55 + 60)), b: Math.max(0, Math.round(b * 0.5) - 30) }
      const ember: Rgb = {
        r: Math.min(255, flameRgb.r + 30),
        g: Math.min(255, Math.round(flameRgb.g * 0.85 + 40)),
        b: Math.max(0, Math.round(flameRgb.b * 0.6)),
      }
      const heat = 0.45 + t * 0.55
      const flameNoise = makeNoise(rng, 6)
      // flashing climbs from the foot in ragged columns; carbon trap darkens where it did not reach
      paintLayer(
        ctx,
        noiseLayer(144, (x, y) => {
          const n = flameNoise(x * 2.4, y * 0.5 + 0.3, 4)
          const rise = clamp((y - 0.1) / 0.7, 0, 1)
          const lick = clamp((n - 0.38) * 2.6, 0, 1) * rise
          if (lick > 0.02) return [flameRgb.r, flameRgb.g, flameRgb.b, lick * 0.85 * heat]
          const soot = clamp((0.5 - n) * 2, 0, 1) * (1 - rise * 0.6)
          return [20, 14, 12, soot * 0.3 * heat]
        }),
        w,
        h,
      )

      // tongues of flame: a soft blurred body, then a crisper hot core on top
      const flameCount = Math.round(4 + t * 6 + chemistry.flow * 3)
      const tongues: { ax: number; baseY: number; tipX: number; tipY: number; halfW: number; lean: number; alpha: number }[] = []
      for (let f = 0; f < flameCount; f++) {
        const ax = cx + (rng() - 0.5) * radius * 1.6
        const baseY = cy + radius * (0.5 + rng() * 0.55)
        const flameH = radius * (0.6 + rng() * 0.4 + t * 0.9)
        tongues.push({
          ax,
          baseY,
          tipX: ax + (rng() - 0.5) * 40,
          tipY: baseY - flameH,
          halfW: 7 + rng() * 11,
          lean: (rng() - 0.5) * 30,
          alpha: (0.35 + rng() * 0.35) * heat,
        })
      }
      const tonguePath = (tg: (typeof tongues)[number], scale: number) => {
        const flameH = tg.baseY - tg.tipY
        const hw = tg.halfW * scale
        const ly = tg.baseY - flameH * 0.45
        const tipY = tg.tipY + flameH * (1 - scale) * 0.35
        ctx.beginPath()
        ctx.moveTo(tg.ax - hw, tg.baseY)
        ctx.bezierCurveTo(tg.ax - hw + tg.lean, ly, tg.tipX - 2 * scale, tipY + flameH * 0.15, tg.tipX, tipY)
        ctx.bezierCurveTo(tg.tipX + 2 * scale, tipY + flameH * 0.15, tg.ax + hw + tg.lean, ly, tg.ax + hw, tg.baseY)
        ctx.closePath()
      }
      ctx.save()
      if ('filter' in ctx) ctx.filter = `blur(${3 + t * 3}px)`
      for (const tg of tongues) {
        tonguePath(tg, 1)
        const fg = ctx.createLinearGradient(tg.ax, tg.baseY, tg.tipX, tg.tipY)
        fg.addColorStop(0, `rgba(${flameRgb.r},${flameRgb.g},${flameRgb.b},${tg.alpha})`)
        fg.addColorStop(0.65, `rgba(${flameRgb.r},${flameRgb.g},${flameRgb.b},${tg.alpha * 0.55})`)
        fg.addColorStop(1, `rgba(${flameRgb.r},${flameRgb.g},${flameRgb.b},0)`)
        ctx.fillStyle = fg
        ctx.fill()
      }
      ctx.restore()
      ctx.save()
      if ('filter' in ctx) ctx.filter = `blur(${1 + t}px)`
      for (const tg of tongues) {
        tonguePath(tg, 0.4)
        const cg2 = ctx.createLinearGradient(tg.ax, tg.baseY, tg.tipX, tg.tipY)
        cg2.addColorStop(0, `rgba(${ember.r},${ember.g},${ember.b},${tg.alpha * 0.9})`)
        cg2.addColorStop(0.5, `rgba(255,232,190,${tg.alpha * 0.45})`)
        cg2.addColorStop(1, 'rgba(255,232,190,0)')
        ctx.fillStyle = cg2
        ctx.fill()
      }
      ctx.restore()

      // carbon trapping settles in the crown
      const smoke = ctx.createLinearGradient(0, cy - radius, 0, cy + radius * 0.15)
      smoke.addColorStop(0, `rgba(22,16,14,${0.28 * heat})`)
      smoke.addColorStop(0.6, `rgba(22,16,14,${0.1 * heat})`)
      smoke.addColorStop(1, 'rgba(22,16,14,0)')
      ctx.fillStyle = smoke
      ctx.fillRect(0, 0, w, h)

      // metallic glints where flux volatilised in the hottest zone
      const spotCount = Math.round(3 + t * 10)
      for (let i = 0; i < spotCount; i++) {
        const sx = cx + (rng() - 0.5) * radius * 1.6
        const sy = cy + radius * (0.1 + rng() * 0.8)
        const sr = 1 + rng() * 2.2
        const a = (0.3 + rng() * 0.4) * heat
        const glint = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr)
        glint.addColorStop(0, `rgba(255,240,200,${a})`)
        glint.addColorStop(0.6, `rgba(${ember.r},${ember.g},${ember.b},${a * 0.5})`)
        glint.addColorStop(1, `rgba(${ember.r},${ember.g},${ember.b},0)`)
        ctx.fillStyle = glint
        ctx.beginPath()
        ctx.arc(sx, sy, sr, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
  }

  // ── melt: a property of the glaze, not a colour effect. The same coat thinned
  // at the crown and piled up at the foot, scaled by how fluid the stability target is.
  if (melt > 0.15) {
    const topY = cy - radius
    const dripGloss = clamp(0.5 + chemistry.gloss * 0.5, 0.3, 1)
    const move = clamp(melt * 1.2, 0, 1.2)
    // striations build up non-linearly so a balanced glaze only hints at movement
    const streak = move * melt

    const thin = ctx.createLinearGradient(0, topY, 0, bottomY)
    thin.addColorStop(0, `rgba(${TILE_RGB.r},${TILE_RGB.g},${TILE_RGB.b},${clamp(0.32 * move, 0, 0.45)})`)
    thin.addColorStop(0.38, 'rgba(0,0,0,0)')
    ctx.fillStyle = thin
    ctx.fillRect(0, 0, w, h)
    // multiplying the glaze by itself deepens and saturates where the coat is thick
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const thick = ctx.createLinearGradient(0, topY, 0, bottomY)
    thick.addColorStop(0.3, `rgba(${r},${g},${b},0)`)
    thick.addColorStop(1, `rgba(${r},${g},${b},${clamp(0.55 * move, 0, 0.85)})`)
    ctx.fillStyle = thick
    ctx.fillRect(0, 0, w, h)
    ctx.restore()

    const streakNoise = makeNoise(rng, 6)
    const drift = makeNoise(rng, 3)
    paintLayer(
      ctx,
      noiseLayer(128, (x, y) => {
        const n = streakNoise(x * 2.8 + (drift(x, y, 2) - 0.5) * 0.6, y * 0.2, 3)
        const pull = clamp((y - 0.12) / 0.55, 0, 1)
        return n > 0.5
          ? [255, 255, 255, (n - 0.5) * 0.9 * pull * streak]
          : [0, 0, 0, (0.5 - n) * 0.8 * pull * streak]
      }),
      w,
      h,
    )

    // crawl spots near the crown where the melt pulled too thin to cover
    if (melt > 0.5) {
      const spots = Math.round((melt - 0.5) * 12)
      for (let i = 0; i < spots; i++) {
        const sx = cx + (rng() - 0.5) * radius * 1.4
        const sy = topY + radius * (0.08 + rng() * 0.5)
        const sr = 4 + rng() * 8
        const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        cg.addColorStop(0, `rgba(${TILE_RGB.r},${TILE_RGB.g},${TILE_RGB.b},${(0.2 + rng() * 0.2) * move})`)
        cg.addColorStop(1, `rgba(${TILE_RGB.r},${TILE_RGB.g},${TILE_RGB.b},0)`)
        ctx.fillStyle = cg
        ctx.beginPath()
        ctx.ellipse(sx, sy, sr, sr * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // meniscus at the foot: heavy dark roll with a soft glossy shoulder above it
    const poolH = radius * (0.1 + 0.3 * move)
    const pg = ctx.createLinearGradient(0, bottomY - poolH, 0, bottomY)
    pg.addColorStop(0, 'rgba(0,0,0,0)')
    pg.addColorStop(0.6, `rgba(0,0,0,${0.18 * move})`)
    pg.addColorStop(1, `rgba(0,0,0,${0.2 + 0.22 * move})`)
    ctx.fillStyle = pg
    ctx.fillRect(0, bottomY - poolH, w, poolH)
    const lip = ctx.createLinearGradient(0, bottomY - poolH * 1.5, 0, bottomY - poolH * 0.3)
    lip.addColorStop(0, 'rgba(255,255,255,0)')
    lip.addColorStop(0.45, `rgba(255,255,255,${dripGloss * 0.22 * move})`)
    lip.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = lip
    ctx.fillRect(0, bottomY - poolH * 1.5, w, poolH * 1.2)
  }

  // ── iron saturate: rust crystals grow where the coat is thick; it breaks to black where thin ──
  if (ironRed > 0.05) {
    const topY = cy - radius
    const grain = makeNoise(rng, 7)
    const black: Rgb = { r: 28, g: 16, b: 12 }
    const ember: Rgb = { r: 196, g: 84, b: 36 }
    paintLayer(
      ctx,
      noiseLayer(144, (x, y) => {
        // thickness: thin at the crown and toward the rim, thick at the foot; the grain mottles it
        const ny = (y * h - topY) / (bottomY - topY)
        const dx = (x * w - cx) / radius
        const dy = (y * h - cy) / radius
        const dist = Math.sqrt(dx * dx + dy * dy)
        // the rim is thinnest at the crown; the foot carries the heaviest glass
        const rimThin = clamp((dist - 0.6) / 0.4, 0, 1) * (1 - ny * 0.7)
        const thickness = clamp(ny * 0.8 + 0.1 - rimThin * 0.9 + (grain(x * 1.4, y * 0.8, 3) - 0.5) * 0.7, 0, 1)
        if (thickness < 0.42) return [black.r, black.g, black.b, clamp((0.42 - thickness) * 3, 0, 1) * 0.9 * ironRed]
        // crystalline bloom in the thick zones: a brighter rust that glints
        const bloom = clamp((grain(x * 3 + 7, y * 3 + 3, 2) - 0.52) * 4, 0, 1) * clamp((thickness - 0.5) * 2, 0, 1)
        return [ember.r, ember.g, ember.b, bloom * 0.7 * ironRed]
      }),
      w,
      h,
    )
  }

  // ── surface-finish sheen ──────────────────────────────────────
  const finishTarget =
    surfaceFinish === 'Glossy' ? 0.92 : surfaceFinish === 'Satin' ? 0.55 : 0.2
  const effectiveGloss = clamp((finishTarget + chemistry.gloss) / 2, 0, 1)

  if (lobes.length > 0) shadeLobes(ctx, cx, cy, radius, sag, lobes, effectiveGloss)

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

  // ── edge break: glaze thins at the rim and shows the clay through ──
  // (clipped to the plain outline: the runs are the thickest glass, so they don't break)
  // an iron saturate breaks to black instead of to bare clay
  const breakStrength = clamp(0.35 - chemistry.opacity * 0.3 + chemistry.flow * 0.15, 0.04, 0.4) * (1 - ironRed * 0.85)
  ctx.save()
  discPath(ctx, cx, cy, radius, sag)
  ctx.clip()
  const edge = ctx.createRadialGradient(cx, cy, radius * 0.86, cx, cy, radius)
  edge.addColorStop(0, `rgba(${TILE_RGB.r},${TILE_RGB.g},${TILE_RGB.b},0)`)
  edge.addColorStop(0.75, `rgba(${TILE_RGB.r},${TILE_RGB.g},${TILE_RGB.b},${breakStrength * 0.5})`)
  edge.addColorStop(1, `rgba(${TILE_RGB.r},${TILE_RGB.g},${TILE_RGB.b},${breakStrength})`)
  const rim = ctx.createRadialGradient(cx, cy, radius * 0.84, cx, cy, radius)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.22)')
  // the lower half is stretched with the sag so the rim gradients hug the real outline
  const fillRim = (style: CanvasGradient) => {
    ctx.fillStyle = style
    ctx.fillRect(0, 0, w, cy)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, cy, w, h - cy)
    ctx.clip()
    ctx.translate(cx, cy)
    ctx.scale(1, 1 + sag)
    ctx.translate(-cx, -cy)
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
  fillRim(edge)
  fillRim(rim)
  ctx.restore()

  // ── bevel: lit upper-left lip, shaded lower-right lip ─────────
  ctx.save()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, radius - 1, Math.PI * 0.95, Math.PI * 1.75)
  ctx.strokeStyle = `rgba(255,255,255,${0.18 + effectiveGloss * 0.3})`
  ctx.stroke()
  // the shaded lip follows the real lower outline, runs included
  ctx.save()
  ctx.beginPath()
  ctx.rect(cx - radius * 0.55, cy, w, h - cy)
  ctx.clip()
  ctx.translate(0, -1)
  discPath(ctx, cx, cy, radius, sag, lobes)
  ctx.strokeStyle = 'rgba(40,25,12,0.22)'
  ctx.stroke()
  ctx.restore()
  discPath(ctx, cx, cy, radius, sag, lobes)
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(60,40,20,0.3)'
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
  opacity,
  foodSafe,
  coneLabel,
  atmosphere,
  caption,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(PREVIEW_SIZE * dpr)
    canvas.height = Math.round(PREVIEW_SIZE * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawGlaze(
      ctx,
      PREVIEW_SIZE,
      PREVIEW_SIZE,
      color,
      surfaceFinish,
      effect,
      secondaryColor,
      intensity,
      recipeIngredients,
      firingTempC,
      stability,
      opacity,
      foodSafe,
      atmosphere?.toLowerCase() === 'reduction',
    )
  }, [color, surfaceFinish, effect, secondaryColor, intensity, recipeIngredients, firingTempC, stability, opacity, foodSafe, atmosphere])

  const validColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#808080'
  const meltLabel = stability === 'Low' ? 'Fluid melt' : stability === 'High' ? 'Stiff melt' : null
  const chips = [
    surfaceFinish,
    coneLabel,
    atmosphere,
    opacity && opacity !== 'Semi-opaque' ? opacity : null,
    meltLabel,
    effect && effect !== 'None' ? effect : null,
  ].filter(
    (chip): chip is string => Boolean(chip),
  )

  return (
    <div className="glaze-preview-wrap">
      <canvas
        ref={canvasRef}
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        className="glaze-preview-canvas"
        aria-label="Glaze appearance preview"
      />
      <div className="glaze-preview-meta">
        <span className="glaze-preview-swatch" style={{ background: validColor }} aria-hidden="true" />
        <span className="glaze-preview-hex">{validColor.toUpperCase()}</span>
        {chips.map((chip) => (
          <span key={chip} className="glaze-preview-chip">
            {chip}
          </span>
        ))}
      </div>
      <p className="glaze-preview-caption">
        {caption ?? (recipeIngredients ? 'Calibrated to top recipe' : 'Estimate from inputs')}
      </p>
      {selectedRecipeName ? (
        <p className="glaze-preview-selected">{selectedRecipeName}</p>
      ) : null}
    </div>
  )
}
