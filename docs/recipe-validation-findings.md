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
4. Rework the matte modifier per temperature band (fixes #2 finish, #5).
5. Split 1000 vs. 1100 bases and trim low-fire silica/alumina (fixes #2 limits).

After any tuning, re-run `GeneratedRecipeLimitsTest` and compare the printed report;
the hard invariants protect against regressions and the reference tests guard the
calculator and analyzer.

## Round 1 tuning — applied

Steps 1–3 above were implemented; steps 4–5 remain open.

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
