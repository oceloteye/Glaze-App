import type { TempUnit } from './types'

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

export function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9)
}

export function nearestConeIndex(tempC: number, cones: { tempC: number }[]): number {
  return cones.reduce(
    (best, _, index) =>
      Math.abs(cones[index].tempC - tempC) < Math.abs(cones[best].tempC - tempC) ? index : best,
    0,
  )
}

export function formatTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function syncTemperatureInput(unit: TempUnit, valueC: number): string {
  return String(unit === 'C' ? valueC : cToF(valueC))
}
