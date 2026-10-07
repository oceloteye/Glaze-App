package com.glaze.backend.service.recipe;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.AnalyzeResponse;
import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeSuggestion;
import com.glaze.backend.service.GlazeRecipeService;

/**
 * Audits every generated recipe across the cone × finish × stability × opacity matrix against
 * published limit formulas and against the analyzer's own prediction of how it will fire.
 *
 * <p>Hard assertions cover invariants that must always hold. Everything else (limit-formula excursions,
 * requested-vs-predicted mismatches) is collected and printed as a findings report at the end of the
 * class so the generator can be reviewed without being retuned blindly.
 */
class GeneratedRecipeLimitsTest {

    private static final int[] TEMPS = {1000, 1100, 1186, 1222, 1285};
    private static final String[] FINISHES = {"Matte", "Satin", "Glossy"};
    private static final String[] STABILITIES = {"High", "Medium", "Low"};
    private static final String[] OPACITIES = {"Translucent", "Semi-opaque", "Opaque"};

    /**
     * Independent (not the analyzer's) published-style limit formulas, oxide → {low, high}, per band.
     * Hamer & Hamer / Currie-style ranges with tolerance; KNaO = K2O + Na2O + Li2O.
     */
    private static final TreeMap<Integer, Map<String, double[]>> LIMITS = new TreeMap<>(Map.of(
            1000, limits("SiO2", 1.5, 3.0, "Al2O3", 0.05, 0.30, "B2O3", 0.15, 0.60, "KNaO", 0.10, 0.50, "CaO", 0.10, 0.70),
            1100, limits("SiO2", 1.8, 3.3, "Al2O3", 0.10, 0.35, "B2O3", 0.10, 0.60, "KNaO", 0.10, 0.50, "CaO", 0.15, 0.70),
            1186, limits("SiO2", 2.2, 3.5, "Al2O3", 0.20, 0.40, "B2O3", 0.00, 0.50, "KNaO", 0.10, 0.40, "CaO", 0.20, 0.70,
                    "MgO", 0.00, 0.35, "ZnO", 0.00, 0.30, "Li2O", 0.00, 0.15),
            1222, limits("SiO2", 2.5, 3.8, "Al2O3", 0.25, 0.45, "B2O3", 0.00, 0.50, "KNaO", 0.10, 0.40, "CaO", 0.20, 0.70,
                    "MgO", 0.00, 0.35, "ZnO", 0.00, 0.30, "Li2O", 0.00, 0.15),
            1285, limits("SiO2", 3.0, 5.0, "Al2O3", 0.30, 0.60, "KNaO", 0.20, 0.45, "CaO", 0.30, 0.80,
                    "MgO", 0.00, 0.40, "ZnO", 0.00, 0.30, "Li2O", 0.00, 0.15)));

    private final GlazeRecipeService service = new GlazeRecipeService();
    private final Map<String, List<String>> findings = new LinkedHashMap<>();
    private int recipesAudited;

    @Test
    void everyGeneratedRecipeSatisfiesHardInvariantsAndIsAuditedAgainstLimits() {
        SoftAssertions softly = new SoftAssertions();

        for (int temp : TEMPS) {
            for (String finish : FINISHES) {
                for (String stability : STABILITIES) {
                    for (String opacity : OPACITIES) {
                        var request = new GlazeRequest("#4f7f5f", temp, finish, stability, opacity,
                                List.of(), 50, null, null, null, "oxidation", false);
                        List<RecipeSuggestion> recipes = service.generateRecipes(request);
                        softly.assertThat(recipes).as("%d %s %s %s returns three variants", temp, finish, stability, opacity).hasSize(3);

                        for (RecipeSuggestion recipe : recipes) {
                            String label = temp + " " + finish + "/" + stability + "/" + opacity + " : " + variant(recipe.name());
                            Map<String, Double> umf = ReferenceGlazeUmfTest.flatten(recipe.umf());
                            AnalyzeResponse analysis = GlazeAnalyzer.analyze(recipe.ingredients(), temp, "oxidation");
                            recipesAudited++;

                            hardInvariants(softly, label, recipe, umf, analysis);
                            auditLimits(label, temp, umf);
                            auditPrediction(label, finish, opacity, stability, analysis);
                        }
                    }
                }
            }
        }
        printFindings();
        softly.assertAll();
    }

    private static void hardInvariants(SoftAssertions softly, String label, RecipeSuggestion recipe,
                                       Map<String, Double> umf, AnalyzeResponse analysis) {
        double total = recipe.ingredients().values().stream().mapToDouble(Double::doubleValue).sum();
        softly.assertThat(total).as("%s totals 100", label).isCloseTo(100.0, org.assertj.core.data.Offset.offset(0.5));
        softly.assertThat(recipe.ingredients().values()).as("%s has no negative amounts", label).allMatch(v -> v >= 0);

        double fluxUnity = recipe.umf().fluxes().values().stream().mapToDouble(Double::doubleValue).sum();
        softly.assertThat(fluxUnity).as("%s flux unity", label).isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.01));

        // Broad physical sanity — anything outside this is not a glaze at all.
        softly.assertThat(umf.get("SiO2")).as("%s SiO2 sane", label).isBetween(1.5, 5.5);
        softly.assertThat(umf.get("Al2O3")).as("%s Al2O3 sane", label).isBetween(0.05, 0.70);
        softly.assertThat(analysis.properties().meltLabel()).as("%s melt", label).isNotEqualTo("Underfired");
    }

    private void auditLimits(String label, int temp, Map<String, Double> umf) {
        Map<String, double[]> band = LIMITS.floorEntry(temp).getValue();
        band.forEach((oxide, range) -> {
            double value = umf.getOrDefault(oxide, 0.0);
            if (value < range[0] - 1e-9) {
                note("Limit formula: " + oxide + " below " + range[0] + " at " + temp + "C",
                        label + " -> " + oxide + " = " + fmt(value));
            } else if (value > range[1] + 1e-9) {
                note("Limit formula: " + oxide + " above " + range[1] + " at " + temp + "C",
                        label + " -> " + oxide + " = " + fmt(value));
            }
        });
    }

    private void auditPrediction(String label, String finish, String opacity, String stability, AnalyzeResponse analysis) {
        var p = analysis.properties();

        boolean surfaceOk = switch (finish) {
            case "Matte" -> p.surface().equals("Matte") || p.surface().equals("Dry matte");
            case "Satin" -> p.surface().equals("Satin");
            default -> p.surface().equals("Glossy");
        };
        if (!surfaceOk) {
            note("Requested " + finish + " but analyzer predicts " + p.surface(),
                    label + " -> gloss " + fmt(p.gloss()));
        }
        if (!p.opacityLabel().equals(opacity)) {
            note("Requested " + opacity + " but analyzer predicts " + p.opacityLabel(),
                    label + " -> opacity " + fmt(p.opacity()));
        }
        if (p.meltLabel().equals("Stiff") || p.meltLabel().equals("Runny")) {
            note("Melt predicted " + p.meltLabel(), label + " -> melt " + fmt(p.melt()));
        }
        if (p.expansionLabel().startsWith("High")) {
            note("Expansion predicted high (crazing risk)", label + " -> " + fmt(p.expansion()));
        }
        if (p.durabilityLabel().equals("Soft")) {
            note("Durability predicted Soft", label + " -> " + fmt(p.durability()));
        }
        analysis.warnings().stream()
                .filter(w -> "danger".equals(w.severity()))
                .forEach(w -> note("Danger warning: " + w.title(), label));
    }

    private void printFindings() {
        int sample = Integer.getInteger("audit.sample", 4);
        var out = new StringBuilder("\n=== Generated recipe audit: ").append(recipesAudited).append(" recipes ===\n");
        findings.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue().size(), a.getValue().size()))
                .forEach(e -> {
                    out.append(String.format("%n[%3d] %s%n", e.getValue().size(), e.getKey()));
                    e.getValue().stream().limit(sample).forEach(x -> out.append("      ").append(x).append('\n'));
                    if (e.getValue().size() > sample) out.append("      ... and ").append(e.getValue().size() - sample).append(" more\n");
                });
        System.out.println(out);
    }

    private void note(String category, String detail) {
        findings.computeIfAbsent(category, k -> new ArrayList<>()).add(detail);
    }

    private static String variant(String name) {
        int dash = name.lastIndexOf("— ");
        return dash >= 0 ? name.substring(dash + 2) : name;
    }

    private static String fmt(double v) {
        return String.format("%.2f", v);
    }

    private static Map<String, double[]> limits(Object... kv) {
        var out = new LinkedHashMap<String, double[]>();
        for (int i = 0; i < kv.length; i += 3) {
            out.put((String) kv[i], new double[]{((Number) kv[i + 1]).doubleValue(), ((Number) kv[i + 2]).doubleValue()});
        }
        return out;
    }
}
