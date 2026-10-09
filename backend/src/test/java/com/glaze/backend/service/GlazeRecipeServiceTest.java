package com.glaze.backend.service;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeSuggestion;

class GlazeRecipeServiceTest {

    private final GlazeRecipeService service = new GlazeRecipeService();

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static GlazeRequest request(String color, int tempC, String finish,
                                        String stability, List<String> effects,
                                        Integer intensity, String secondaryColor) {
        return new GlazeRequest(color, tempC, finish, stability, null, effects, intensity, secondaryColor, null, null, null, null);
    }

    private static GlazeRequest basicRequest(String color, int tempC) {
        return request(color, tempC, "Satin", "Medium", List.of(), 50, null);
    }

    /** Sums all ingredient percentages in a recipe. */
    private static double totalPercent(RecipeSuggestion recipe) {
        return recipe.ingredients().values().stream().mapToDouble(value -> value == null ? 0.0 : value).sum();
    }

    // ── Always returns 3 named variants ──────────────────────────────────────

    @Test
    void returnsThreeRecipes() {
        var recipes = service.generateRecipes(basicRequest("#3a6bc1", 1220));
        assertThat(recipes).hasSize(3);
    }

    @Test
    void recipeNamesCarryTheColourRouteAndAreDistinct() {
        var recipes = service.generateRecipes(basicRequest("#3a6bc1", 1220));
        var names = recipes.stream().map(recipe -> recipe.name()).toList();
        assertThat(names).doesNotHaveDuplicates();
        assertThat(names).allMatch(n -> n.contains(" — "));
        assertThat(recipes).allMatch(recipe -> recipe.route() != null && !recipe.route().name().isBlank());
        // a saturated royal blue has one plausible route (cobalt), so the melt variants fill the other slots
        assertThat(names).anyMatch(n -> n.contains("Cobalt") && n.contains("Balanced"));
        assertThat(names).anyMatch(n -> n.contains("High-Silica"));
        assertThat(names).anyMatch(n -> n.contains("Fluxed"));
    }

    @Test
    void mutedGreenOffersDistinctColourantRoutes() {
        var recipes = service.generateRecipes(basicRequest("#5f7e58", 1220));
        var routes = recipes.stream().map(recipe -> recipe.route().name()).toList();
        assertThat(recipes.stream().map(RecipeSuggestion::name)).doesNotHaveDuplicates();
        assertThat(routes).anyMatch(n -> n.contains("Chrome"));
        var chrome = recipes.stream().filter(r -> r.route().name().contains("Chrome")).findFirst().orElseThrow();
        assertThat(chrome.ingredients().getOrDefault("Chrome Oxide", 0.0)).isGreaterThan(0.1);
        assertThat(chrome.route().signature()).contains("Chrome Oxide");
    }

    @Test
    void chromeLeadsForAMutedGreen() {
        var recipes = service.generateRecipes(basicRequest("#5f7e58", 1220));
        assertThat(recipes.get(0).route().name()).isEqualTo("Chrome green");
    }

    @Test
    void bariumTurquoiseLeadsAtHighFireUnlessFoodSafe() {
        var open = new GlazeRequest("#3aa6a0", 1260, "Satin", "Medium", null, List.of(), 50, null, null, null, null, false);
        var openRecipes = service.generateRecipes(open);
        assertThat(openRecipes.get(0).route().name()).isEqualTo("Copper in barium");
        assertThat(openRecipes.get(0).ingredients().getOrDefault("Barium Carbonate", 0.0)).isGreaterThan(10.0);
        // the melt-variant fillers must not reuse the barium base
        assertThat(openRecipes.stream().skip(1))
                .allMatch(r -> r.ingredients().getOrDefault("Barium Carbonate", 0.0) < 1.0);

        var dinnerware = new GlazeRequest("#3aa6a0", 1260, "Satin", "Medium", null, List.of(), 50, null, null, null, null, true);
        var safeRecipes = service.generateRecipes(dinnerware);
        assertThat(safeRecipes.get(0).route().name()).isNotEqualTo("Copper in barium");
        assertThat(safeRecipes.stream().map(r -> r.route().name())).anyMatch(n -> n.equals("Copper in barium"));
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
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Ferro Frit 3134");
        assertThat(balanced.ingredients()).doesNotContainKey("Potash Feldspar");
    }

    @Test
    void highFireBaseUsesFeldspar() {
        var recipes = service.generateRecipes(basicRequest("#ffffff", 1300));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Potash Feldspar");
        assertThat(balanced.ingredients()).doesNotContainKey("Ferro Frit 3134");
    }

    // ── Colorant mapping ─────────────────────────────────────────────────────

    @Test
    void blueColorAddsCobalCarbonate() {
        var recipes = service.generateRecipes(basicRequest("#0000cc", 1220));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Cobalt Carbonate");
    }

    @Test
    void greenColorAddsCopperCarbonate() {
        var recipes = service.generateRecipes(basicRequest("#00aa00", 1220));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Copper Carbonate");
    }

    @Test
    void redColorAddsIronOxide() {
        var recipes = service.generateRecipes(basicRequest("#cc0000", 1220));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Red Iron Oxide");
    }

    @Test
    void whiteColorAddsZircopax() {
        var recipes = service.generateRecipes(basicRequest("#f0f0f0", 1220));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Zircopax");
    }

    @Test
    void shadesWithinSameHueProduceDifferentFormulas() {
        var darkBlue = service.generateRecipes(basicRequest("#123a8a", 1220));
        var lightBlue = service.generateRecipes(basicRequest("#8db4ff", 1220));

        var darkBalanced = getBalanced(darkBlue).ingredients();
        var lightBalanced = getBalanced(lightBlue).ingredients();

        assertThat(darkBalanced).isNotEqualTo(lightBalanced);
        assertThat(darkBalanced.getOrDefault("Manganese Dioxide", 0.0))
                .isGreaterThan(lightBalanced.getOrDefault("Manganese Dioxide", 0.0));
        assertThat(lightBalanced.getOrDefault("Zircopax", 0.0))
                .isGreaterThan(darkBalanced.getOrDefault("Zircopax", 0.0));
    }

        @Test
        void navyVsSkyBlueUseDifferentColorantProfiles() {
        var navy = service.generateRecipes(basicRequest("#1b2d62", 1220));
        var sky = service.generateRecipes(basicRequest("#84bdf2", 1220));

        var navyBalanced = getBalanced(navy).ingredients();
        var skyBalanced = getBalanced(sky).ingredients();

        assertThat(navyBalanced.getOrDefault("Cobalt Carbonate", 0.0))
            .isGreaterThan(skyBalanced.getOrDefault("Cobalt Carbonate", 0.0));
        assertThat(navyBalanced.getOrDefault("Manganese Dioxide", 0.0))
            .isGreaterThan(skyBalanced.getOrDefault("Manganese Dioxide", 0.0));
        assertThat(skyBalanced.getOrDefault("Zircopax", 0.0))
            .isGreaterThan(navyBalanced.getOrDefault("Zircopax", 0.0));
        }

        @Test
        void oliveVsMintGreenShiftIronAndCopperBalance() {
        var olive = service.generateRecipes(basicRequest("#6b7f32", 1220));
        var mint = service.generateRecipes(basicRequest("#86e8b8", 1220));

        var oliveBalanced = getBalanced(olive).ingredients();
        var mintBalanced = getBalanced(mint).ingredients();

        assertThat(oliveBalanced.getOrDefault("Red Iron Oxide", 0.0))
            .isGreaterThan(mintBalanced.getOrDefault("Red Iron Oxide", 0.0));
        assertThat(oliveBalanced.getOrDefault("Yellow Iron Oxide", 0.0))
            .isGreaterThan(mintBalanced.getOrDefault("Yellow Iron Oxide", 0.0));
        assertThat(mintBalanced.getOrDefault("Zircopax", 0.0))
            .isGreaterThan(oliveBalanced.getOrDefault("Zircopax", 0.0));
        }

        @Test
        void celadonVsRobinsEggShiftOpacityAndSilicaDirection() {
        var celadon = service.generateRecipes(basicRequest("#7fa980", 1220));
        var robinsEgg = service.generateRecipes(basicRequest("#8fc9d9", 1220));

        var celadonBalanced = getBalanced(celadon).ingredients();
        var robinsEggBalanced = getBalanced(robinsEgg).ingredients();

        assertThat(celadonBalanced.getOrDefault("Silica", 0.0))
            .isGreaterThan(robinsEggBalanced.getOrDefault("Silica", 0.0));
        assertThat(robinsEggBalanced.getOrDefault("Zircopax", 0.0))
            .isGreaterThan(celadonBalanced.getOrDefault("Zircopax", 0.0));
        }

        @Test
        void armyOliveVsSeafoamMintShiftIronVersusOpacity() {
        var armyOlive = service.generateRecipes(basicRequest("#5f6f2f", 1220));
        var seafoam = service.generateRecipes(basicRequest("#9de3cd", 1220));

        var armyBalanced = getBalanced(armyOlive).ingredients();
        var seafoamBalanced = getBalanced(seafoam).ingredients();

        assertThat(armyBalanced.getOrDefault("Red Iron Oxide", 0.0))
            .isGreaterThan(seafoamBalanced.getOrDefault("Red Iron Oxide", 0.0));
        assertThat(armyBalanced.getOrDefault("Yellow Iron Oxide", 0.0))
            .isGreaterThan(seafoamBalanced.getOrDefault("Yellow Iron Oxide", 0.0));
        assertThat(seafoamBalanced.getOrDefault("Zircopax", 0.0))
            .isGreaterThan(armyBalanced.getOrDefault("Zircopax", 0.0));
        }

        @Test
        void vibrantCharacterIncreasesChromaticColorants() {
        var natural = new GlazeRequest("#2d7cc4", 1220, "Satin", "Medium", null, List.of(), 50, null, null, "Natural", null, null);
        var vibrant = new GlazeRequest("#2d7cc4", 1220, "Satin", "Medium", null, List.of(), 50, null, null, "Vibrant", null, null);

        var naturalBalanced = getBalanced(service.generateRecipes(natural)).ingredients();
        var vibrantBalanced = getBalanced(service.generateRecipes(vibrant)).ingredients();

        assertThat(vibrantBalanced.getOrDefault("Cobalt Carbonate", 0.0))
            .isGreaterThan(naturalBalanced.getOrDefault("Cobalt Carbonate", 0.0));
        assertThat(vibrantBalanced.getOrDefault("Copper Carbonate", 0.0))
            .isGreaterThan(naturalBalanced.getOrDefault("Copper Carbonate", 0.0));
        }

        @Test
        void earthyCharacterIncreasesIronAndRutile() {
        var natural = new GlazeRequest("#6d8a3f", 1220, "Satin", "Medium", null, List.of(), 50, null, null, "Natural", null, null);
        var earthy = new GlazeRequest("#6d8a3f", 1220, "Satin", "Medium", null, List.of(), 50, null, null, "Earthy", null, null);

        var naturalBalanced = getBalanced(service.generateRecipes(natural)).ingredients();
        var earthyBalanced = getBalanced(service.generateRecipes(earthy)).ingredients();

        assertThat(earthyBalanced.getOrDefault("Red Iron Oxide", 0.0))
            .isGreaterThan(naturalBalanced.getOrDefault("Red Iron Oxide", 0.0));
        assertThat(earthyBalanced.getOrDefault("Rutile", 0.0))
            .isGreaterThan(naturalBalanced.getOrDefault("Rutile", 0.0));
        }

        @Test
        void cleanCharacterRaisesOpacityAndReducesDarkeners() {
        var natural = new GlazeRequest("#84bdf2", 1220, "Satin", "Medium", null, List.of(), 50, null, null, "Natural", null, null);
        var clean = new GlazeRequest("#84bdf2", 1220, "Satin", "Medium", null, List.of(), 50, null, null, "Clean", null, null);

        var naturalBalanced = getBalanced(service.generateRecipes(natural)).ingredients();
        var cleanBalanced = getBalanced(service.generateRecipes(clean)).ingredients();

        assertThat(cleanBalanced.getOrDefault("Zircopax", 0.0))
            .isGreaterThan(naturalBalanced.getOrDefault("Zircopax", 0.0));
        assertThat(cleanBalanced.getOrDefault("Red Iron Oxide", 0.0))
            .isLessThanOrEqualTo(naturalBalanced.getOrDefault("Red Iron Oxide", 0.0));
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
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Ilmenite (granular)");
        assertThat(balanced.ingredients()).containsKey("Manganese Granules");
    }

    @Test
    void crystallineEffectAddsZincOxide() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Medium", List.of("Crystalline"), 100, null));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Zinc Oxide");
        assertThat(balanced.ingredients()).containsKey("Titanium Dioxide");
    }

    @Test
    void flameEffectAddsIronChromate() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Satin", "Medium", List.of("Flame"), 100, null));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Iron Chromate");
        assertThat(balanced.ingredients()).containsKey("Titanium Dioxide");
    }

    @Test
    void fluidStabilityAddsLithiumCarbonate() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Low", List.of(), 50, null));
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).containsKey("Lithium Carbonate");
        assertThat(balanced.ingredients()).containsKey("Wollastonite");
    }

    @Test
    void fluidLabelIsAcceptedAsLowStability() {
        var low = getBalanced(service.generateRecipes(request("#ffffff", 1220, "Glossy", "Low", List.of(), 50, null))).ingredients();
        var fluid = getBalanced(service.generateRecipes(request("#ffffff", 1220, "Glossy", "Fluid", List.of(), 50, null))).ingredients();
        assertThat(fluid).isEqualTo(low);
    }

    // ── Opacity ───────────────────────────────────────────────────────────────────────

    private static GlazeRequest withOpacity(String opacity) {
        return new GlazeRequest("#3a6bc1", 1220, "Satin", "Medium", opacity, List.of(), 50, null, null, null, null, null);
    }

    @Test
    void opaqueOpacityAddsZircopaxAndTin() {
        var semi = getBalanced(service.generateRecipes(withOpacity("Semi-opaque"))).ingredients();
        var opaque = getBalanced(service.generateRecipes(withOpacity("Opaque"))).ingredients();
        assertThat(opaque).containsKey("Tin Oxide");
        assertThat(opaque.getOrDefault("Zircopax", 0.0)).isGreaterThan(semi.getOrDefault("Zircopax", 0.0));
    }

    @Test
    void translucentOpacityRaisesSilica() {
        var semi = getBalanced(service.generateRecipes(withOpacity("Semi-opaque"))).ingredients();
        var translucent = getBalanced(service.generateRecipes(withOpacity("Translucent"))).ingredients();
        assertThat(translucent.getOrDefault("Silica", 0.0)).isGreaterThan(semi.getOrDefault("Silica", 0.0));
        assertThat(translucent).doesNotContainKey("Tin Oxide");
    }

    @Test
    void nullOpacityMatchesSemiOpaque() {
        var semi = getBalanced(service.generateRecipes(withOpacity("Semi-opaque"))).ingredients();
        var none = getBalanced(service.generateRecipes(withOpacity(null))).ingredients();
        assertThat(none).isEqualTo(semi);
    }

        @Test
        void cone6PurpleVariegatedAvoidsOverdarkColorantLoad() {
        var recipes = service.generateRecipes(
            request("#6f42c1", 1230, "Satin", "Medium", List.of("Variegated"), 100, null));
        var balanced = getBalanced(recipes).ingredients();

        double manganese = balanced.getOrDefault("Manganese Dioxide", 0.0);
        double ironLoad = balanced.getOrDefault("Iron Oxide", 0.0)
            + balanced.getOrDefault("Red Iron Oxide", 0.0)
            + balanced.getOrDefault("Yellow Iron Oxide", 0.0);
        double cobalt = balanced.getOrDefault("Cobalt Carbonate", 0.0);

        assertThat(manganese).isLessThanOrEqualTo(1.5);
        assertThat(ironLoad).isLessThanOrEqualTo(1.5);
        assertThat(cobalt).isGreaterThanOrEqualTo(0.65);
        }

    @Test
    void purpleTargetPrefersVioletColorantsOverBlueCobaltBias() {
        var recipes = service.generateRecipes(
                request("#843adf", 1222, "Satin", "High", List.of(), 50, null));
        var balanced = getBalanced(recipes).ingredients();

        double manganese = balanced.getOrDefault("Manganese Dioxide", 0.0);
        double cobalt = balanced.getOrDefault("Cobalt Carbonate", 0.0);
        double copper = balanced.getOrDefault("Copper Carbonate", 0.0);

        assertThat(manganese).isGreaterThan(cobalt);
        assertThat(copper).isGreaterThan(0.0);
    }

    @Test
    void midHighPurpleFiringStaysBalancedWithoutBlueCobaltDrift() {
        var recipes = service.generateRecipes(request("#843adf", 1222, "Satin", "High", List.of(), 50, null));
        var balanced = getBalanced(recipes).ingredients();

        double manganese = balanced.getOrDefault("Manganese Dioxide", 0.0);
        double cobalt = balanced.getOrDefault("Cobalt Carbonate", 0.0);
        double copper = balanced.getOrDefault("Copper Carbonate", 0.0);

        assertThat(manganese).isGreaterThan(0.75);
        assertThat(manganese).isLessThanOrEqualTo(1.35);
        assertThat(cobalt).isGreaterThanOrEqualTo(0.8);
        assertThat(copper).isGreaterThan(0.0);
    }

    // ── Intensity scaling ─────────────────────────────────────────────────────

    @Test
    void zeroIntensityProducesNoEffectAgents() {
        var req = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 0, null);
        var recipes = service.generateRecipes(req);
        var balanced = getBalanced(recipes);
        assertThat(balanced.ingredients()).doesNotContainKey("Ilmenite (granular)");
        assertThat(balanced.ingredients()).doesNotContainKey("Manganese Granules");
    }

    @Test
    void highIntensityProducesMoreEffectAgentThanLow() {
        var lowReq  = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 25, null);
        var highReq = request("#ffffff", 1220, "Satin", "Medium", List.of("Speckled"), 150, null);

        var lowRecipes  = service.generateRecipes(lowReq);
        var highRecipes = service.generateRecipes(highReq);

        double lowIlmenite = getBalanced(lowRecipes).ingredients().getOrDefault("Ilmenite (granular)", 0.0);
        double highIlmenite = getBalanced(highRecipes).ingredients().getOrDefault("Ilmenite (granular)", 0.0);

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
        var withSecondary    = request("#0000cc", 1220, "Satin", "Medium", List.of("Speckled"), 50, "#cc0000");

        var recipesWith    = service.generateRecipes(withSecondary);

        double cobaltWith    = getBalanced(recipesWith).ingredients().getOrDefault("Cobalt Carbonate", 0.0);

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
    void matteFinishRaisesMagnesiaAndAluminaAgainstSilica() {
        var glossy = getBalanced(service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Medium", List.of(), 50, null))).ingredients();
        var matte = getBalanced(service.generateRecipes(
                request("#ffffff", 1220, "Matte", "Medium", List.of(), 50, null))).ingredients();
        assertThat(matte.getOrDefault("Dolomite", 0.0)).isGreaterThan(glossy.getOrDefault("Dolomite", 0.0));
        assertThat(matte.getOrDefault("EPK Kaolin", 0.0)).isGreaterThan(glossy.getOrDefault("EPK Kaolin", 0.0));
        assertThat(matte.getOrDefault("Silica", 0.0)).isLessThan(glossy.getOrDefault("Silica", 0.0));
    }

    @Test
    void lowFireMatteUsesTalcAndAluminaFrit() {
        var matte = getBalanced(service.generateRecipes(
                request("#ffffff", 1000, "Matte", "Medium", List.of(), 50, null))).ingredients();
        assertThat(matte).containsKeys("Talc", "Ferro Frit 3124");
    }

    // ── Recipe name format ────────────────────────────────────────────────────

    @Test
    void recipeNameContainsSurfaceFinish() {
        var recipes = service.generateRecipes(
                request("#ffffff", 1220, "Glossy", "Medium", List.of(), 50, null));
        assertThat(getBalanced(recipes).name()).containsIgnoringCase("Gloss");
    }

        @Test
        void foodSafeModeReducesRiskierColorantsAndBoostsSilica() {
        var normal = new GlazeRequest("#2d7cc4", 1220, "Satin", "Medium", null, List.of("Flame"),
            50, null, "Potash Feldspar", "Vibrant", "oxidation", false);
        var foodSafe = new GlazeRequest("#2d7cc4", 1220, "Satin", "Medium", null, List.of("Flame"),
            50, null, "Potash Feldspar", "Vibrant", "oxidation", true);

        var normalIngredients = getBalanced(service.generateRecipes(normal)).ingredients();
        var safeIngredients = getBalanced(service.generateRecipes(foodSafe)).ingredients();

        assertThat(safeIngredients.getOrDefault("Silica", 0.0))
            .isGreaterThan(normalIngredients.getOrDefault("Silica", 0.0));
        assertThat(safeIngredients.getOrDefault("Copper Carbonate", 0.0))
            .isLessThan(normalIngredients.getOrDefault("Copper Carbonate", 0.0));
        assertThat(safeIngredients.getOrDefault("Cobalt Carbonate", 0.0))
            .isLessThan(normalIngredients.getOrDefault("Cobalt Carbonate", 0.0));
        assertThat(safeIngredients.getOrDefault("Iron Chromate", 0.0))
            .isLessThanOrEqualTo(normalIngredients.getOrDefault("Iron Chromate", 0.0));
        }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** The first recipe is always the primary colourant route on the standard base. */
    private static RecipeSuggestion getBalanced(List<RecipeSuggestion> recipes) {
        return recipes.get(0);
    }
}
