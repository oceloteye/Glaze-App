package com.glaze.backend.dto;

import java.util.List;

public record GenerateRecipesResponse(List<RecipeSuggestion> recipes) {
}