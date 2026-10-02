package com.glaze.backend.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.service.recipe.UmfCalculator;

class UmfCalculatorTest {

    @Test
    void fluxesSumToUnity() {
        var recipe = new LinkedHashMap<String, Double>();
        recipe.put("Potash Feldspar", 40.0);
        recipe.put("Whiting", 20.0);
        recipe.put("EPK Kaolin", 15.0);
        recipe.put("Silica", 25.0);

        var umf = UmfCalculator.calculate(recipe);

        double fluxTotal = umf.fluxes().values().stream().mapToDouble(Double::doubleValue).sum();
        assertThat(fluxTotal).isCloseTo(1.0, within(0.01));
        assertThat(umf.fluxes()).containsKeys("K2O", "Na2O", "CaO");
        assertThat(umf.stabilizers()).containsKey("Al2O3");
        assertThat(umf.glassFormers()).containsKey("SiO2");
        assertThat(umf.colorants()).containsKey("Fe2O3");
    }

    @Test
    void siAlRatioMatchesMolarRatio() {
        var recipe = Map.of("Potash Feldspar", 40.0, "Whiting", 20.0, "EPK Kaolin", 15.0, "Silica", 25.0);
        var umf = UmfCalculator.calculate(recipe);

        double si = umf.glassFormers().get("SiO2");
        double al = umf.stabilizers().get("Al2O3");
        assertThat(umf.siAlRatio()).isCloseTo(si / al, within(0.1));
        // Classic cone 6 glossy base lands roughly in the 6–9 Si:Al band.
        assertThat(umf.siAlRatio()).isBetween(5.0, 10.0);
    }

    @Test
    void pureSilicaHasNoUnity() {
        var umf = UmfCalculator.calculate(Map.of("Silica", 100.0));
        assertThat(umf.fluxes()).isEmpty();
        assertThat(umf.siAlRatio()).isZero();
    }

    @Test
    void generatedRecipesCarryUmf() {
        var service = new GlazeRecipeService();
        var request = new GlazeRequest("#3a6bc1", 1222, "Glossy", "Medium", List.of(), 50, null, null, null, "oxidation", true);
        for (var recipe : service.generateRecipes(request)) {
            assertThat(recipe.umf()).isNotNull();
            assertThat(recipe.umf().fluxes()).isNotEmpty();
            assertThat(recipe.umf().glassFormers()).containsKey("SiO2");
            assertThat(recipe.umf().r2oShare()).isBetween(0.0, 1.0);
        }
    }
}
