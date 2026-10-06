package com.glaze.backend.service;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.AnalyzeResponse;
import com.glaze.backend.dto.GlazeWarning;
import com.glaze.backend.service.recipe.GlazeAnalyzer;
import com.glaze.backend.service.recipe.MaterialCatalog;

class GlazeAnalyzerTest {

    /** A classic cone 6 glossy base. */
    private static final Map<String, Double> CONE_6_BASE = Map.of(
            "Potash Feldspar", 40.0, "Whiting", 20.0, "EPK Kaolin", 15.0, "Silica", 25.0);

    @Test
    void normalisesPartsToPercent() {
        var result = GlazeAnalyzer.analyze(Map.of("Potash Feldspar", 80.0, "Whiting", 40.0, "EPK Kaolin", 30.0, "Silica", 50.0), 1222, "oxidation");

        assertThat(result.totalParts()).isEqualTo(200.0);
        double sum = result.normalizedRecipe().values().stream().mapToDouble(Double::doubleValue).sum();
        assertThat(sum).isCloseTo(100.0, within(0.05));
        assertThat(result.normalizedRecipe()).containsEntry("Potash Feldspar", 40.0);
        assertThat(result.cone()).isEqualTo("6");
    }

    @Test
    void ignoresUnknownMaterialsAndZeroParts() {
        var result = GlazeAnalyzer.analyze(Map.of("Potash Feldspar", 50.0, "Unobtainium", 50.0, "Silica", 0.0), 1222, null);

        assertThat(result.normalizedRecipe()).containsOnlyKeys("Potash Feldspar");
        assertThat(result.normalizedRecipe().get("Potash Feldspar")).isEqualTo(100.0);
    }

    @Test
    void balancedCone6BaseLooksBalanced() {
        var result = GlazeAnalyzer.analyze(CONE_6_BASE, 1222, "oxidation");

        assertThat(result.umf().fluxes()).isNotEmpty();
        assertThat(result.properties().meltLabel()).isIn("Balanced", "Fluid", "Stiff");
        assertThat(result.properties().expansion()).isBetween(50.0, 80.0);
        assertThat(result.warnings()).noneMatch(w -> w.severity().equals(GlazeWarning.DANGER));
        // every analysed recipe gets the dust reminder
        assertThat(result.warnings()).anyMatch(w -> w.category().equals(GlazeWarning.TOXICITY) && w.severity().equals(GlazeWarning.INFO));
    }

    @Test
    void noFluxReportsUnfused() {
        var result = GlazeAnalyzer.analyze(Map.of("Silica", 60.0, "EPK Kaolin", 40.0), 1222, "oxidation");

        assertThat(result.umf().fluxes()).isEmpty();
        assertThat(result.properties().meltLabel()).isEqualTo("Unfused");
        assertThat(result.warnings()).anyMatch(w -> w.category().equals(GlazeWarning.MATURITY) && w.title().contains("No flux"));
    }

    @Test
    void feldsparOnlyAtLowFireNeedsBoron() {
        var result = GlazeAnalyzer.analyze(Map.of("Potash Feldspar", 70.0, "Whiting", 15.0, "EPK Kaolin", 15.0), 999, "oxidation");

        assertThat(result.warnings()).anyMatch(w -> w.title().startsWith("No low-temperature flux"));
    }

    @Test
    void heavyFritWithNoClayIsOverFluxedAndSettles() {
        var result = GlazeAnalyzer.analyze(Map.of("Ferro Frit 3134", 90.0, "Silica", 10.0), 1222, "oxidation");

        assertThat(result.properties().meltLabel()).isIn("Runny", "Fluid");
        assertThat(result.warnings()).anyMatch(w -> w.category().equals(GlazeWarning.MATURITY) && w.title().contains("run"));
        assertThat(result.warnings()).anyMatch(w -> w.category().equals(GlazeWarning.APPLICATION) && w.title().contains("Settling"));
    }

    @Test
    void sodaHeavyGlazeHasHighExpansion() {
        var sodaHeavy = Map.of("Nepheline Syenite", 70.0, "Whiting", 10.0, "EPK Kaolin", 10.0, "Silica", 10.0);
        var magnesiaHeavy = Map.of("Potash Feldspar", 30.0, "Talc", 20.0, "Whiting", 10.0, "EPK Kaolin", 15.0, "Silica", 25.0);

        var soda = GlazeAnalyzer.analyze(sodaHeavy, 1222, "oxidation");
        var magnesia = GlazeAnalyzer.analyze(magnesiaHeavy, 1222, "oxidation");

        assertThat(soda.properties().expansion()).isGreaterThan(magnesia.properties().expansion());
        assertThat(soda.warnings()).anyMatch(w -> w.category().equals(GlazeWarning.FIT) && w.title().contains("Crazing"));
    }

    @Test
    void bariumAndCopperRaiseSafetyWarnings() {
        var recipe = Map.of("Potash Feldspar", 40.0, "Barium Carbonate", 20.0, "EPK Kaolin", 15.0, "Silica", 20.0, "Copper Carbonate", 5.0);
        var result = GlazeAnalyzer.analyze(recipe, 1222, "oxidation");

        assertThat(result.umf().fluxes()).containsKey("BaO");
        assertThat(result.warnings())
                .anyMatch(w -> w.category().equals(GlazeWarning.TOXICITY) && w.severity().equals(GlazeWarning.DANGER) && w.title().startsWith("Barium Carbonate"))
                .anyMatch(w -> w.category().equals(GlazeWarning.FOOD_SAFETY) && w.title().contains("Barium"))
                .anyMatch(w -> w.category().equals(GlazeWarning.FOOD_SAFETY) && w.title().contains("Copper"));
    }

    @Test
    void reductionAddsAtmosphereNotes() {
        var recipe = Map.of("Potash Feldspar", 40.0, "Whiting", 20.0, "EPK Kaolin", 15.0, "Silica", 20.0, "Zinc Oxide", 5.0, "Red Iron Oxide", 8.0);
        AnalyzeResponse oxidation = GlazeAnalyzer.analyze(recipe, 1285, "oxidation");
        AnalyzeResponse reduction = GlazeAnalyzer.analyze(recipe, 1285, "reduction");

        assertThat(reduction.warnings()).anyMatch(w -> w.title().equals("Zinc in reduction"));
        assertThat(reduction.warnings()).anyMatch(w -> w.title().equals("Iron in reduction"));
        assertThat(oxidation.warnings()).noneMatch(w -> w.title().endsWith("in reduction"));
    }

    @Test
    void opacifiersRaiseOpacity() {
        var clear = GlazeAnalyzer.analyze(CONE_6_BASE, 1222, "oxidation");
        var white = GlazeAnalyzer.analyze(Map.of("Potash Feldspar", 40.0, "Whiting", 20.0, "EPK Kaolin", 15.0, "Silica", 25.0, "Zircopax", 12.0), 1222, "oxidation");

        assertThat(white.properties().opacity()).isGreaterThan(clear.properties().opacity());
        assertThat(white.properties().opacityLabel()).isIn("Semi-opaque", "Opaque");
    }

    @Test
    void catalogCoversEveryMaterialWithAnAnalysis() {
        assertThat(MaterialCatalog.all()).hasSizeGreaterThanOrEqualTo(38);
        for (var material : MaterialCatalog.all()) {
            assertThat(material.analysis()).as(material.name()).isNotEmpty();
            assertThat(material.maxParts()).as(material.name()).isPositive();
            assertThat(material.category()).as(material.name()).isNotBlank();
        }
    }
}
