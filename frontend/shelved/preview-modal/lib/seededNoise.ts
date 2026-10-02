export interface NoiseMap {
  width: number
  height: number
  data: Float32Array
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

export function createNoiseMap(width: number, height: number, seedKey: string): NoiseMap {
  const rng = seededRng(hashStr(seedKey))
  const data = new Float32Array(width * height)
  for (let i = 0; i < data.length; i++) {
    data[i] = rng()
  }
  return { width, height, data }
}

export function sampleNoise(map: NoiseMap, x: number, y: number): number {
  const xi = Math.max(0, Math.min(map.width - 1, x | 0))
  const yi = Math.max(0, Math.min(map.height - 1, y | 0))
  return map.data[yi * map.width + xi]
}
