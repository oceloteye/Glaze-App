# Recipe generation — validation findings

Branch: `feature/recipe-validation`. The first section records what the new tests
found before any tuning; "Round 1 tuning" at the end records what has since changed.

## Method

1. **Reference glazes** (`backend/src/test/.../recipe/ReferenceGlazes.java`) — six
   classic published recipes with hand-checked expected UMF ranges:
   Leach 4-3-2-1 (cone 10), Tenmoku (4-3-2-1 + 10 RIO), 5x20 (cone 6), Floating Blue
   (cone 6), Frit 3124 / EPK 90:10 clear (cone 06), and a cone-10 dolomite matte.
2. **Calculator check** (`ReferenceGlazeUmfTest`, 18 tests) — `UmfCalculator` output
   must land inside each published range, fluxes must sum to unity, and
   `GlazeAnalyzer` must predict a plausible surface, a non-underfired / non-runny melt
   and no danger warnings for each reference.
3. **Generator audit** (`GeneratedRecipeLimitsTest`, 1 test / 405 recipes) — every
   combination of 5 temperatures × 3 finishes × 3 stabilities × 3 opacities is
   generated (3 variants each) and checked against:
   - hard invariants (fail the test): 3 variants, total ≈ 100, no negatives,
     flux unity, SiO₂ 1.5–5.5, Al₂O₃ 0.05–0.70, melt not Underfired;
   - soft findings (printed, not failed): a per-temperature limit-formula table
     (independent of the generator's own `UmfLimits`), requested finish/opacity vs.
     analyzer prediction, Stiff/Runny melt, high expansion, Soft durability, danger
     warnings.

   The report prints in the test's stdout (`target/surefire-reports/TEST-…GeneratedRecipeLimitsTest.xml`).

## Reference results — calculator and analyzer

All 18 checks pass. The UMF calculator reproduces the published formulas:

| Glaze | SiO₂ | Al₂O₃ | B₂O₃ | KNaO | CaO | MgO | Analyzer surface |
|---|---|---|---|---|---|---|---|
| Leach 4-3-2-1 | 3.9 | 0.41 | – | 0.30 | 0.70 | – | Glossy (0.93) |
| Tenmoku | 3.9 | 0.41 | – | 0.30 | 0.70 | – | Glossy; opacity 0.10 "Translucent" |
| 5x20 | 3.39 | 0.35 | 0.22 | 0.21 | 0.79 | – | Glossy (1.00) |
| Floating Blue | 3.89 | 0.55 | 0.44 | 0.49 | 0.42 | 0.10 | Satin (0.53) |
| Frit 3124 clear | ~2.7 | ~0.3 | ~0.5 | ~0.3 | ~0.6 | – | Glossy |
| Dolomite matte | 2.76 | 0.52 | – | 0.17 | 0.43 | 0.38 | Dry matte (0.00) |

Minor analyzer notes (not generator issues):
- Tenmoku: Fe₂O₃ 0.24 is not counted toward opacity, so an iron-saturate reads as
  "Translucent". Consider treating Fe₂O₃ above ~0.15 as an opacifier.
- Dolomite matte receives a "Soft glass — below limit formula" caution, which is
  fair for a dry matte.

## Generator findings (405 recipes)

Ordered by impact, with counts from the audit report.

### 1. Cone 6 (1222 °C) uses the cone-10 base — no boron
`RecipeBaseFactory.baseForTemp` switches to the high-fire feldspar/whiting/dolomite
base at `>= 1200`, so cone 6 shares its base with cone 10 while cone 5 (1186) gets the
mid-fire base. Consequences at 1222:
- SiO₂ 4.2–4.5 and Al₂O₃ up to 0.45 for Glossy/High (16 + 2 excursions);
- **melt predicted Stiff (0.13–0.19) for all 6 Glossy/High recipes** — the same
  recipe at 1285 is Balanced (0.53);
- B₂O₃ = 0 everywhere, whereas classic cone 6 glazes (5x20, Floating Blue) carry
  B₂O₃ 0.2–0.45.

*Suggested remedy:* a dedicated 1200–1250 band with a boron frit (3134 / 3124 or
Gerstley Borate) and lower silica, targeting SiO₂ ~3.0–3.6, Al₂O₃ ~0.30–0.40,
B₂O₃ ~0.15–0.30.

### 2. Low fire (1000 / 1100 °C): finish is ignored and silica/alumina run high
- Every Matte/Satin request at 1000 and 1100 predicts **Glossy (gloss 1.00)**:
  "Requested Satin → Glossy" 85 and "Requested Matte → Glossy" 77 findings are almost
  entirely low-fire.
- SiO₂ above limit: 58 at 1000 (up to 3.65), 21 at 1100. Al₂O₃ above 0.30: 24 at 1000.
  CaO above 0.70: 36 at each temperature. The melt is still "Balanced" because B₂O₃ is
  0.33–0.46, but the chemistry is well outside cone 06–04 norms (SiO₂ ≤ 3.0,
  Al₂O₃ ≤ 0.25–0.30).
- 1000 and 1100 produce **identical recipes** (both fall in the `< 1120` lowMidFire
  band).

*Suggested remedy:* a true low-fire matte modifier (more clay/alumina or a
calcium/barium matte via whiting + EPK, less silica) and separate bases for
cone 06 vs. cone 02 so the two temperatures differ.

### 3. "Opaque" rarely reaches Opaque
125 of 135 Opaque requests predict Semi-opaque (opacity 0.51–0.61). The opaque
modifier adds only 4 % Zircopax + 1.5 % Tin; opaque whites typically carry 8–12 %
zircon. Only Matte/High combinations at 1186–1285 reach Opaque (0.72–0.79).
Separately, 135 Semi-opaque requests predict Translucent (0.12) because no opacifier
is added for Semi-opaque at all.

*Suggested remedy:* Opaque → ~8–10 % Zircopax (+ optional 1–2 % tin);
Semi-opaque → ~3–4 % Zircopax.

### 4. Low stability + Fluxed variant over-fluxes with lithium
`RecipeModifier` adds +1.5 Li carb for Low stability and the Fluxed variant adds
another +3.5 at ≥ 1120 °C, so Low/Fluxed recipes reach **Li₂O 0.16–0.21**
(typical ≤ 0.10): 36 excursions across 1186/1222/1285. Associated predictions:
- Expansion "High (crazing risk)" — 18 recipes (71–72 ×10⁻⁷);
- Durability Soft — 39 recipes (0.37–0.49);
- Melt Runny — 3 recipes (1285 Matte/Low/Fluxed).

*Suggested remedy:* cap Li₂O at ~0.10 when Low stability and the Fluxed variant
combine (e.g. halve the Fluxed Li addition if Low is already applied, or substitute a
sodium/boron flux for part of it).

### 5. Matte chemistry is too weak at mid and high fire
- 1186: Matte predicted Satin in 46 cases (gloss 0.46–0.62); SiO₂ dips below 2.2
  (23 cases, down to 1.76) because the matte modifier removes silica rather than
  adding MgO/Al₂O₃.
- 1285: Matte/High gives SiO₂ < 3.0 (28 cases) and KNaO < 0.20 (24 cases) while
  Al₂O₃ falls *below* 0.30 for Matte/Low (21 cases).
- Generator matte at 1285 ≈ MgO 0.19, Al₂O₃ 0.37, SiO₂ ~3.0 vs. the reference
  dolomite matte at MgO 0.38, Al₂O₃ 0.52, SiO₂ 2.76.

*Suggested remedy:* matte modifier should add dolomite/talc and EPK more
aggressively (push MgO toward 0.3+, Al₂O₃ toward 0.5) rather than mainly cutting
silica; scale by stability so Matte/Low stays matte.

### 6. Finish/stability interplay produces mislabelled surfaces
- Satin/High at 1186 → Matte (6 cases, gloss 0.27–0.31).
- Glossy/High at 1186 with opacifier → Satin (8 cases, 0.61–0.65).
- Satin or Matte with Low stability → Glossy (the extra flux glosses over the
  matte modifier).

These are smaller, and most would resolve with items 4–5.

### 7. What works well
- Cone 10 Glossy/Medium/Balanced ≈ Leach 4-3-2-1 (K₂O 0.16, Na₂O 0.08, CaO 0.66,
  MgO 0.11, Al₂O₃ 0.38, SiO₂ 4.19) — a textbook cone 10 clear.
- All hard invariants hold for all 405 recipes: totals ≈ 100, no negatives, flux unity,
  no Underfired melts, no danger warnings.
- Low-expansion labels on opaque variants (~57 ×10⁻⁷) are expected and fine.

## Suggested next steps

1. ~~Add a 1200–1250 °C boron-bearing base (fixes #1).~~ Done — see Round 1.
2. ~~Raise opacifier levels (fixes #3).~~ Done — see Round 1.
3. ~~Cap combined Li₂O at ~0.10 (fixes #4, most of #6).~~ Done — see Round 1.
4. ~~Rework the matte modifier per temperature band (fixes #2 finish, #5).~~ Done — see Round 2.
5. ~~Split 1000 vs. 1100 bases and trim low-fire silica/alumina (fixes #2 limits).~~ Done — see Round 2.

After any tuning, re-run `GeneratedRecipeLimitsTest` and compare the printed report;
the hard invariants protect against regressions and the reference tests guard the
calculator and analyzer.

## Round 1 tuning — applied

Steps 1–3 above were implemented in this round.

| Change | Where |
|---|---|
| New `cone6Base()` for 1200–1259 °C: Potash Feldspar 28, Silica 22, EPK 16, Frit 3134 14, Whiting 12, Dolomite 6, Bentonite 2 (≈ SiO₂ 3.1, Al₂O₃ 0.36, B₂O₃ 0.15, CaO 0.67, MgO 0.11, KNaO 0.22). Cone 6 Fluxed variant adds +4 frit, +1 Li carb, −2 whiting, −1.5 feldspar instead of the lithium-only high-fire recipe. | `RecipeBaseFactory` |
| Fluxed lithium carbonate 3.5 → 3.0; Low stability now tops lithium up *to* that ceiling instead of stacking +1.5 on top. | `RecipeBaseFactory`, `RecipeModifier.applyStabilityAdjustments` |
| Opaque: Zircopax 4 → 10 (+1.5 tin). Semi-opaque (and null opacity): 0 → 5 Zircopax. | `RecipeModifier.applyOpacityAdjustments` |
| Rationale text for the cone 6 flux system and the semi-opaque addition. | `RecipeNarrativeBuilder` |
| `normalize()` now pushes the rounding residue onto the largest ingredient instead of whichever key happened to be last — the old behaviour produced phantom 0.01 % entries for zeroed trace materials. | `RecipeMath` |

### Audit before → after (405 recipes)

| Finding | Before | After |
|---|---|---|
| Requested Opaque → Semi-opaque | 125 | 0 |
| Requested Semi-opaque → Translucent | 135 | 10 (all 1186 Matte/Low–Medium, opacity 0.36–0.39) |
| Melt Stiff (1222 Glossy/High) | 6 | 0 |
| SiO₂ > 3.8 at 1222 | 16 | 4 (High-Silica variants, 3.82–3.96) |
| Al₂O₃ > 0.45 at 1222 | 2 | 0 |
| Li₂O > 0.15 (1186/1222/1285) | 36 | 0 |
| Expansion "High (crazing risk)" | 18 | 0 |
| Melt Runny | 3 | 0 |
| Durability Soft | 39 | 22 (Matte/Low/Fluxed combinations) |
| Requested Glossy → Satin | 8 | 20 (1186 Glossy/High now carries 5 % zircon, which the analyzer reads as stiffer) |

Unchanged, pending steps 4–5: low-fire Matte/Satin → Glossy (77 / 85), low-fire
SiO₂/Al₂O₃/CaO excursions (66 / 24 / 36+36), 1186 Matte → Satin (46), and the
1285 matte limits (SiO₂ < 3.0 ×26, KNaO < 0.2 ×24, Al₂O₃ < 0.3 ×17).

All 117 backend tests pass (98 existing + 19 validation).

## Round 2 tuning — applied

Steps 4–5: band-aware surface chemistry and split low-fire bases.

| Change | Where |
|---|---|
| New `FiringBand` enum (LOW < 1060, LOW_MID < 1120, MID < 1200, CONE_6 < 1260, HIGH) replaces scattered temperature thresholds in the base factory, modifier and narrative. | `recipe/FiringBand` |
| `lowFireBase()` (cone 06–04): Frit 3134 52, Frit 3124 14, EPK 20, Silica 12, Bentonite 2 (≈ SiO₂ 2.8, Al₂O₃ 0.28, B₂O₃ 0.61, CaO 0.68, KNaO 0.32). Frit 3124 brings alumina so the glaze is no longer pure 3134 + clay. | `RecipeBaseFactory` |
| `lowMidFireBase()` (cone 03–02): Frit 3134 37, Potash Feldspar 21, Silica 14, EPK 17, Whiting 6, Dolomite 3, Bentonite 2 (≈ SiO₂ 2.8, Al₂O₃ 0.32, B₂O₃ 0.39, CaO 0.64, KNaO 0.30). | `RecipeBaseFactory` |
| Fluxed variant per band: low fire +6 frit / −3 silica / −3 whiting; cone 6 unchanged from Round 1; mid/high +3 Li carb / −3 feldspar (the silica cut was dropped — lithium alone already lowers SiO₂). | `RecipeBaseFactory.fluxedBase` |
| High-Silica variant: +4 silica / −1 EPK (was +5 / −3) so the Si:Al ratio — and a matte request — survives the variant. | `RecipeBaseFactory.highSilicaBase` |
| Matte modifier rewritten per band. Low fire swaps boron frit for alumina frit, kaolin and **talc** (−22 Frit 3134, +12 Frit 3124, +8 EPK, +14 Talc, +3 Whiting, −12 Silica): a classic magnesia matte. Mid: +6 Dolomite, +6 EPK, −4 feldspar, −2 whiting. Cone 6: +6 Dolomite, +6 EPK, −7 Silica, −4 frit, −2 whiting, +2 feldspar. High: +6 Dolomite, +6 EPK, −4 Silica, −3 whiting, +3 feldspar. Wollastonite is no longer used for mattes. | `RecipeModifier.applyMatteAdjustments` |
| Satin is a partial matte dose per band (LOW 0.85, LOW_MID 0.55, MID 0.3, CONE_6/HIGH 0.6) — the pure-frit low-fire base sits far up the gloss curve so it needs most of the swap; the zinc/dolomite mid-fire base needs very little. | `RecipeModifier.satinDose` |
| Glossy: +1.5 silica at low fire (3.0 elsewhere), frit addition only above low fire, −4 dolomite at mid fire (−2 elsewhere). | `RecipeModifier.applySurfaceAdjustments` |
| Translucent: +1.5 silica, no longer cuts EPK (a translucent matte stays matte). | `RecipeModifier.applyOpacityAdjustments` |
| Talc and Ferro Frit 3124 promoted from builder-only to generator materials; flux-system narrative per band; tooltips for both materials in the frontend. | `RecipeIngredients`, `RecipeNarrativeBuilder`, `frontend/src/app/constants.ts` |
| Audit report accepts `-Daudit.sample=N` to print more than 4 examples per category. | `GeneratedRecipeLimitsTest` |

### Audit before → after (405 recipes)

| Finding | After Round 1 | After Round 2 |
|---|---|---|
| Requested Satin → Glossy | 85 | 8 (all High-Silica/Low-stability stacks) |
| Requested Matte → Glossy | 77 | 0 |
| Requested Matte → Satin | 46 | 31 (all Low-stability or High-Silica variants) |
| Requested Satin → Matte | 6 | 27 (all High-stability or 10 % zircon opaque, gloss 0.27–0.40) |
| Requested Glossy → Satin | 20 | 15 (1186/1285 Opaque: zircon + tin read as satin, gloss 0.61–0.68) |
| Requested Semi-opaque → Translucent | 10 | 12 (Low-stability low fire, opacity 0.36–0.40) |
| Requested Semi-opaque → Opaque | 0 | 9 (1222/1285 Matte+High, opacity 0.70–0.75) |
| SiO₂ > 3.0 at 1000 | 66 | 7 (Glossy High-Silica, 3.02–3.24) |
| SiO₂ > 3.3 at 1100 | 29 | 8 (Glossy High-Silica / Opaque) |
| CaO > 0.7 at 1000 / 1100 | 36 / 36 | 0 / 0 |
| Al₂O₃ > 0.30 at 1000 | 24 | 33 — all Matte/Satin, 0.30–0.36 |
| Al₂O₃ > 0.35 at 1100 | 0 | 24 — all Matte/Satin, 0.35–0.39 |
| B₂O₃ > 0.6 at 1000 | 0 | 18 (Glossy, 0.61–0.62) |
| SiO₂ < 2.2 at 1186 | 19 | 6 (Fluxed mattes, 2.13–2.20) |
| SiO₂ < 3.0 at 1285 | 26 | 12 (Fluxed mattes/satins, 2.82–2.98) |
| KNaO < 0.2 at 1285 | 24 | 12 (mattes, 0.19–0.20) |
| Al₂O₃ < 0.3 at 1285 | 17 | 0 |
| Al₂O₃ < 0.25 / SiO₂ < 2.5 at 1222 | 6 / 6 | 0 / 2 |
| Durability Soft | 22 | 0 |
| Melt Stiff / Runny / Underfired | 0 | 0 |

Every Balanced-variant recipe with Medium stability now lands in the requested
surface band at all five temperatures. The remaining surface mismatches are
stacked requests pulling in opposite directions — a *fluid* matte, a *stiff* or
10 %-zircon satin, a high-silica matte — where the analyzer's "wrong" label is
arguably the honest answer. The low-fire alumina excursions (0.30–0.39) are
intentional: that is where talc/kaolin mattes live, and the limit tables are
written for glossy glazes. B₂O₃ 0.61–0.62 at 1000 °C is a rounding-margin
artefact of a frit-only flux system.

All 118 backend tests pass (99 service/controller + 19 validation; the matte
test in `GlazeRecipeServiceTest` was split into a mid-fire and a low-fire case).
