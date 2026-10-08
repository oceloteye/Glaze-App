package com.glaze.backend.dto;

import java.util.List;

/** How a suggested recipe reaches its colour: the colourant route it follows and the materials that define it. */
public record RecipeRoute(
        String name,
        String summary,
        List<String> signature
) {
}
