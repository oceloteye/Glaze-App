export const CONES: { name: string; tempC: number }[] = [
  { name: 'Cone 022', tempC: 600 },
  { name: 'Cone 021', tempC: 614 },
  { name: 'Cone 020', tempC: 626 },
  { name: 'Cone 019', tempC: 656 },
  { name: 'Cone 018', tempC: 696 },
  { name: 'Cone 017', tempC: 727 },
  { name: 'Cone 016', tempC: 769 },
  { name: 'Cone 015', tempC: 790 },
  { name: 'Cone 014', tempC: 807 },
  { name: 'Cone 013', tempC: 837 },
  { name: 'Cone 012', tempC: 861 },
  { name: 'Cone 011', tempC: 875 },
  { name: 'Cone 010', tempC: 894 },
  { name: 'Cone 09', tempC: 923 },
  { name: 'Cone 08', tempC: 945 },
  { name: 'Cone 07', tempC: 973 },
  { name: 'Cone 06', tempC: 999 },
  { name: 'Cone 05', tempC: 1031 },
  { name: 'Cone 04', tempC: 1063 },
  { name: 'Cone 03', tempC: 1101 },
  { name: 'Cone 02', tempC: 1120 },
  { name: 'Cone 01', tempC: 1137 },
  { name: 'Cone 1', tempC: 1154 },
  { name: 'Cone 2', tempC: 1162 },
  { name: 'Cone 3', tempC: 1168 },
  { name: 'Cone 4', tempC: 1186 },
  { name: 'Cone 5', tempC: 1196 },
  { name: 'Cone 6', tempC: 1222 },
  { name: 'Cone 7', tempC: 1240 },
  { name: 'Cone 8', tempC: 1263 },
  { name: 'Cone 9', tempC: 1280 },
  { name: 'Cone 10', tempC: 1285 },
]

export const SURFACE_FINISHES = ['Matte', 'Satin', 'Glossy'] as const

export const EFFECTS = [
  { label: 'None', value: '' },
  { label: 'Speckled', value: 'Speckled' },
  { label: 'Crystalline', value: 'Crystalline' },
  { label: 'Variegated', value: 'Variegated' },
  { label: 'Flame', value: 'Flame' },
  { label: 'Melt', value: 'Melt' },
  { label: 'Opaque', value: 'Opaque' },
  { label: 'Translucent', value: 'Translucent' },
] as const

export const EFFECTS_WITH_SECONDARY = new Set(['Speckled', 'Crystalline', 'Variegated', 'Flame', 'Melt'])

export const SECONDARY_COLOR_LABEL: Record<string, string> = {
  Speckled: 'Speckle color',
  Crystalline: 'Crystal color',
  Variegated: 'Streak color',
  Flame: 'Flame color',
  Melt: 'Melt color',
}

export const CLAY_BODY_OPTIONS = ['Porcelain', 'White Stoneware', 'Buff Stoneware', 'Iron-rich Stoneware'] as const
export const THICKNESS_OPTIONS = ['Thin', 'Medium', 'Thick'] as const
export const ATMOSPHERE_OPTIONS = ['Oxidation', 'Reduction'] as const
export const COOLING_OPTIONS = ['Fast', 'Normal', 'Slow'] as const
export const LIGHTING_OPTIONS = ['Studio Neutral', 'Daylight', 'Warm Indoor'] as const
