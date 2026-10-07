package com.glaze.backend.dto;

import java.util.List;
import java.util.Map;

public record AnalyzeResponse(
        /** Recipe scaled so the materials sum to 100%. */
        Map<String, Double> normalizedRecipe,
        double totalParts,
        String cone,
        Umf umf,
        GlazeProperties properties,
        List<GlazeWarning> warnings) {
}
