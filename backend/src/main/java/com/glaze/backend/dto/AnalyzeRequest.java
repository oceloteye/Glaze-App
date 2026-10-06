package com.glaze.backend.dto;

import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AnalyzeRequest(
        @NotEmpty(message = "Add at least one material")
        @Size(max = 40, message = "A recipe can have at most 40 materials")
        Map<String, Double> parts,

        @NotNull(message = "Firing temperature is required")
        @Min(value = 580, message = "Firing temperature must be at least 580C (cone 022)")
        @Max(value = 1400, message = "Firing temperature must be 1400C or less")
        Integer firingTempC,

        /** "oxidation" (default) or "reduction". */
        @Size(max = 30, message = "Atmosphere must be 30 characters or less")
        String atmosphere) {
}
