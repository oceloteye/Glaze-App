package com.glaze.backend.dto;

/**
 * Predicted fired characteristics of an analysed recipe.
 *
 * <p>{@code melt}, {@code gloss}, {@code opacity} and {@code durability} are 0–1 scores.
 * {@code expansion} is an estimated linear thermal expansion coefficient in 10⁻⁷/°C.
 */
public record GlazeProperties(
        double melt,
        String meltLabel,
        double gloss,
        String surface,
        double opacity,
        String opacityLabel,
        double durability,
        String durabilityLabel,
        double expansion,
        String expansionLabel) {
}
