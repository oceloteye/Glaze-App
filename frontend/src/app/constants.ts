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

/** Backend values with the melt-behaviour labels shown in the form. */
export const STABILITY_STOPS = [
  { value: 'High', label: 'Stiff' },
  { value: 'Medium', label: 'Balanced' },
  { value: 'Low', label: 'Fluid' },
] as const

export const OPACITY_STOPS = ['Translucent', 'Semi-opaque', 'Opaque'] as const

export const EFFECTS = [
  { label: 'None', value: '' },
  { label: 'Speckled', value: 'Speckled' },
  { label: 'Crystalline', value: 'Crystalline' },
  { label: 'Variegated', value: 'Variegated' },
  { label: 'Flame', value: 'Flame' },
] as const

export const EFFECTS_WITH_SECONDARY = new Set(['Speckled', 'Crystalline', 'Variegated', 'Flame'])

export const SECONDARY_COLOR_LABEL: Record<string, string> = {
  Speckled: 'Speckle color',
  Crystalline: 'Crystal color',
  Variegated: 'Streak color',
  Flame: 'Flame color',
}

export const CLAY_BODY_OPTIONS = ['Porcelain', 'White Stoneware', 'Buff Stoneware', 'Iron-rich Stoneware'] as const
export const THICKNESS_OPTIONS = ['Thin', 'Medium', 'Thick'] as const
export const ATMOSPHERE_OPTIONS = ['Oxidation', 'Reduction'] as const
export const COOLING_OPTIONS = ['Fast', 'Normal', 'Slow'] as const
export const LIGHTING_OPTIONS = ['Studio Neutral', 'Daylight', 'Warm Indoor'] as const

/** Ingredient names the backend adds for colour, opacity or surface effects (everything else is the base glaze). */
export const COLORANT_INGREDIENTS = new Set<string>([
  'Red Iron Oxide',
  'Yellow Iron Oxide',
  'Iron Oxide',
  'Cobalt Carbonate',
  'Copper Carbonate',
  'Manganese Dioxide',
  'Manganese Granules',
  'Rutile',
  'Titanium Dioxide',
  'Ilmenite (granular)',
  'Iron Chromate',
  'Zircopax',
  'Tin Oxide',
])

export type IngredientInfo = { role: string; description: string }

/** Short hover text for UMF oxides. */
export const OXIDE_INFO: Record<string, string> = {
  K2O: 'Potassium — alkali flux; stiff, bright glass, keeps colours vivid.',
  Na2O: 'Sodium — alkali flux; fluid, glossy, high expansion; turquoise with copper.',
  Li2O: 'Lithium — strong alkali flux; low expansion, boosts gloss and colour.',
  CaO: 'Calcium — main stoneware flux; hardness, durability, matte in excess.',
  MgO: 'Magnesium — flux above cone 5; buttery satin/matte, softens colours.',
  ZnO: 'Zinc — mid/high-fire flux; brightens colours, grows crystals when high.',
  BaO: 'Barium — flux; silky mattes and vivid blues/greens, but toxic and leachable.',
  SrO: 'Strontium — flux; the non-toxic stand-in for barium, satin surfaces.',
  Al2O3: 'Alumina — stabilizer; stiffens the melt, adds durability, prevents running.',
  B2O3: 'Boron — low-temperature glass former/flux; early melt, gloss, some clouding.',
  SiO2: 'Silica — the glass former; hardness, acid resistance, raises melt temperature.',
  TiO2: 'Titania — opacifier and crystal seed; variegation and satin surfaces.',
  ZrO2: 'Zirconia — opacifier; whitens and stiffens without changing melt much.',
  SnO2: 'Tin — soft white opacifier.',
  P2O5: 'Phosphorus — from bone ash; opalescent blue-white chun effects.',
  Fe2O3: 'Iron — ambers/browns in oxidation, celadon/tenmoku in reduction; a flux.',
  CuO: 'Copper — green, turquoise or reduction red; increases fluidity.',
  CoO: 'Cobalt — intense blue at tiny amounts.',
  MnO: 'Manganese — browns and purples; metallic when high.',
  Cr2O3: 'Chrome — greens, greys; pinks with tin.',
  NiO: 'Nickel — greys, greens and browns; pinks/blues with zinc or barium.',
}

export const INGREDIENT_INFO: Record<string, IngredientInfo> = {
  'Potash Feldspar': {
    role: 'Primary flux / glass former',
    description: 'Brings potassium, alumina and silica in one mineral. Melts at stoneware temperatures, gives a stiff, durable glass and helps colours stay bright.',
  },
  'Soda Feldspar': {
    role: 'Primary flux / glass former',
    description: 'Like potash feldspar but sodium-based: a slightly more fluid, glossier melt with higher thermal expansion. Warms copper toward turquoise.',
  },
  'Nepheline Syenite': {
    role: 'Strong alkaline flux',
    description: 'A low-silica feldspathic rock with more sodium and potassium than feldspar. Melts earlier, brightens alkaline colours, and lowers the maturing temperature.',
  },
  'Ferro Frit 3134': {
    role: 'Low-temperature flux',
    description: 'Pre-melted calcium-boron-sodium glass. Melts early and evenly, adds gloss and clarity, and carries low- and mid-fire glazes without raw soluble materials.',
  },
  'Ferro Frit 3124': {
    role: 'Low-temperature flux',
    description: 'A boron frit that also carries alumina, so it makes a more complete glaze on its own than Frit 3134 and is less prone to running.',
  },
  'EPK Kaolin': {
    role: 'Alumina source / suspension',
    description: 'Pure clay that supplies alumina for stiffness and durability, keeps the raw glaze suspended in the bucket, and helps it adhere to the pot before firing.',
  },
  Whiting: {
    role: 'Calcium flux',
    description: 'Calcium carbonate. Inactive at low fire but a powerful flux above cone 4; increases hardness and durability and promotes matte surfaces when in excess.',
  },
  Dolomite: {
    role: 'Calcium + magnesium flux',
    description: 'Supplies both calcium and magnesium. Magnesium gives a buttery, satin-to-matte surface and softens colours toward pastel tones.',
  },
  Talc: {
    role: 'Magnesium flux / silica source',
    description: 'Magnesium silicate. Lowers expansion and promotes buttery satin-matte surfaces; the usual magnesia source in low-fire mattes.',
  },
  Wollastonite: {
    role: 'Calcium flux / silica source',
    description: 'Calcium silicate. Adds calcium without releasing carbon dioxide, so it reduces pinholes and crawling while contributing silica to the glass.',
  },
  Silica: {
    role: 'Glass former',
    description: 'The backbone of the glass. More silica gives a harder, more durable, more acid-resistant surface and raises the melting point.',
  },
  Bentonite: {
    role: 'Suspension agent',
    description: 'Highly plastic clay used in small amounts to keep the glaze from settling and to toughen the dry glaze coat.',
  },
  'Zinc Oxide': {
    role: 'Flux / crystal former',
    description: 'An active mid- and high-fire flux that brightens colours and increases gloss. At high levels it grows zinc-silicate crystals during a slow cool.',
  },
  'Lithium Carbonate': {
    role: 'Powerful alkaline flux',
    description: 'A strong low-expansion flux that lowers the melting point, increases fluidity and gloss, and brightens copper blues and other alkaline colours.',
  },
  Zircopax: {
    role: 'Opacifier',
    description: 'Zirconium silicate. Whitens and opacifies the glaze without affecting the melt much; also stiffens the glaze and makes colours more pastel.',
  },
  'Tin Oxide': {
    role: 'Opacifier',
    description: 'A soft, creamy white opacifier. Softer than Zircopax in appearance and reacts with chrome to produce pinks.',
  },
  Rutile: {
    role: 'Variegation / colour modifier',
    description: 'Impure titanium dioxide with iron. Creates streaks, mottling and crystalline variegation; gives tans, creams and blues depending on the base and cooling.',
  },
  'Titanium Dioxide': {
    role: 'Opacifier / crystal seeding',
    description: 'Pure titania. Encourages micro-crystals for satin or matte surfaces and colour variegation, and adds a soft opacity.',
  },
  'Copper Carbonate': {
    role: 'Colorant',
    description: 'Greens in oxidation, turquoise in alkaline bases, and reds in reduction. Also a flux; higher amounts make the glaze more fluid and can go metallic.',
  },
  'Cobalt Carbonate': {
    role: 'Colorant',
    description: 'The strongest blue colorant; a fraction of a percent gives a clear blue. Shifts toward purple with manganese and softens with magnesium.',
  },
  'Manganese Dioxide': {
    role: 'Colorant',
    description: 'Browns and purples, especially with cobalt in alkaline bases. Can produce metallic surfaces in high amounts. Also acts as a flux.',
  },
  'Manganese Granules': {
    role: 'Speckle agent',
    description: 'Coarse manganese that melts into dark specks in the glaze surface rather than dissolving evenly.',
  },
  'Ilmenite (granular)': {
    role: 'Speckle agent',
    description: 'Coarse iron-titanium ore that produces dark, slightly metallic specks scattered through the glaze.',
  },
  'Iron Chromate': {
    role: 'Colorant',
    description: 'Iron and chrome together. Gives greys, browns and black; with tin it can shift toward pink-brown.',
  },
  'Red Iron Oxide': {
    role: 'Colorant',
    description: 'The most common iron colorant. Amber and honey in oxidation, celadon greens and tenmoku blacks in reduction; also fluxes the glaze. At 10–15% in a fluid boron + talc base it recrystallises into rust "iron reds" on a slow cool.',
  },
  'Yellow Iron Oxide': {
    role: 'Colorant',
    description: 'Fine iron hydroxide that disperses evenly for smooth tans and yellows; slightly weaker than red iron by weight.',
  },
  'Iron Oxide': {
    role: 'Colorant',
    description: 'Iron in general. Warm browns and ambers in oxidation, greens and blacks in reduction; increases fluidity of the melt.',
  },
}
