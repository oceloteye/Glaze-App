import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { createNoiseMap, sampleNoise } from '../lib/seededNoise'
import type { ClayBody, LightingPreset, MaterialProfile } from '../types/rendering'

interface Props {
  material: MaterialProfile
  seedKey: string
  lighting: LightingPreset
  clayBody: ClayBody
  effect: string
}

interface GlazeMaps {
  color: THREE.CanvasTexture
  roughness: THREE.CanvasTexture
  bump: THREE.CanvasTexture
  displacement: THREE.CanvasTexture
}

interface EffectTuning {
  speckleBoost: number
  crystalBoost: number
  variegationBoost: number
  poolingBoost: number
  edgeBreakBoost: number
  flameWarp: number
  roughnessOffset: number
  transmissionOffset: number
  clearcoatOffset: number
  bumpBoost: number
  displacementBoost: number
  opacityBias: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function toByte(value: number) {
  return Math.round(clamp(value, 0, 255))
}

function effectTuning(effect: string): EffectTuning {
  switch (effect.toLowerCase()) {
    case 'speckled':
      return {
        speckleBoost: 0.35,
        crystalBoost: -0.05,
        variegationBoost: 0.1,
        poolingBoost: 0,
        edgeBreakBoost: 0.08,
        flameWarp: 0,
        roughnessOffset: 0.05,
        transmissionOffset: -0.02,
        clearcoatOffset: -0.02,
        bumpBoost: 0.08,
        displacementBoost: 0.04,
        opacityBias: 0.05,
      }
    case 'crystalline':
      return {
        speckleBoost: -0.1,
        crystalBoost: 0.62,
        variegationBoost: 0.12,
        poolingBoost: 0.16,
        edgeBreakBoost: 0,
        flameWarp: 0,
        roughnessOffset: -0.11,
        transmissionOffset: 0.06,
        clearcoatOffset: 0.1,
        bumpBoost: 0.15,
        displacementBoost: 0.12,
        opacityBias: -0.06,
      }
    case 'variegated':
      return {
        speckleBoost: 0.04,
        crystalBoost: 0.02,
        variegationBoost: 0.45,
        poolingBoost: 0.08,
        edgeBreakBoost: 0.1,
        flameWarp: 0.18,
        roughnessOffset: 0,
        transmissionOffset: 0,
        clearcoatOffset: 0,
        bumpBoost: 0.05,
        displacementBoost: 0.03,
        opacityBias: 0,
      }
    case 'flame':
      return {
        speckleBoost: 0,
        crystalBoost: 0,
        variegationBoost: 0.48,
        poolingBoost: 0.22,
        edgeBreakBoost: 0.16,
        flameWarp: 0.9,
        roughnessOffset: 0.03,
        transmissionOffset: -0.01,
        clearcoatOffset: 0.02,
        bumpBoost: 0.11,
        displacementBoost: 0.09,
        opacityBias: 0.02,
      }
    case 'melt':
      return {
        speckleBoost: -0.08,
        crystalBoost: 0.08,
        variegationBoost: 0.2,
        poolingBoost: 0.45,
        edgeBreakBoost: 0.14,
        flameWarp: 0.22,
        roughnessOffset: -0.09,
        transmissionOffset: 0.06,
        clearcoatOffset: 0.08,
        bumpBoost: 0.08,
        displacementBoost: 0.1,
        opacityBias: -0.04,
      }
    case 'opaque':
      return {
        speckleBoost: 0.02,
        crystalBoost: -0.16,
        variegationBoost: 0.08,
        poolingBoost: 0,
        edgeBreakBoost: -0.04,
        flameWarp: 0,
        roughnessOffset: 0.12,
        transmissionOffset: -0.09,
        clearcoatOffset: -0.06,
        bumpBoost: 0.03,
        displacementBoost: 0.02,
        opacityBias: 0.12,
      }
    case 'translucent':
      return {
        speckleBoost: -0.15,
        crystalBoost: 0.04,
        variegationBoost: 0.1,
        poolingBoost: 0.1,
        edgeBreakBoost: 0.1,
        flameWarp: 0,
        roughnessOffset: -0.1,
        transmissionOffset: 0.11,
        clearcoatOffset: 0.06,
        bumpBoost: 0.04,
        displacementBoost: 0.02,
        opacityBias: -0.16,
      }
    default:
      return {
        speckleBoost: 0,
        crystalBoost: 0,
        variegationBoost: 0,
        poolingBoost: 0,
        edgeBreakBoost: 0,
        flameWarp: 0,
        roughnessOffset: 0,
        transmissionOffset: 0,
        clearcoatOffset: 0,
        bumpBoost: 0,
        displacementBoost: 0,
        opacityBias: 0,
      }
  }
}

function clayBodyRgb(clayBody: ClayBody) {
  switch (clayBody) {
    case 'Porcelain':
      return { r: 236, g: 231, b: 222 }
    case 'Buff Stoneware':
      return { r: 217, g: 192, b: 159 }
    case 'Iron-rich Stoneware':
      return { r: 185, g: 143, b: 107 }
    default:
      return { r: 229, g: 211, b: 191 }
  }
}

function createTextureFromImageData(
  imageData: ImageData,
  label: string,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
  options?: {
    repeatX?: number
    repeatY?: number
    wrapS?: THREE.Wrapping
    wrapT?: THREE.Wrapping
  },
) {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.name = label
  texture.wrapS = options?.wrapS ?? THREE.RepeatWrapping
  texture.wrapT = options?.wrapT ?? THREE.RepeatWrapping
  texture.repeat.set(options?.repeatX ?? 1.25, options?.repeatY ?? 1.7)
  texture.colorSpace = colorSpace
  texture.needsUpdate = true
  return texture
}

function lightingRig(lighting: LightingPreset) {
  if (lighting === 'Daylight') {
    return {
      ambient: 0.55,
      dirA: { intensity: 1.3, position: [3.2, 2.6, 2.8] as [number, number, number], color: '#ffffff' },
      dirB: { intensity: 0.55, position: [-2.8, 1.2, -1.8] as [number, number, number], color: '#e4edff' },
      bg: '#e8eef4',
    }
  }

  if (lighting === 'Warm Indoor') {
    return {
      ambient: 0.5,
      dirA: { intensity: 1.1, position: [2.4, 2.2, 2.5] as [number, number, number], color: '#ffe0b5' },
      dirB: { intensity: 0.45, position: [-2.2, 0.9, -2.2] as [number, number, number], color: '#ffd2a1' },
      bg: '#f2e3d4',
    }
  }

  return {
    ambient: 0.52,
    dirA: { intensity: 1.2, position: [2.8, 2.3, 2.5] as [number, number, number], color: '#fff7ef' },
    dirB: { intensity: 0.5, position: [-2.4, 1.0, -2.0] as [number, number, number], color: '#f7efe3' },
    bg: '#eee4d8',
  }
}

function createGlazeMaps(
  material: MaterialProfile,
  seedKey: string,
  effect: string,
): GlazeMaps | null {
  const size = 224
  const tuning = effectTuning(effect)
  const effectKey = effect.trim().toLowerCase()

  const coarse = createNoiseMap(size, size, `${seedKey}:tex:coarse`)
  const mid = createNoiseMap(size, size, `${seedKey}:tex:mid`)
  const fine = createNoiseMap(size, size, `${seedKey}:tex:fine`)
  const flow = createNoiseMap(size, size, `${seedKey}:tex:flow`)

  const colorImage = new ImageData(size, size)
  const roughnessImage = new ImageData(size, size)
  const bumpImage = new ImageData(size, size)
  const displacementImage = new ImageData(size, size)
  const base = material.baseRgb
  const accent = material.accentRgb

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const nCoarse = sampleNoise(coarse, x, y)
      const nMid = sampleNoise(mid, x, y)
      const nFine = sampleNoise(fine, x, y)
      const nFlow = sampleNoise(flow, x, y)

      const u = x / (size - 1)
      const v = y / (size - 1)
      const flowStreak = 0.5 + 0.5 * Math.sin(u * 24 + v * 10 + nCoarse * 8 + nFlow * 7)
      const runMask = clamp((v - 0.16) / 0.84, 0, 1)
      const flameBand =
        tuning.flameWarp > 0
          ? 0.5 + 0.5 * Math.sin((u * 4 + v * 11 + nFlow * 1.8) * Math.PI)
          : 0
      const flameTrail =
        tuning.flameWarp > 0
          ? 0.5 + 0.5 * Math.sin((u * 2.2 + v * 20 + (nCoarse - 0.5) * 5.2) * Math.PI)
          : 0
      const crystalFacet =
        tuning.crystalBoost > 0
          ? clamp(Math.pow(Math.max(0, nFlow - 0.62), 1.1) * (0.7 + nMid * 0.6), 0, 1)
          : 0
      const designMask = clamp(
        0.45 +
          (nCoarse - 0.5) * (0.65 + tuning.variegationBoost * 0.55) +
          (nFlow - 0.5) * 0.25 +
          (flameBand - 0.5) * tuning.flameWarp +
          (flameTrail - 0.5) * tuning.flameWarp * 0.65,
        0,
        1,
      )

      const pooling =
        material.pooling * Math.pow(runMask, 1.35) * (0.48 + 0.52 * flowStreak) * (1 + tuning.poolingBoost)
      const variegation =
        material.variegationStrength *
        (1 + tuning.variegationBoost) *
        ((nCoarse - 0.5) * 1.5 + (nFlow - 0.5) * 0.9 + (flowStreak - 0.5) * 0.5)
      const speckleThreshold = 1 - clamp(material.speckleDensity * (0.48 + tuning.speckleBoost), 0, 0.9)
      const crystalThreshold = 1 - clamp(material.crystalDensity * (0.42 + tuning.crystalBoost), 0, 0.9)
      const speckleMask = nMid > speckleThreshold ? 1 : 0
      const crystalMask = nFlow > crystalThreshold ? 1 : 0
      const pittingMask = nFine > 1 - material.microPitting * 0.72 ? 1 : 0
      const poolingAroundText = pooling

      let r = base.r + variegation * 56 + poolingAroundText * -34 + (nFine - 0.5) * 16
      let g = base.g + variegation * 44 + poolingAroundText * -28 + (nFine - 0.5) * 15
      let b = base.b + variegation * 33 + poolingAroundText * -25 + (nFine - 0.5) * 12

      if (tuning.flameWarp > 0) {
        const flameColorBias = ((flameBand - 0.45) * 0.65 + (flameTrail - 0.5) * 0.35) * tuning.flameWarp
        r += flameColorBias * 18
        g += flameColorBias * 6
        b -= flameColorBias * 12
      }

      if (speckleMask > 0) {
        r = r * 0.56 + accent.r * 0.36
        g = g * 0.56 + accent.g * 0.36
        b = b * 0.56 + accent.b * 0.36
      }

      if (crystalMask > 0) {
        const crystalBoost = 0.36 + nFine * 0.24 + crystalFacet * 0.22
        r = mix(r, accent.r + 18, crystalBoost)
        g = mix(g, accent.g + 14, crystalBoost)
        b = mix(b, accent.b + 10, crystalBoost)
      }

      // Force distinct visual identity per selected effect.
      if (effectKey === 'speckled') {
        const denseSpeck = nMid > 0.86 ? 1 : 0
        if (denseSpeck) {
          r = mix(r, accent.r * 0.35, 0.65)
          g = mix(g, accent.g * 0.35, 0.65)
          b = mix(b, accent.b * 0.35, 0.65)
        }
      } else if (effectKey === 'crystalline') {
        const bloom = Math.pow(clamp(nFlow - 0.55, 0, 1), 1.2)
        r = mix(r, Math.min(255, accent.r + 28), bloom * 0.5)
        g = mix(g, Math.min(255, accent.g + 24), bloom * 0.5)
        b = mix(b, Math.min(255, accent.b + 20), bloom * 0.5)
      } else if (effectKey === 'flame') {
        const flameTint = ((flameBand - 0.5) * 0.65 + (flameTrail - 0.5) * 0.35) * 0.7
        r += flameTint * 26
        g += flameTint * 8
        b -= flameTint * 22
      } else if (effectKey === 'melt') {
        const run = Math.pow(runMask, 1.8)
        r = mix(r, r - 22, run * 0.35)
        g = mix(g, g - 18, run * 0.35)
        b = mix(b, b - 14, run * 0.35)
      } else if (effectKey === 'opaque') {
        r = mix(r, 236, 0.28)
        g = mix(g, 232, 0.28)
        b = mix(b, 228, 0.28)
      } else if (effectKey === 'translucent') {
        r = mix(r, base.r, 0.2)
        g = mix(g, base.g, 0.2)
        b = mix(b, base.b, 0.2)
      }

      const roughnessValue = clamp(
        material.roughness +
          tuning.roughnessOffset +
          (nCoarse - 0.5) * 0.16 -
          poolingAroundText * 0.06 -
          crystalMask * 0.08 +
          pittingMask * 0.14,
        0.05,
        0.95,
      )
      const bumpValue = clamp(
        0.44 +
          (nFine - 0.5) * 0.22 +
          poolingAroundText * 0.2 +
          speckleMask * 0.22 +
          crystalMask * 0.3 -
          pittingMask * 0.2 +
          crystalFacet * (0.2 + tuning.crystalBoost * 0.15) +
          flameTrail * tuning.flameWarp * 0.08 +
          tuning.bumpBoost +
          0,
        0,
        1,
      )
      const displacementValue = clamp(
        0.46 +
          (nCoarse - 0.5) * 0.16 +
          designMask * 0.12 +
          crystalMask * 0.16 +
          crystalFacet * (0.12 + tuning.crystalBoost * 0.16) +
          flameTrail * tuning.flameWarp * 0.07 +
          tuning.displacementBoost +
          poolingAroundText * 0.1 -
          pittingMask * 0.12,
        0.16,
        1,
      )

      colorImage.data[idx] = toByte(r)
      colorImage.data[idx + 1] = toByte(g)
      colorImage.data[idx + 2] = toByte(b)
      colorImage.data[idx + 3] = 255

      const roughByte = toByte(roughnessValue * 255)
      roughnessImage.data[idx] = roughByte
      roughnessImage.data[idx + 1] = roughByte
      roughnessImage.data[idx + 2] = roughByte
      roughnessImage.data[idx + 3] = 255

      const bumpByte = toByte(bumpValue * 255)
      bumpImage.data[idx] = bumpByte
      bumpImage.data[idx + 1] = bumpByte
      bumpImage.data[idx + 2] = bumpByte
      bumpImage.data[idx + 3] = 255

      const displacementByte = toByte(displacementValue * 255)
      displacementImage.data[idx] = displacementByte
      displacementImage.data[idx + 1] = displacementByte
      displacementImage.data[idx + 2] = displacementByte
      displacementImage.data[idx + 3] = 255
    }
  }

  const glazeTextureOptions = {
    repeatX: 1,
    repeatY: 1,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  }

  const colorTexture = createTextureFromImageData(
    colorImage,
    'glaze-color',
    THREE.SRGBColorSpace,
    glazeTextureOptions,
  )
  const roughnessTexture = createTextureFromImageData(
    roughnessImage,
    'glaze-roughness',
    THREE.NoColorSpace,
    glazeTextureOptions,
  )
  const bumpTexture = createTextureFromImageData(
    bumpImage,
    'glaze-bump',
    THREE.NoColorSpace,
    glazeTextureOptions,
  )
  const displacementTexture = createTextureFromImageData(
    displacementImage,
    'glaze-displacement',
    THREE.NoColorSpace,
    glazeTextureOptions,
  )

  if (!colorTexture || !roughnessTexture || !bumpTexture || !displacementTexture) {
    colorTexture?.dispose()
    roughnessTexture?.dispose()
    bumpTexture?.dispose()
    displacementTexture?.dispose()
    return null
  }

  return {
    color: colorTexture,
    roughness: roughnessTexture,
    bump: bumpTexture,
    displacement: displacementTexture,
  }
}

function createClayBodyTexture(clayBody: ClayBody, seedKey: string) {
  const size = 192
  const coarse = createNoiseMap(size, size, `${seedKey}:clay:coarse`)
  const fine = createNoiseMap(size, size, `${seedKey}:clay:fine`)
  const grain = createNoiseMap(size, size, `${seedKey}:clay:grain`)

  const clay = clayBodyRgb(clayBody)
  const image = new ImageData(size, size)

  const inclusionDensity =
    clayBody === 'Porcelain' ? 0.03 : clayBody === 'White Stoneware' ? 0.06 : clayBody === 'Buff Stoneware' ? 0.12 : 0.18

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const nCoarse = sampleNoise(coarse, x, y)
      const nFine = sampleNoise(fine, x, y)
      const nGrain = sampleNoise(grain, x, y)

      const warmShift = (nCoarse - 0.5) * 18
      const poreMask = nFine > 1 - inclusionDensity * 1.2 ? 1 : 0
      const grainMask = nGrain > 1 - inclusionDensity * 0.75 ? 1 : 0

      let r = clay.r + warmShift
      let g = clay.g + warmShift * 0.6
      let b = clay.b + warmShift * 0.4

      if (grainMask > 0) {
        r -= 18
        g -= 14
        b -= 10
      }
      if (poreMask > 0) {
        r -= 26
        g -= 22
        b -= 18
      }

      image.data[idx] = toByte(r)
      image.data[idx + 1] = toByte(g)
      image.data[idx + 2] = toByte(b)
      image.data[idx + 3] = 255
    }
  }

  return createTextureFromImageData(image, 'clay-body-color', THREE.SRGBColorSpace)
}

function TileScene({ material, seedKey, lighting, clayBody, effect }: Props) {
  const tuning = useMemo(() => effectTuning(effect), [effect])
  const tileDepth = 0.12
  const tileTopZ = tileDepth / 2
  const glazeMaps = useMemo(
    () => createGlazeMaps(material, seedKey, effect),
    [material, seedKey, effect],
  )
  const clayTexture = useMemo(() => createClayBodyTexture(clayBody, seedKey), [clayBody, seedKey])
  const rig = useMemo(() => lightingRig(lighting), [lighting])

  useEffect(() => {
    return () => {
      glazeMaps?.color.dispose()
      glazeMaps?.roughness.dispose()
      glazeMaps?.bump.dispose()
      glazeMaps?.displacement.dispose()
      clayTexture?.dispose()
    }
  }, [glazeMaps, clayTexture])

  return (
    <>
      <color attach="background" args={[rig.bg]} />
      <ambientLight intensity={rig.ambient} />
      <directionalLight
        intensity={rig.dirA.intensity}
        position={rig.dirA.position}
        color={rig.dirA.color}
        castShadow={false}
      />
      <directionalLight
        intensity={rig.dirB.intensity}
        position={rig.dirB.position}
        color={rig.dirB.color}
        castShadow={false}
      />

      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[1.7, 2.35, 0.12]} />
        <meshStandardMaterial
          map={clayTexture ?? undefined}
          color="#ffffff"
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, 0, tileTopZ]} renderOrder={3}>
        <planeGeometry args={[1.7, 2.35, 84, 116]} />
        <meshPhysicalMaterial
          map={glazeMaps?.color ?? undefined}
          roughnessMap={glazeMaps?.roughness ?? undefined}
          bumpMap={glazeMaps?.bump ?? undefined}
          displacementMap={glazeMaps?.displacement ?? undefined}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-6}
          color={`rgb(${material.baseRgb.r}, ${material.baseRgb.g}, ${material.baseRgb.b})`}
          roughness={clamp(material.roughness + tuning.roughnessOffset + (effect.trim().toLowerCase() === 'opaque' ? 0.08 : 0), 0.03, 0.96)}
          metalness={0.03}
          clearcoat={clamp(0.2 + material.gloss * 0.6 + tuning.clearcoatOffset, 0.05, 1)}
          clearcoatRoughness={Math.max(0.03, 0.45 - material.gloss * 0.3)}
          transmission={
            clamp(0.02 + (1 - clamp(material.opacity + tuning.opacityBias, 0.02, 0.98)) * 0.1 + tuning.transmissionOffset, 0, 0.35)
          }
          thickness={0.1 + material.pooling * 0.25}
          bumpScale={0.03 + material.crystalDensity * 0.045 + material.speckleDensity * 0.02}
          displacementScale={0.012 + material.pooling * 0.007 + material.edgeBreak * 0.006}
          displacementBias={0.003}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#d8ccbd" roughness={0.95} metalness={0.02} />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={4.6}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
      />
    </>
  )
}

export function RealisticTilePreview3D({ material, seedKey, lighting, clayBody, effect }: Props) {
  return (
    <div className="realistic-3d-wrap">
      <Canvas camera={{ position: [1.8, 1.2, 2.7], fov: 40 }} dpr={[1, 2]}>
        <TileScene
          material={material}
          seedKey={seedKey}
          lighting={lighting}
          clayBody={clayBody}
          effect={effect}
        />
      </Canvas>
      <p className="glaze-preview-caption">Realistic 3D tile (deterministic phase A)</p>
      <p className="glaze-preview-caption">Effect simulation: {effect || 'None'}</p>
      <p className="glaze-preview-selected">Confidence: {material.confidence}</p>
    </div>
  )
}
