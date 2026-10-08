package com.glaze.backend.service.recipe;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * One way of reaching a colour: which colourants (and, for whole-recipe families, which base) do the work.
 *
 * @param name         short label shown on the recipe card, e.g. "Chrome green"
 * @param summary      one sentence on how this route gets to the colour and what it trades off
 * @param signature    the materials that define this route's chemistry
 * @param baseOverride a complete base to start from instead of the standard one for the cone, or null
 * @param colourants   adds the route's colourants to a prepared (surface / stability / opacity adjusted) base
 * @param fitness      0–1 plausibility for the asked colour; routes are offered in descending order
 */
public record ColourRoute(
        String name,
        String summary,
        List<String> signature,
        Map<String, Double> baseOverride,
        Consumer<Map<String, Double>> colourants,
        double fitness
) {
}
