package com.glaze.backend.dto;

import java.util.Map;

/** The lead recipe's chemistry only, so the generator can show its predicted colour before a full run. */
public record RecipePreviewResponse(Map<String, Double> ingredients, RecipeRoute route) {
}
