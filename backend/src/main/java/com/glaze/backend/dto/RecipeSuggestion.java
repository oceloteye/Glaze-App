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
        RecipeRoute route
) {
}