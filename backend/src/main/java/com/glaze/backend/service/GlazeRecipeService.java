package com.glaze.backend.service;

import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeRoute;
import com.glaze.backend.dto.RecipeSuggestion;
import com.glaze.backend.service.recipe.ColourRoute;
import com.glaze.backend.service.recipe.ColourRoutes;
import com.glaze.backend.service.recipe.FiringScheduleBuilder;
import com.glaze.backend.service.recipe.GlazeAnalyzer;
import com.glaze.backend.service.recipe.RecipeBaseFactory;
import com.glaze.backend.service.recipe.RecipeMath;
import com.glaze.backend.service.recipe.RecipeModifier;
import com.glaze.backend.service.recipe.RecipeNarrativeBuilder;
import com.glaze.backend.service.recipe.UmfCalculator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GlazeRecipeService {

    private static final int RECIPE_COUNT = 3;
    private static final String[] MELT_VARIANTS = {"Balanced", "High-Silica", "Fluxed"};

    /**
     * Up to three recipes, each a different colourant route to the asked colour. When fewer distinct routes
     * exist the remaining slots are filled by the leading route on the high-silica and fluxed bases, labelled
     * so the melt variants can be told apart.
     */
    public List<RecipeSuggestion> generateRecipes(GlazeRequest request) {
        List<ColourRoute> routes = ColourRoutes.propose(request);
        int routeCount = Math.min(RECIPE_COUNT, routes.size());
        int padding = RECIPE_COUNT - routeCount;

        // a route with its own base (barium matte) would ignore the melt variant, so pad with the best one that hasn't
        ColourRoute filler = routes.stream().filter(route -> route.baseOverride() == null).findFirst().orElse(routes.get(0));

        var recipes = new ArrayList<RecipeSuggestion>();
        for (int i = 0; i < routeCount; i++) {
            ColourRoute route = routes.get(i);
            boolean labelled = route == filler && padding > 0;
            recipes.add(buildRecipe(route, MELT_VARIANTS[0], labelled, request));
        }
        for (int i = 0; i < padding; i++) {
            recipes.add(buildRecipe(filler, MELT_VARIANTS[i + 1], true, request));
        }
        return recipes;
    }

    private RecipeSuggestion buildRecipe(ColourRoute route, String meltVariant, boolean labelled, GlazeRequest req) {
        int tempC = req.firingTempC();
        Map<String, Double> base = route.baseOverride() != null
                ? route.baseOverride()
                : switch (meltVariant) {
                    case "High-Silica" -> RecipeBaseFactory.highSilicaBase(tempC);
                    case "Fluxed" -> RecipeBaseFactory.fluxedBase(tempC);
                    default -> RecipeBaseFactory.standardBase(tempC);
                };
        var formula = new LinkedHashMap<>(base);
        Integer requestedIntensity = req.intensity();
        int intensity = requestedIntensity == null ? 50 : requestedIntensity;

        RecipeModifier.applySurfaceAdjustments(formula, req.surfaceFinish(), tempC);
        RecipeModifier.applyStabilityAdjustments(formula, req.stability());
        RecipeModifier.applyOpacityAdjustments(formula, req.opacity());
        route.colourants().accept(formula);
        RecipeModifier.applyEffectAgents(formula, req.effects(), intensity, req.color(), req.secondaryColor(), tempC, req.atmosphere());
        RecipeModifier.applyFeldsparSubstitution(formula, req.feldsparSubstitute());
        RecipeModifier.applyFoodSafetyAdjustments(formula, req.foodSafe());
        RecipeMath.normalize(formula);

        String label = labelled ? route.name() + " · " + meltVariant : route.name();
        return new RecipeSuggestion(
                RecipeNarrativeBuilder.recipeName(label, req),
                RecipeNarrativeBuilder.firingRangeFor(tempC),
                formula,
                RecipeNarrativeBuilder.buildRationale(meltVariant, route.summary(), req, formula),
                UmfCalculator.calculate(formula),
                // same analysis the Recipe Builder runs, so previews agree across the handoff
                GlazeAnalyzer.analyze(formula, tempC, req.atmosphere()).properties(),
                FiringScheduleBuilder.buildAll(meltVariant, req, formula),
                new RecipeRoute(route.name(), route.summary(), route.signature()));
    }
}
