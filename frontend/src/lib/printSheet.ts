import type { Umf } from '../app/types'
import { escapeHtml, splitIngredients, sumPercent, type IngredientEntry } from '../app/utils'

export const PRINT_SHEET_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; margin: 24px; color: #1f1a16; }
  h1, h2, h3 { margin: 0 0 8px; }
  h1 { font-size: 26px; }
  h2 { margin-top: 24px; font-size: 20px; }
  h3 { font-size: 18px; }
  h4 { font-size: 15px; margin: 14px 0 4px; }
  p { margin: 0 0 10px; line-height: 1.45; }
  .meta { color: #5f4b3f; margin-bottom: 18px; }
  .notes { margin: 6px 0 0; padding-left: 18px; font-size: 13px; color: #5f4b3f; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; border: 1px solid #d7c8bb; padding: 6px 8px; font-size: 14px; }
  th { background: #f6eee6; }
  tr.group th { background: #ece2d6; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #5f4b3f; }
  .recipe { border-top: 2px solid #e1d4c7; margin-top: 18px; padding-top: 14px; break-inside: avoid; }
  .range { color: #5f4b3f; font-style: italic; }
  .preview { float: right; margin: 0 0 12px 16px; text-align: center; }
  .preview img { display: block; width: 180px; height: 180px; border-radius: 12px; }
  .preview figcaption { font-size: 12px; color: #5f4b3f; margin-top: 4px; }
  .recipe table { clear: both; }
  .warning { margin: 0 0 8px; padding-left: 10px; border-left: 3px solid #d7c8bb; break-inside: avoid; }
  .warning--danger { border-color: #b4412c; }
  .warning--caution { border-color: #c98a1b; }
  .warning strong { display: block; font-size: 14px; }
  .warning p { font-size: 13px; color: #5f4b3f; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`

/** Base / colorant grouped ingredient rows; pass `parts` to add a parts column ahead of the percent. */
export function ingredientRowsHtml(ingredients: Record<string, number>, parts?: Record<string, number>): string {
  const { base, colorants } = splitIngredients(ingredients)
  const cell = (value: string) => `<td>${value}</td>`
  const group = (title: string, entries: IngredientEntry[]) =>
    entries.length === 0
      ? ''
      : `<tr class="group"><th>${escapeHtml(title)}</th>${parts ? '<th></th>' : ''}<th>${sumPercent(entries).toFixed(2)}%</th></tr>` +
        entries
          .map(
            ([ingredient, percent]) =>
              `<tr>${cell(escapeHtml(ingredient))}${parts ? cell(formatParts(parts[ingredient] ?? 0)) : ''}${cell(`${percent.toFixed(2)}%`)}</tr>`,
          )
          .join('')
  return group('Base glaze', base) + group('Colorants & additives', colorants)
}

export function formatParts(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function umfHtml(umf: Umf | undefined): string {
  if (!umf || Object.keys(umf.fluxes).length === 0) return ''
  const oxideRows = (title: string, oxides: Record<string, number>) => {
    const rows = Object.entries(oxides)
    if (rows.length === 0) return ''
    return `<tr class="group"><th>${escapeHtml(title)}</th><th></th></tr>${rows
      .map(([oxide, value]) => `<tr><td>${escapeHtml(oxide)}</td><td>${value.toFixed(3)}</td></tr>`)
      .join('')}`
  }
  return `
    <h4>Unity molecular formula — Si:Al ${umf.siAlRatio.toFixed(1)}, R2O:RO ${umf.r2oShare.toFixed(2)}:${(1 - umf.r2oShare).toFixed(2)}</h4>
    <table>
      <thead><tr><th>Oxide</th><th>Moles (unity)</th></tr></thead>
      <tbody>${oxideRows('Fluxes', umf.fluxes)}${oxideRows('Stabilizers', umf.stabilizers)}${oxideRows('Glass formers', umf.glassFormers)}${oxideRows('Colorants', umf.colorants)}</tbody>
    </table>
  `
}

export function previewFigureHtml(dataUrl: string | null, alt: string, caption: string): string {
  if (!dataUrl) return ''
  return `<figure class="preview"><img src="${dataUrl}" alt="${escapeHtml(alt)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure>`
}

export function parametersTableHtml(parameters: Record<string, unknown>): string {
  const rows = Object.entries(parameters)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase())
      return `<tr><th>${escapeHtml(title)}</th><td>${escapeHtml(String(value))}</td></tr>`
    })
    .join('')
  return `<table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`
}

/**
 * Writes a print document into a hidden iframe, waits for its images, prints it and removes it.
 * Returns false when the iframe could not be initialised.
 */
export function openPrintSheet(title: string, bodyHtml: string): boolean {
  const documentHtml = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>${PRINT_SHEET_STYLES}</style>
    </head>
    <body>${bodyHtml}</body>
    </html>
  `

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument
  const iframeWin = iframe.contentWindow
  if (!iframeDoc || !iframeWin) {
    document.body.removeChild(iframe)
    return false
  }

  iframeDoc.open()
  iframeDoc.write(documentHtml)
  iframeDoc.close()

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
    }, 500)
  }

  iframeWin.onafterprint = cleanup
  const images = Array.from(iframeDoc.images)
  Promise.all(images.map((img) => img.decode().catch(() => undefined))).then(() => {
    window.setTimeout(() => {
      iframeWin.focus()
      iframeWin.print()
      cleanup()
    }, 150)
  })
  return true
}
