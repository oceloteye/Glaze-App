package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import com.glaze.backend.dto.Umf;
import com.glaze.backend.service.recipe.ReferenceGlazes.ReferenceGlaze;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ground-truth check: classic published glazes must calculate to the unity formulas the literature
 * quotes for them, and the analyzer must agree with how they are known to fire.
 */
class ReferenceGlazeUmfTest {

    static List<ReferenceGlaze> references() {
        return ReferenceGlazes.ALL;
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("references")
    void umfMatchesPublishedFormula(ReferenceGlaze ref) {
        Map<String, Double> umf = flatten(UmfCalculator.calculate(ref.recipe()));

        SoftAssertions softly = new SoftAssertions();
        ref.expectedUmf().forEach((oxide, range) -> {
            double actual = umf.getOrDefault(oxide, 0.0);
            softly.assertThat(actual)
                    .as("%s — %s expected %.2f–%.2f but was %.3f", ref.name(), oxide, range[0], range[1], actual)
                    .isBetween(range[0], range[1]);
        });
        softly.assertAll();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("references")
    void fluxesSumToUnity(ReferenceGlaze ref) {
        Umf umf = UmfCalculator.calculate(ref.recipe());
        double fluxTotal = umf.fluxes().values().stream().mapToDouble(Double::doubleValue).sum();
        assertThat(fluxTotal).as("%s flux unity", ref.name()).isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.01));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("references")
    void analyzerAgreesWithKnownFiringBehaviour(ReferenceGlaze ref) {
        var analysis = GlazeAnalyzer.analyze(ref.recipe(), ref.tempC(), "oxidation");
        var props = analysis.properties();

        SoftAssertions softly = new SoftAssertions();
        softly.assertThat(props.surface())
                .as("%s surface (gloss %.2f)", ref.name(), props.gloss())
                .isIn(ref.acceptableSurfaces());
        softly.assertThat(props.meltLabel())
                .as("%s melt (%.2f)", ref.name(), props.melt())
                .isNotIn("Underfired", "Runny");
        softly.assertThat(analysis.warnings())
                .as("%s should not raise danger-level warnings", ref.name())
                .noneMatch(w -> "danger".equals(w.severity()));
        softly.assertAll();
    }

    /** Flattens the grouped UMF into one map and adds the KNaO convenience total (K2O + Na2O + Li2O). */
    static Map<String, Double> flatten(Umf umf) {
        var all = new LinkedHashMap<String, Double>();
        all.putAll(umf.fluxes());
        all.putAll(umf.stabilizers());
        all.putAll(umf.glassFormers());
        all.putAll(umf.colorants());
        all.put("KNaO", all.getOrDefault("K2O", 0.0) + all.getOrDefault("Na2O", 0.0) + all.getOrDefault("Li2O", 0.0));
        return all;
    }
}
