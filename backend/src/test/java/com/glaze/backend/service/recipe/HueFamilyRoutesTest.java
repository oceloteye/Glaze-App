package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.GlazeRequest;

import static com.glaze.backend.service.recipe.RecipeIngredients.CHROME_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COBALT_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COPPER_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.GERSTLEY_BORATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.RED_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.TIN_OXIDE;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The palette promises a colourant system per family; these pin the routing and make sure every
 * family produces a usable, leading route at any slider position.
 */
class HueFamilyRoutesTest {

    static List<String> families() {
        return HueFamilyRoutes.FAMILIES.stream().sorted().toList();
    }

    private static GlazeRequest request(String family, int saturation, int depth, int tempC, String atmosphere) {
        return new GlazeRequest("#808080", tempC, "Glossy", "Medium", null, List.of(), 50,
                null, null, null, atmosphere, null, family, saturation, depth);
    }

    private static Map<String, Double> apply(ColourRoute route) {
        Map<String, Double> formula = new LinkedHashMap<>(
                route.baseOverride() != null ? route.baseOverride() : RecipeBaseFactory.standardBase(1222));
        route.colourants().accept(formula);
        return formula;
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("families")
    void everyFamilyLeadsWithItsSignatureAtEverySliderExtreme(String family) {
        for (int saturation : new int[] {0, 50, 100}) {
            for (int depth : new int[] {0, 50, 100}) {
                for (String atmosphere : new String[] {"oxidation", "reduction"}) {
                    Optional<ColourRoute> route = HueFamilyRoutes.primary(request(family, saturation, depth, 1222, atmosphere));
                    assertThat(route).as("%s s=%d d=%d %s", family, saturation, depth, atmosphere).isPresent();
                    assertThat(route.get().fitness()).isEqualTo(HueFamilyRoutes.FAMILY_FITNESS);
                    assertThat(route.get().signature()).isNotEmpty();
                    Map<String, Double> formula = apply(route.get());
                    for (String material : route.get().signature()) {
                        assertThat(formula.getOrDefault(material, 0.0))
                                .as("%s s=%d d=%d %s adds %s", family, saturation, depth, atmosphere, material)
                                .isGreaterThan(0.0);
                    }
                }
            }
        }
    }

    @Test
    void unknownOrMissingFamilyYieldsNoRoute() {
        assertThat(HueFamilyRoutes.primary(request(null, 50, 50, 1222, null))).isEmpty();
        assertThat(HueFamilyRoutes.primary(request("ultraviolet", 50, 50, 1222, null))).isEmpty();
    }

    @Test
    void stainOnlyFamiliesAreFlaggedInTheSummary() {
        for (String family : HueFamilyRoutes.STAIN_ONLY) {
            String summary = HueFamilyRoutes.primary(request(family, 80, 50, 1222, "oxidation")).orElseThrow().summary();
            assertThat(summary).as(family).contains("inclusion");
        }
        String blue = HueFamilyRoutes.primary(request("blue", 80, 50, 1222, "oxidation")).orElseThrow().summary();
        assertThat(blue).doesNotContain("inclusion");
    }

    @Test
    void depthScalesTheDose() {
        double light = apply(HueFamilyRoutes.primary(request("blue", 70, 10, 1222, null)).orElseThrow()).get(COBALT_CARBONATE);
        double deep = apply(HueFamilyRoutes.primary(request("blue", 70, 90, 1222, null)).orElseThrow()).get(COBALT_CARBONATE);
        assertThat(deep).isGreaterThan(light * 2);
    }

    @Test
    void wineIsChromeTinInBoronLimeMeltAtMidFire() {
        ColourRoute route = HueFamilyRoutes.primary(request("wine", 50, 50, 1222, "oxidation")).orElseThrow();
        assertThat(route.name()).isEqualTo("Chrome-tin wine");
        assertThat(route.baseOverride()).containsKey(GERSTLEY_BORATE);
        Map<String, Double> formula = apply(route);
        assertThat(formula.get(TIN_OXIDE)).isEqualTo(5.0);
        assertThat(formula.get(CHROME_OXIDE)).isBetween(0.2, 0.6);
    }

    @Test
    void redsFollowTheAtmosphere() {
        assertThat(HueFamilyRoutes.primary(request("rust-red", 50, 50, 1222, "oxidation")).orElseThrow().name())
                .isEqualTo("Iron-saturate red");
        assertThat(HueFamilyRoutes.primary(request("rust-red", 50, 50, 1280, "reduction")).orElseThrow().name())
                .isEqualTo("Iron-saturate kaki");
        ColourRoute copperRed = HueFamilyRoutes.primary(request("bright-red", 50, 50, 1280, "reduction")).orElseThrow();
        assertThat(copperRed.name()).isEqualTo("Copper red");
        assertThat(apply(copperRed).get(COPPER_CARBONATE)).isLessThanOrEqualTo(0.5);
        assertThat(apply(copperRed).get(RED_IRON_OXIDE)).isNull();
    }

    @Test
    void secondaryColourIsLayeredOnTopOfTheFamilyRoute() {
        GlazeRequest withSecondary = new GlazeRequest("#808080", 1222, "Glossy", "Medium", null, List.of("Two-tone"), 50,
                "#2244aa", null, null, "oxidation", null, "amber", 50, 50);
        Map<String, Double> formula = apply(HueFamilyRoutes.primary(withSecondary).orElseThrow());
        assertThat(formula.getOrDefault(RED_IRON_OXIDE, 0.0)).isGreaterThan(0.0);
        assertThat(formula.getOrDefault(COBALT_CARBONATE, 0.0)).isGreaterThan(0.0);
    }
}
