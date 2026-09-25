import type { FiringSchedule, RecipeSuggestion, ScheduleLength } from '../app/types'

export const FIRING_SCHEDULE_FORMAT = 'glaze-app.firing-schedule'
export const FIRING_SCHEDULE_VERSION = 1

/** Controller-neutral, versioned schedule document. Null rates mean "FULL" (uncontrolled ramp). */
export type FiringScheduleExport = {
  format: typeof FIRING_SCHEDULE_FORMAT
  version: typeof FIRING_SCHEDULE_VERSION
  exportedAt: string
  program: {
    name: string
    length: ScheduleLength
    cone: string
    atmosphere: string
    coolingStrategy: string
    peakTempC: number
    peakTempF: number
    heatingHours: number
    coolingHours: number
    estimatedHours: number
  }
  steps: Array<{
    step: number
    phase: 'Heat' | 'Cool'
    rateCPerHour: number | null
    rateFPerHour: number | null
    targetTempC: number
    targetTempF: number
    holdMinutes: number
    note: string
  }>
  notes: string[]
}

export function buildFiringScheduleExport(recipe: RecipeSuggestion, schedule: FiringSchedule): FiringScheduleExport {
  return {
    format: FIRING_SCHEDULE_FORMAT,
    version: FIRING_SCHEDULE_VERSION,
    exportedAt: new Date().toISOString(),
    program: {
      name: recipe.name,
      length: schedule.length,
      cone: schedule.cone,
      atmosphere: schedule.atmosphere,
      coolingStrategy: schedule.coolingStrategy,
      peakTempC: schedule.peakTempC,
      peakTempF: schedule.peakTempF,
      heatingHours: schedule.heatingHours,
      coolingHours: schedule.coolingHours,
      estimatedHours: schedule.estimatedHours,
    },
    steps: schedule.segments.map((segment, index) => ({
      step: index + 1,
      phase: segment.phase,
      rateCPerHour: segment.rateCPerHour,
      rateFPerHour: segment.rateFPerHour,
      targetTempC: segment.targetTempC,
      targetTempF: segment.targetTempF,
      holdMinutes: segment.holdMinutes,
      note: segment.note,
    })),
    notes: schedule.notes,
  }
}

/** Flat step table: one row per segment, "FULL" for uncontrolled ramps, hold as minutes. */
export function firingScheduleToCsv(doc: FiringScheduleExport): string {
  const header = ['step', 'phase', 'rate_c_per_hr', 'rate_f_per_hr', 'target_c', 'target_f', 'hold_min', 'note']
  const rows = doc.steps.map((step) => [
    step.step,
    step.phase,
    step.rateCPerHour ?? 'FULL',
    step.rateFPerHour ?? 'FULL',
    step.targetTempC,
    step.targetTempF,
    step.holdMinutes,
    step.note,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function firingScheduleFileStem(recipe: RecipeSuggestion, schedule: FiringSchedule): string {
  const slug = recipe.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `firing-schedule-cone${schedule.cone}-${schedule.length}-${slug || 'recipe'}`
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
