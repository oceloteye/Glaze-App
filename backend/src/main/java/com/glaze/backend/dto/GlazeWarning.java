package com.glaze.backend.dto;

/**
 * An educational note about the analysed recipe.
 *
 * @param severity "info", "caution" or "danger"
 * @param category "toxicity", "food-safety", "fit", "maturity" or "application"
 */
public record GlazeWarning(String severity, String category, String title, String message) {

    public static final String INFO = "info";
    public static final String CAUTION = "caution";
    public static final String DANGER = "danger";

    public static final String TOXICITY = "toxicity";
    public static final String FOOD_SAFETY = "food-safety";
    public static final String FIT = "fit";
    public static final String MATURITY = "maturity";
    public static final String APPLICATION = "application";
}
