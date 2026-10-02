package com.glaze.backend.service;

import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeSuggestion;
import com.glaze.backend.service.recipe.FiringScheduleBuilder;
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

    public List<RecipeSuggestion> generateRecipes(GlazeRequest request) {
        var recipes = new ArrayList<RecipeSuggestion>();
        recipes.add(buildRecipe("Balanced", RecipeBaseFactory.standardBase(request.firingTempC()), request));
        recipes.add(buildRecipe("High-Silica", RecipeBaseFactory.highSilicaBase(request.firingTempC()), request));
        recipes.add(buildRecipe("Fluxed", RecipeBaseFactory.fluxedBase(request.firingTempC()), request));
        return recipes;
    }

    private RecipeSuggestion buildRecipe(String variant, Map<String, Double> base, GlazeRequest req) {
        var formula = new LinkedHashMap<>(base);
        Integer requestedIntensity = req.intensity();
        int intensity = requestedIntensity == null ? 50 : requestedIntensity;

        RecipeModifier.applySurfaceAdjustments(formula, req.surfaceFinish(), req.firingTempC());
        RecipeModifier.applyStabilityAdjustments(formula, req.stability());
        RecipeModifier.applyColorants(formula, req.color(), req.secondaryColor(), req.colorCharacter(), req.firingTempC(), req.atmosphere());
        RecipeModifier.applyEffectAgents(formula, req.effects(), intensity, req.color(), req.secondaryColor(), req.firingTempC(), req.atmosphere());
        RecipeModifier.applyFeldsparSubstitution(formula, req.feldsparSubstitute());
        RecipeModifier.applyFoodSafetyAdjustments(formula, req.foodSafe());
        RecipeMath.normalize(formula);

        return new RecipeSuggestion(
                RecipeNarrativeBuilder.recipeName(variant, req),
                RecipeNarrativeBuilder.firingRangeFor(req.firingTempC()),
                formula,
                RecipeNarrativeBuilder.buildRationale(variant, req, formula),
                UmfCalculator.calculate(formula),
                FiringScheduleBuilder.buildAll(variant, req, formula));
    }
}
