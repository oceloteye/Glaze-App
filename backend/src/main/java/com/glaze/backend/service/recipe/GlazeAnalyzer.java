package com.glaze.backend.service.recipe;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.glaze.backend.dto.AnalyzeResponse;
import com.glaze.backend.dto.GlazeProperties;
import com.glaze.backend.dto.GlazeWarning;
import com.glaze.backend.dto.MaterialInfo;

import static com.glaze.backend.dto.GlazeWarning.*;
import static com.glaze.backend.service.recipe.RecipeIngredients.*;
import static com.glaze.backend.service.recipe.UmfCalculator.*;

/**
 * Turns a parts-based recipe into a normalised recipe, UMF, predicted properties and educational warnings.
 *
 * <p>Everything here is an estimate from typical material analyses and published limit formulas;
 * the warnings are framed as learning prompts rather than verdicts.
 */
public final class GlazeAnalyzer {

    /** Appen-style molar expansion factors, 10⁻⁷/°C per mole fraction. */
    private static final Map<String, Double> EXPANSION_FACTOR = Map.ofEntries(
            Map.entry(SIO2, 38.0), Map.entry(AL2O3, -30.0), Map.entry(B2O3, -50.0),
            Map.entry(K2O, 465.0), Map.entry(NA2O, 395.0), Map.entry(LI2O, 270.0),
            Map.entry(CAO, 130.0), Map.entry(MGO, 60.0), Map.entry(ZNO, 50.0),
            Map.entry(BAO, 200.0), Map.entry(SRO, 160.0),
            Map.entry(TIO2, -15.0), Map.entry(ZRO2, -60.0), Map.entry(SNO2, -45.0), Map.entry(P2O5, 140.0),
            Map.entry(FE2O3, 55.0), Map.entry(CUO, 30.0), Map.entry(COO, 50.0),
            Map.entry(MNO, 105.0), Map.entry(CR2O3, 51.0), Map.entry(NIO, 50.0));

    /** Limit-formula anchors: tempC → {SiO2 low, SiO2 high, Al2O3 low, Al2O3 high}. Interpolated between rows. */
    private static final int[] LIMIT_TEMPS = {950, 1060, 1180, 1222, 1285};
    private static final double[][] LIMITS = {
            {1.5, 3.0, 0.05, 0.25},
            {1.8, 3.2, 0.10, 0.30},
            {2.2, 3.5, 0.20, 0.40},
            {2.5, 3.8, 0.25, 0.45},
            {3.0, 5.0, 0.30, 0.60},
    };

    private static final List<String> CLAYS = List.of(EPK_KAOLIN, BALL_CLAY, BENTONITE);
    private static final List<String> CARBONATES = List.of(
            WHITING, DOLOMITE, LITHIUM_CARBONATE, STRONTIUM_CARBONATE, BARIUM_CARBONATE,
            COPPER_CARBONATE, COBALT_CARBONATE, MANGANESE_DIOXIDE, MANGANESE_GRANULES);
    private static final List<String> COPPER = List.of(COPPER_CARBONATE, COPPER_OXIDE);
    private static final List<String> IRON = List.of(RED_IRON_OXIDE, YELLOW_IRON_OXIDE, IRON_OXIDE, IRON_CHROMATE, ILMENITE_GRANULAR);
    private static final List<String> MANGANESE = List.of(MANGANESE_DIOXIDE, MANGANESE_GRANULES);
    private static final List<String> COLOURANTS_AND_OPACIFIERS = List.of(
            RED_IRON_OXIDE, YELLOW_IRON_OXIDE, IRON_OXIDE, COBALT_CARBONATE, COBALT_OXIDE, COPPER_CARBONATE, COPPER_OXIDE,
            MANGANESE_DIOXIDE, MANGANESE_GRANULES, RUTILE, TITANIUM_DIOXIDE, ILMENITE_GRANULAR, IRON_CHROMATE,
            CHROME_OXIDE, NICKEL_OXIDE, ZIRCOPAX, TIN_OXIDE);

    private GlazeAnalyzer() {
    }

    public static AnalyzeResponse analyze(Map<String, Double> parts, int firingTempC, String atmosphere) {
        boolean reduction = atmosphere != null && atmosphere.toLowerCase(Locale.ROOT).startsWith("red");
        String cone = FiringScheduleBuilder.nearestCone(firingTempC);

        var known = new LinkedHashMap<String, Double>();
        parts.forEach((name, amount) -> {
            if (amount != null && amount > 0 && MaterialCatalog.find(name).isPresent()) known.put(name, amount);
        });
        double total = known.values().stream().mapToDouble(Double::doubleValue).sum();

        var recipe = new LinkedHashMap<String, Double>();
        known.forEach((name, amount) -> recipe.put(name, round(amount / total * 100.0, 2)));

        var umf = UmfCalculator.calculate(recipe);
        var moles = UmfCalculator.unityMoles(recipe);
        var warnings = new ArrayList<GlazeWarning>();

        if (recipe.isEmpty() || moles.isEmpty()) {
            warnings.add(new GlazeWarning(CAUTION, MATURITY, "No flux — this will not melt",
                    "A glaze needs fluxes (feldspar, frit, whiting, dolomite, talc…) to melt the silica and alumina. "
                            + "Without any R₂O or RO oxides the unity formula cannot be calculated."));
            addHandlingWarnings(recipe, warnings);
            return new AnalyzeResponse(recipe, round(total, 2), cone, umf,
                    new GlazeProperties(0, "Unfused", 0, "Dry", 1, "Opaque", 0, "Very poor", 0, "n/a"), warnings);
        }

        double si = moles.getOrDefault(SIO2, 0.0);
        double al = moles.getOrDefault(AL2O3, 0.0);
        double b = moles.getOrDefault(B2O3, 0.0);
        double li = moles.getOrDefault(LI2O, 0.0);
        double kna = moles.getOrDefault(K2O, 0.0) + moles.getOrDefault(NA2O, 0.0);
        double cao = moles.getOrDefault(CAO, 0.0);
        double mgo = moles.getOrDefault(MGO, 0.0);
        double zno = moles.getOrDefault(ZNO, 0.0);
        double bao = moles.getOrDefault(BAO, 0.0);
        double sro = moles.getOrDefault(SRO, 0.0);
        double zr = moles.getOrDefault(ZRO2, 0.0);
        double sn = moles.getOrDefault(SNO2, 0.0);
        double ti = moles.getOrDefault(TIO2, 0.0);
        double p = moles.getOrDefault(P2O5, 0.0);

        double[] limit = limitsFor(firingTempC);
        double siPos = (si - limit[0]) / (limit[1] - limit[0]);
        double alPos = (al - limit[2]) / (limit[3] - limit[2]);

        // ── Melt / maturity ──────────────────────────────────────────────────
        // 0 ≈ low edge of the limit band (fluid), 1 ≈ high edge (stiff); boron and lithium loosen the melt.
        double stiffness = 0.5 * siPos + 0.5 * alPos - b * 1.2 - li * 0.8 - zno * 0.3;
        double melt = clamp(1.0 - (stiffness + 0.2) / 1.6, 0, 1);
        String meltLabel = stiffness > 1.5 ? "Underfired" : stiffness > 1.05 ? "Stiff"
                : stiffness > 0.15 ? "Balanced" : stiffness > -0.35 ? "Fluid" : "Runny";

        // ── Gloss / surface ──────────────────────────────────────────────────
        double siAl = al > 0 ? si / al : 20.0;
        double gloss = clamp((siAl - 4.0) / 5.0, 0, 1)
                - mgo * 1.5 - Math.max(0, cao - 0.7) * 1.0 - Math.max(0, bao + sro - 0.3) * 1.0
                + b * 0.5 - (zr + sn + ti) * 0.8 - Math.max(0, stiffness - 1.0) * 1.0;
        gloss = clamp(gloss, 0, 1);
        String surface = gloss > 0.7 ? "Glossy" : gloss > 0.4 ? "Satin" : gloss > 0.15 ? "Matte" : "Dry matte";

        // ── Opacity ──────────────────────────────────────────────────────────
        double opacity = clamp(0.1 + zr * 4.0 + sn * 5.0 + ti * 2.5 + p * 2.0
                + (gloss < 0.4 ? 0.25 : 0) + Math.max(0, stiffness - 1.0) * 0.4, 0, 1);
        String opacityLabel = opacity > 0.7 ? "Opaque" : opacity > 0.4 ? "Semi-opaque" : "Translucent";

        // ── Durability ───────────────────────────────────────────────────────
        double durability = 0.55 + 0.2 * clamp(siPos, -1, 1) + 0.2 * clamp(alPos, -1, 1)
                - Math.max(0, b - 0.4) * 0.8 - Math.max(0, kna - 0.5) * 0.6 - li * 0.5
                - Math.max(0, stiffness - 1.2) * 0.5 - Math.max(0, bao - 0.2) * 0.5;
        durability = clamp(durability, 0, 1);
        String durabilityLabel = durability > 0.75 ? "Hard & durable" : durability > 0.5 ? "Good"
                : durability > 0.3 ? "Soft" : "Very soft";

        // ── Thermal expansion ────────────────────────────────────────────────
        double expansion = expansion(moles);
        String expansionLabel = expansion > 78 ? "Very high (crazing likely)" : expansion > 70 ? "High (crazing risk)"
                : expansion > 58 ? "Moderate (fits most stoneware)" : expansion > 50 ? "Low" : "Very low (shivering risk)";

        var properties = new GlazeProperties(
                round(melt, 2), meltLabel, round(gloss, 2), surface, round(opacity, 2), opacityLabel,
                round(durability, 2), durabilityLabel, round(expansion, 1), expansionLabel);

        // ── Warnings ─────────────────────────────────────────────────────────
        addHandlingWarnings(recipe, warnings);
        addFoodSafetyWarnings(recipe, moles, siPos, alPos, b, warnings);
        addFitWarnings(expansion, warnings);
        addMaturityWarnings(cone, firingTempC, stiffness, siPos, alPos, b, li, warnings);
        addApplicationWarnings(recipe, zno, reduction, warnings);

        return new AnalyzeResponse(recipe, round(total, 2), cone, umf, properties, List.copyOf(warnings));
    }

    // ── Warning groups ──────────────────────────────────────────────────────

    private static void addHandlingWarnings(Map<String, Double> recipe, List<GlazeWarning> out) {
        if (recipe.isEmpty()) return;
        out.add(new GlazeWarning(INFO, TOXICITY, "Dust precautions",
                "Every dry glaze material is respirable dust, and silica, feldspar and clay cause silicosis over time. "
                        + "Weigh and mix with a fitted respirator, wet-clean spills, and never eat in the glaze area."));
        for (var entry : recipe.entrySet()) {
            MaterialInfo material = MaterialCatalog.find(entry.getKey()).orElse(null);
            if (material == null || material.hazard() == null) continue;
            String severity = isHighHazard(material.name()) ? DANGER : CAUTION;
            out.add(new GlazeWarning(severity, TOXICITY, material.name() + " — handling", material.hazard()));
        }
    }

    private static boolean isHighHazard(String name) {
        return name.equals(BARIUM_CARBONATE) || name.equals(NICKEL_OXIDE);
    }

    private static void addFoodSafetyWarnings(Map<String, Double> recipe, Map<String, Double> moles,
                                              double siPos, double alPos, double b, List<GlazeWarning> out) {
        double bao = moles.getOrDefault(BAO, 0.0);
        if (bao > 0) {
            out.add(new GlazeWarning(bao > 0.1 ? DANGER : CAUTION, FOOD_SAFETY, "Barium on a food surface",
                    String.format(Locale.ROOT, "BaO is %.2f in the unity formula. Barium leaches from matte, underfired or barium-rich glazes; "
                            + "use strontium carbonate instead for anything that touches food.", bao)));
        }
        double cuPct = sum(recipe, COPPER);
        if (cuPct > 2.5) {
            out.add(new GlazeWarning(cuPct > 5 ? DANGER : CAUTION, FOOD_SAFETY, "Copper may leach",
                    String.format(Locale.ROOT, "%.1f%% copper is above the ~2–3%% usually considered safe on liner glazes. "
                            + "Copper leaches into acidic food and drink, especially from fluid or soft glazes.", cuPct)));
        }
        double mnPct = sum(recipe, MANGANESE);
        if (mnPct > 3) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "Manganese may leach",
                    String.format(Locale.ROOT, "%.1f%% manganese is high for a food surface; keep liner glazes below roughly 3–4%% and test for leaching.", mnPct)));
        }
        double coPct = sum(recipe, List.of(COBALT_CARBONATE, COBALT_OXIDE));
        if (coPct > 2) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "Heavy cobalt saturation",
                    String.format(Locale.ROOT, "%.1f%% cobalt is far more than needed for a strong blue (0.5–1%%). Saturated colourants are more likely to leach and go metallic.", coPct)));
        }
        double crPct = sum(recipe, List.of(CHROME_OXIDE, IRON_CHROMATE));
        if (crPct > 2) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "High chrome",
                    String.format(Locale.ROOT, "%.1f%% chrome is a lot; chrome is refractory and undissolved chrome on a food surface is a leaching concern.", crPct)));
        }
        if (recipe.containsKey(NICKEL_OXIDE)) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "Nickel on a food surface",
                    "Nickel can leach from glazes and is a common contact allergen. Keep nickel glazes for decorative surfaces."));
        }
        double li = moles.getOrDefault(LI2O, 0.0);
        if (li > 0.1) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "Lithium-heavy flux",
                    String.format(Locale.ROOT, "Li₂O at %.2f makes a very alkaline glass that can leach lithium unless it is well supplied with silica and alumina.", li)));
        }
        if (siPos < 0 || alPos < 0) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "Soft glass — below limit formula",
                    "SiO₂ or Al₂O₃ is below the usual range for this cone. Under-supplied glasses are softer, scratch more easily and release colourants and fluxes more readily. "
                            + "Add silica and/or kaolin to harden the glaze."));
        }
        if (b > 0.6) {
            out.add(new GlazeWarning(CAUTION, FOOD_SAFETY, "Very high boron",
                    String.format(Locale.ROOT, "B₂O₃ at %.2f makes a soft, low-durability glass that is more prone to leaching and to clouding (boron blue).", b)));
        }
    }

    private static void addFitWarnings(double expansion, List<GlazeWarning> out) {
        if (expansion > 78) {
            out.add(new GlazeWarning(CAUTION, FIT, "Crazing very likely",
                    String.format(Locale.ROOT, "Estimated expansion %.0f ×10⁻⁷/°C is well above most clay bodies (≈55–70). The glaze will shrink more than the pot on cooling and crack into a craze network. "
                            + "Swap sodium/potassium for calcium or magnesium, add silica, or try talc, spodumene or lithium.", expansion)));
        } else if (expansion > 70) {
            out.add(new GlazeWarning(CAUTION, FIT, "Crazing risk",
                    String.format(Locale.ROOT, "Estimated expansion %.0f ×10⁻⁷/°C is on the high side. Crazing depends on the clay body, so test; lowering Na₂O/K₂O or adding silica reduces expansion.", expansion)));
        } else if (expansion < 50) {
            out.add(new GlazeWarning(CAUTION, FIT, "Shivering risk",
                    String.format(Locale.ROOT, "Estimated expansion %.0f ×10⁻⁷/°C is very low. A glaze that shrinks much less than the body is squeezed in compression and can flake off rims and edges (shivering). "
                            + "Reduce lithium, magnesium or boron, or add a little soda feldspar.", expansion)));
        } else {
            out.add(new GlazeWarning(INFO, FIT, "Expansion looks workable",
                    String.format(Locale.ROOT, "Estimated expansion %.0f ×10⁻⁷/°C is within the range most stoneware and porcelain bodies tolerate. Fit still varies by body and thickness — a freeze/boil test confirms it.", expansion)));
        }
    }

    private static void addMaturityWarnings(String cone, int tempC, double stiffness, double siPos, double alPos,
                                            double b, double li, List<GlazeWarning> out) {
        if (tempC < 1100 && b < 0.1 && li < 0.1) {
            out.add(new GlazeWarning(CAUTION, MATURITY, "No low-temperature flux for cone " + cone,
                    "Feldspar, whiting and dolomite are not active fluxes below about cone 1. At this temperature the glaze needs boron (a frit or Gerstley Borate) or lithium to melt."));
        }
        if (stiffness > 1.5) {
            out.add(new GlazeWarning(CAUTION, MATURITY, "Likely underfired at cone " + cone,
                    "Silica and/or alumina are well above the limit formula for this cone, so the fluxes cannot melt everything. Expect a dry, rough, possibly crawled surface. "
                            + "Reduce silica and kaolin or increase feldspar, frit or whiting."));
        } else if (stiffness > 1.05) {
            out.add(new GlazeWarning(INFO, MATURITY, "Stiff melt",
                    "The glaze sits toward the stiff end of the limit formula: good for holding texture and for vertical work, but colours may look dry and matte."));
        } else if (stiffness < -0.35) {
            out.add(new GlazeWarning(CAUTION, MATURITY, "Over-fluxed — likely to run",
                    "Silica and alumina are below the limit formula for cone " + cone + ", so there is more flux than glass to hold it. "
                            + "Expect running, pooling on shelves and a glassy, possibly crazed surface. Add kaolin and silica."));
        } else if (stiffness < 0.15) {
            out.add(new GlazeWarning(INFO, MATURITY, "Fluid melt",
                    "This glaze will move in the firing — great for depth and breaking over texture; keep it thin near the foot and use a catch tray."));
        }
        if (tempC > 1200 && b > 0.4) {
            out.add(new GlazeWarning(INFO, MATURITY, "High boron for cone " + cone,
                    "This much boron is more typical of low fire. At stoneware temperatures it will be very fluid and may cloud or boil."));
        }
        if (siPos > 1 && alPos < 0) {
            out.add(new GlazeWarning(INFO, MATURITY, "Silica high, alumina low",
                    "Plenty of glass former but little stabiliser: a glossy but potentially runny glaze that may crystallise on cooling. Swapping some silica for kaolin balances it."));
        }
    }

    private static void addApplicationWarnings(Map<String, Double> recipe, double zno, boolean reduction, List<GlazeWarning> out) {
        double clayPct = sum(recipe, CLAYS);
        if (clayPct > 25) {
            out.add(new GlazeWarning(CAUTION, APPLICATION, "Crawling risk — high clay",
                    String.format(Locale.ROOT, "%.0f%% clay gives a high drying shrinkage; the raw coat can crack and then crawl into beads in the kiln. "
                            + "Replace part of the kaolin with calcined kaolin or add alumina via feldspar instead.", clayPct)));
        } else if (clayPct < 5) {
            out.add(new GlazeWarning(CAUTION, APPLICATION, "Settling — little or no clay",
                    "Clay keeps the glaze suspended and gives the dry coat strength. With under 5% clay it will settle into a hard pan in the bucket and dust off the pot; add 1–2% bentonite or some kaolin."));
        }
        double bentonitePct = recipe.getOrDefault(BENTONITE, 0.0);
        if (bentonitePct > 3) {
            out.add(new GlazeWarning(INFO, APPLICATION, "Bentonite above 3%",
                    "More bentonite makes the slurry gel, slows drying and increases cracking of the raw coat."));
        }
        if (zno > 0.25 || recipe.getOrDefault(ZINC_OXIDE, 0.0) > 8) {
            out.add(new GlazeWarning(CAUTION, APPLICATION, "High zinc — crawling and crystals",
                    "Zinc oxide shrinks a lot as the glaze dries and melts, encouraging crawling, and at this level it will grow zinc-silicate crystals on a slow cool. "
                            + "Calcined zinc or lower amounts reduce the crawling."));
        }
        double carbonatePct = sum(recipe, CARBONATES);
        if (carbonatePct > 25) {
            out.add(new GlazeWarning(CAUTION, APPLICATION, "Pinholing — lots of carbonates",
                    String.format(Locale.ROOT, "%.0f%% carbonates release carbon dioxide as they decompose. If the glaze seals over before gassing finishes, bubbles leave pinholes. "
                            + "Swap some whiting for wollastonite and hold at peak temperature.", carbonatePct)));
        }
        double colourantPct = sum(recipe, COLOURANTS_AND_OPACIFIERS);
        if (colourantPct > 15) {
            out.add(new GlazeWarning(INFO, APPLICATION, "Heavy colourant load",
                    String.format(Locale.ROOT, "%.0f%% colourants and opacifiers. Beyond ~10–15%% they stop dissolving, so expect metallic, crusty or crawled surfaces.", colourantPct)));
        }
        if (reduction) {
            if (recipe.containsKey(ZINC_OXIDE)) {
                out.add(new GlazeWarning(CAUTION, APPLICATION, "Zinc in reduction",
                        "Zinc oxide reduces to metallic zinc and volatilises in a reduction kiln, leaving crawled, blistered or dull patches. It is best kept for oxidation."));
            }
            if (sum(recipe, COPPER) > 0) {
                out.add(new GlazeWarning(INFO, APPLICATION, "Copper in reduction",
                        "Small copper additions (0.3–1%) in a reduction firing can give oxblood and flambé reds instead of green; more copper or heavier reduction goes liver-coloured."));
            }
            if (sum(recipe, IRON) > 0) {
                out.add(new GlazeWarning(INFO, APPLICATION, "Iron in reduction",
                        "In reduction iron shifts from amber toward celadon greens at 1–3% and tenmoku blacks around 8–10%. Heavy iron glazes can bloat if reduction starts too early."));
            }
            if (sum(recipe, MANGANESE) > 3) {
                out.add(new GlazeWarning(CAUTION, APPLICATION, "Manganese in reduction",
                        "Manganese gives off oxygen as it reduces, which can cause bloating and blistering in heavily manganese glazes."));
            }
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    static double expansion(Map<String, Double> unityMoles) {
        double totalMoles = unityMoles.values().stream().mapToDouble(Double::doubleValue).sum();
        if (totalMoles <= 0) return 0;
        double sum = 0;
        for (var entry : unityMoles.entrySet()) {
            sum += entry.getValue() / totalMoles * EXPANSION_FACTOR.getOrDefault(entry.getKey(), 0.0);
        }
        return sum;
    }

    static double[] limitsFor(int tempC) {
        if (tempC <= LIMIT_TEMPS[0]) return LIMITS[0];
        int last = LIMIT_TEMPS.length - 1;
        if (tempC >= LIMIT_TEMPS[last]) return LIMITS[last];
        for (int i = 0; i < last; i++) {
            if (tempC <= LIMIT_TEMPS[i + 1]) {
                double t = (double) (tempC - LIMIT_TEMPS[i]) / (LIMIT_TEMPS[i + 1] - LIMIT_TEMPS[i]);
                double[] out = new double[4];
                for (int k = 0; k < 4; k++) out[k] = LIMITS[i][k] + (LIMITS[i + 1][k] - LIMITS[i][k]) * t;
                return out;
            }
        }
        return LIMITS[last];
    }

    private static double sum(Map<String, Double> recipe, List<String> names) {
        return names.stream().mapToDouble(n -> recipe.getOrDefault(n, 0.0)).sum();
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
