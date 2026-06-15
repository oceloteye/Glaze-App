package com.glaze.backend.service;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeSuggestion;

class GlazeRecipeServiceTest {

    private GlazeRecipeService service;

    @BeforeEach
    void setUp() {
        service = new GlazeRecipeService();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static GlazeRequest request(String color, int tempC, String finish,
                                        String stability, List<String> effects,
                                        Integer intensity, String secondaryColor) {
        return new GlazeRequest(color, tempC, finish, stability, effects, intensity, secondaryColor, null);
    }

    private static GlazeRequest basicRequest(String color, int tempC) {
        return request(color, tempC, "Satin", "Medium", List.of(), 50, null);
    }

    /** Sums all ingredient percentages in a recipe. */
    private static double totalPercent(RecipeSuggestion recipe) {
        return recipe.ingredients().values().stream().mapToDouble(Double::doubleValue).sum();
    }

    // ── Always returns 3 named variants ──────────────────────────────────────

    @Test
    void returnsThreeRecipes() {
        var recipes = service.generateRecipes(basicRequest("#3a6bc1", 1220));
        assertThat(recipes).hasSize(3);
    }

    @Test
    void recipeNamesContainBalancedHighSilicaFluxed() {
        var recipes = service.generateRecipes(basicRequest("#3a6bc1", 1220));
        var names = recipes.stream().map(RecipeSuggestion::name).toList();
        assertThat(names).anyMatch(n -> n.contains("Balanced"));
        assertThat(names).anyMatch(n -> n.contains("High-Silica"));
        assertThat(names).anyMatch(n -> n.contains("Fluxed"));
    }

    // ── Ingredient totals normalize to 100 % ─────────────────────────────────

    @Test
    void ingredientsTotalApproximately100_lowFire() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 900));
        for (var recipe : recipes) {
            assertThat(totalPercent(recipe))
                    .as("total % for " + recipe.name())
                    .isCloseTo(100.0, org.assertj.core.data.Offset.offset(1.0));
        }
    }

    @Test
    void ingredientsTotalApproximately100_midFire() {
        var recipes = service.generateRecipes(basicRequest("#3a6bc1", 1180));
        for (var recipe : recipes) {
            assertThat(totalPercent(recipe))
                    .as("total % for " + recipe.name())
                    .isCloseTo(100.0, org.assertj.core.data.Offset.offset(1.0));
        }
    }

    @Test
    void ingredientsTotalApproximately100_highFire() {
        var recipes = service.generateRecipes(basicRequest("#1a1a1a", 1280));
        for (var recipe : recipes) {
            assertThat(totalPercent(recipe))
                    .as("total % for " + recipe.name())
                    .isCloseTo(100.0, org.assertj.core.data.Offset.offset(1.0));
        }
    }

    // ── No ingredient has a negative value ───────────────────────────────────

    @Test
    void noNegativeIngredients() {
        var recipes = service.generateRecipes(
                request("#ff0000", 1230, "Glossy", "High", List.of("Crystalline"), 200, null));
        for (var recipe : recipes) {
            recipe.ingredients().forEach((name, pct) ->
                    assertThat(pct).as(name + " in " + recipe.name()).isGreaterThanOrEqualTo(0.0));
        }
    }

    // ── Temperature-appropriate base selection ───────────────────────────────

    @Test
    void lowFireBaseUsesFrit() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 980));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Ferro Frit 3134");
        assertThat(balanced.ingredients()).doesNotContainKey("Potash Feldspar");
    }

    @Test
    void highFireBaseUsesFeldspar() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 1300));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Potash Feldspar");
        assertThat(balanced.ingredients()).doesNotContainKey("Ferro Frit 3134");
    }

    // ── Colorant mapping ─────────────────────────────────────────────────────

    @Test
    void blueColorAddsCobalCarbonate() {
        var recipes = service.generateRecipes(basicRequest("#0000cc", 1220));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Cobalt Carbonate");
    }

    @Test
    void greenColorAddsCopperCarbonate() {
        var recipes = service.generateRecipes(basicRequest("#00aa00", 1220));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Copper Carbonate");
    }

    @Test
    void redColorAddsIronOxide() {
        var recipes = service.generateRecipes(basicRequest("#cc0000", 1220));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Red Iron Oxide");
    }

    @Test
    void whiteColorAddsZircopax() {
        var recipes = service.generateRecipes(basicRequest("#f0f0f0", 1220));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Zircopax");
    }

    @Test
    void invalidHexColorProducesNoColorant() {
        // "Celadon" is not a hex color — colorant section should be skipped without error
        var recipes = service.generateRecipes(basicRequest("Celadon", 1220));
        assertThat(recipes).hasSize(3);
        recipes.forEach(r -> assertThat(totalPercent(r)).isCloseTo(100.0, org.assertj.core.data.Offset.offset(1.0)));
    }

    // ── Effect agents ─────────────────────────────────────────────────────────

    @Test
    void speckledEffectAddsIlmenite() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 100, null));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Ilmenite (granular)");
        assertThat(balanced.ingredients()).containsKey("Manganese Granules");
    }

    @Test
    void crystallineEffectAddsZincOxide() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Medium", List.of("Crystalline"), 100, null));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Zinc Oxide");
        assertThat(balanced.ingredients()).containsKey("Titanium Dioxide");
    }

    @Test
    void flameEffectAddsIronChromate() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Satin", "Medium", List.of("Flame"), 100, null));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Iron Chromate");
        assertThat(balanced.ingredients()).containsKey("Titanium Dioxide");
    }

    @Test
    void meltEffectAddsLithiumCarbonate() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Medium", List.of("Melt"), 100, null));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Lithium Carbonate");
    }

    @Test
    void opaqueEffectAddsZircopax() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Satin", "Medium", List.of("Opaque"), 100, null));
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).containsKey("Zircopax");
        assertThat(balanced.ingredients()).containsKey("Tin Oxide");
    }

    // ── Intensity scaling ─────────────────────────────────────────────────────

    @Test
    void zeroIntensityProducesNoEffectAgents() {
        var req = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 0, null);
        var recipes = service.generateRecipes(req);
        var balanced = recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
        assertThat(balanced.ingredients()).doesNotContainKey("Ilmenite (granular)");
        assertThat(balanced.ingredients()).doesNotContainKey("Manganese Granules");
    }

    @Test
    void highIntensityProducesMoreEffectAgentThanLow() {
        var lowReq  = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 25, null);
        var highReq = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 150, null);

        var lowRecipes  = service.generateRecipes(lowReq);
        var highRecipes = service.generateRecipes(highReq);

        double lowIlmenite = extractIngredient(lowRecipes, "Balanced", "Ilmenite (granular)");
        double highIlmenite = extractIngredient(highRecipes, "Balanced", "Ilmenite (granular)");

        assertThat(highIlmenite).isGreaterThan(lowIlmenite);
    }

    // ── Null intensity defaults to 50 ────────────────────────────────────────

    @Test
    void nullIntensityTreatedAs50() {
        var withNull   = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), null, null);
        var withFifty  = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 50, null);

        var recipesNull  = service.generateRecipes(withNull);
        var recipesFifty = service.generateRecipes(withFifty);

        Map<String, Double> ingredientsNull  = getBalanced(recipesNull).ingredients();
        Map<String, Double> ingredientsFifty = getBalanced(recipesFifty).ingredients();

        assertThat(ingredientsNull).isEqualTo(ingredientsFifty);
    }

    // ── Secondary color adds colorant ─────────────────────────────────────────

    @Test
    void secondaryColorAddsAdditionalColorant() {
        var withoutSecondary = request("#0000cc", 1220, "Satin", "Medium", List.of("Speckled"), 50, null);
        var withSecondary    = request("#0000cc", 1220, "Satin", "Medium", List.of("Speckled"), 50, "#cc0000");

        var recipesWithout = service.generateRecipes(withoutSecondary);
        var recipesWith    = service.generateRecipes(withSecondary);

        double cobaltWithout = extractIngredient(recipesWithout, "Balanced", "Cobalt Carbonate");
        double cobaltWith    = extractIngredient(recipesWith, "Balanced", "Cobalt Carbonate");

        // Secondary red adds Red Iron Oxide; primary blue adds Cobalt Carbonate.
        // With secondary the formula is different — secondary colorant should appear.
        assertThat(getBalanced(recipesWith).ingredients()).containsKey("Red Iron Oxide");
        assertThat(cobaltWith).isGreaterThan(0.0);
    }

    // ── Firing range labels ───────────────────────────────────────────────────

    @Test
    void firingRangeLabelLowFire() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 850));
        assertThat(getBalanced(recipes).firingRange()).contains("Low fire");
    }

    @Test
    void firingRangeLabelMidHighFire() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 1230));
        assertThat(getBalanced(recipes).firingRange()).contains("Mid");
    }

    @Test
    void firingRangeLabelHighFire() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 1300));
        assertThat(getBalanced(recipes).firingRange()).contains("High fire");
    }

    // ── Rationale is populated ────────────────────────────────────────────────

    @Test
    void rationaleIsNotBlank() {
        var recipes = service.generateRecipes(basicRequest("#3a6bc1", 1220));
        recipes.forEach(r -> assertThat(r.rationale()).isNotBlank());
    }

    @Test
    void rationaleDescribesFluxSystem() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 900));
        assertThat(getBalanced(recipes).rationale()).containsIgnoringCase("frit");
    }

    // ── Surface finish adjustments ────────────────────────────────────────────

    @Test
    void matteFinishAddsWollastonite() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Matte", "Medium", List.of(), 50, null));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Wollastonite");
    }

    // ── Recipe name format ────────────────────────────────────────────────────

    @Test
    void recipeNameContainsSurfaceFinish() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Medium", List.of(), 50, null));
        assertThat(getBalanced(recipes).name()).containsIgnoringCase("Gloss");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static RecipeSuggestion getBalanced(List<RecipeSuggestion> recipes) {
        return recipes.stream().filter(r -> r.name().contains("Balanced")).findFirst().orElseThrow();
    }

    private static double extractIngredient(List<RecipeSuggestion> recipes, String variantHint, String ingredient) {
        return recipes.stream()
                .filter(r -> r.name().contains(variantHint))
                .findFirst()
                .map(r -> r.ingredients().getOrDefault(ingredient, 0.0))
                .orElse(0.0);
    }
}
