package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.AnalyzeResponse;
import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.Umf;
import com.glaze.backend.service.GlazeRecipeService;

/** Exploratory dump used to gather findings; not an assertion suite. */
class RecipeValidationReportTest {

    @Test
    void dump() {
        System.out.println("=== REFERENCE RECIPES ===");
        ReferenceGlazes.ALL.forEach(ref -> {
            var umf = UmfCalculator.calculate(ref.recipe());
            var analysis = GlazeAnalyzer.analyze(ref.recipe(), ref.tempC(), "oxidation");
            System.out.println(ref.name() + " @" + ref.tempC() + "C");
            System.out.println("  UMF " + fmt(umf));
            System.out.println("  " + props(analysis));
            System.out.println("  warnings " + analysis.warnings().stream().map(w -> w.severity() + ":" + w.title()).toList());
        });

        System.out.println("=== GENERATED MATRIX ===");
        var service = new GlazeRecipeService();
        int[] temps = {1000, 1100, 1186, 1222, 1285};
        String[] finishes = {"Matte", "Satin", "Glossy"};
        String[] stabilities = {"High", "Medium", "Low"};
        String[] opacities = {"Translucent", "Semi-opaque", "Opaque"};
        for (int temp : temps) {
            for (String finish : finishes) {
                for (String stability : stabilities) {
                    for (String opacity : opacities) {
                        var req = new GlazeRequest("#4f7f5f", temp, finish, stability, opacity, List.of(), 50, null, null, null, "oxidation", false);
                        for (var recipe : service.generateRecipes(req)) {
                            var umf = recipe.umf();
                            var analysis = GlazeAnalyzer.analyze(recipe.ingredients(), temp, "oxidation");
                            System.out.println(temp + " " + finish + " " + stability + " " + opacity + " | " + variant(recipe.name())
                                    + " | " + fmt(umf) + " | " + props(analysis));
                        }
                    }
                }
            }
        }
    }

    private static String variant(String name) {
        int dash = name.lastIndexOf("— ");
        return dash >= 0 ? name.substring(dash + 2) : name;
    }

    private static String fmt(Umf umf) {
        var all = new LinkedHashMap<String, Double>();
        all.putAll(umf.fluxes());
        all.putAll(umf.stabilizers());
        all.putAll(umf.glassFormers());
        all.putAll(umf.colorants());
        var sb = new StringBuilder();
        all.forEach((k, v) -> sb.append(k).append('=').append(v).append(' '));
        sb.append("Si:Al=").append(umf.siAlRatio());
        return sb.toString();
    }

    private static String props(AnalyzeResponse a) {
        var p = a.properties();
        return String.format("melt=%.2f %s | gloss=%.2f %s | opac=%.2f %s | dur=%.2f %s | exp=%.1f %s",
                p.melt(), p.meltLabel(), p.gloss(), p.surface(), p.opacity(), p.opacityLabel(),
                p.durability(), p.durabilityLabel(), p.expansion(), p.expansionLabel());
    }
}
