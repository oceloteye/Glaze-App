package com.glaze.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record GeminiPreviewRequest(
        @NotBlank String baseColorHex,
        String secondaryColorHex,
        @NotBlank String surfaceFinish,
        @NotBlank String effect,
        @NotBlank String clayBody,
        @NotBlank String lighting,
        String selectedRecipeName,
        String selectedRecipeFiringRange,
        String selectedRecipeRationale,
        java.util.Map<String, Double> selectedRecipeIngredients,
        String confidence
) {
}
