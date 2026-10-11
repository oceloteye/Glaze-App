package com.glaze.backend.dto;

import java.util.List;
import java.util.Map;

public record RecipeSuggestion(
        String name,
        String firingRange,
        Map<String, Double> ingredients,
        String rationale,
        Umf umf,
        GlazeProperties properties,
        List<FiringSchedule> firingSchedules,
        RecipeRoute route,
        /** Colourants dinnerware mode reduced, mapped to the fraction of the dose kept (empty when not applied). */
        Map<String, Double> foodSafeLimits
) {
}