package com.glaze.backend.dto;

import java.util.Map;

/**
 * Unity Molecular Formula: oxide moles normalised so the fluxes (R2O + RO) sum to 1.
 * Colorants are reported but excluded from unity, following common glaze-calc convention.
 */
public record Umf(
        Map<String, Double> fluxes,
        Map<String, Double> stabilizers,
        Map<String, Double> glassFormers,
        Map<String, Double> colorants,
        double siAlRatio,
        double r2oShare
) {
}
