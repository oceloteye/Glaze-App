package com.glaze.backend.dto;

import java.util.Map;

public record RecipeSuggestion(
        String name,
        String firingRange,
        Map<String, Double> ingredients,
        String rationale
) {
}