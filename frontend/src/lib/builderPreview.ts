/** Maps the analysis vocabulary onto the preview renderer's inputs so the on-screen and printed previews agree. */

export function surfaceForPreview(surface: string | undefined) {
  if (surface === 'Glossy' || surface === 'Satin') return surface
  if (surface === 'Matte' || surface === 'Dry matte') return 'Matte'
  return 'Satin'
}

export function stabilityForPreview(meltLabel: string | undefined) {
  if (meltLabel === 'Runny' || meltLabel === 'Fluid') return 'Low'
  if (meltLabel === 'Balanced') return 'Medium'
  return 'High'
}

export function effectForPreview(percentages: Record<string, number>) {
  if ((percentages['Manganese Granules'] ?? 0) > 0 || (percentages['Ilmenite (granular)'] ?? 0) > 0) return 'Speckled'
  if ((percentages['Zinc Oxide'] ?? 0) >= 8 && ((percentages['Titanium Dioxide'] ?? 0) > 0 || (percentages['Rutile'] ?? 0) > 0)) {
    return 'Crystalline'
  }
  if ((percentages['Rutile'] ?? 0) >= 3) return 'Variegated'
  return ''
}
