package com.glaze.backend.dto;

import java.util.Map;

/** A glaze material the Recipe Builder can add, with its oxide analysis and safety notes. */
public record MaterialInfo(
        String name,
        String category,
        String role,
        String description,
        /** Oxide weight percent (loss on ignition omitted). */
        Map<String, Double> analysis,
        /** Handling / toxicity note, or null when ordinary dust precautions are enough. */
        String hazard,
        /** Food-surface leaching note, or null when not a concern. */
        String foodSafety,
        /** Suggested slider maximum in parts. */
        int maxParts) {
}
