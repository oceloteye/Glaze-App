package com.glaze.backend.dto;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record GlazeRequest(
        @NotBlank(message = "Color is required")
        @Size(max = 50, message = "Color must be 50 characters or less")
        String color,

        @NotNull(message = "Firing temperature is required")
        @Min(value = 580, message = "Firing temperature must be at least 580C (cone 022)")
        @Max(value = 1400, message = "Firing temperature must be 1400C or less")
        Integer firingTempC,

        @NotBlank(message = "Surface finish is required")
        @Size(max = 30, message = "Surface finish must be 30 characters or less")
        String surfaceFinish,

        @NotBlank(message = "Stability is required")
        @Size(max = 30, message = "Stability must be 30 characters or less")
        String stability,

        /** Optional opacity: Translucent, Semi-opaque, or Opaque. Null is treated as Semi-opaque. */
        @Size(max = 30, message = "Opacity must be 30 characters or less")
        String opacity,

        @NotNull(message = "Effects list is required")
        List<@Size(max = 30, message = "Each effect must be 30 characters or less") String> effects,

        /** 0–200 scale; null treated as 50 (normal) */
        @Min(value = 0) @Max(value = 200)
        Integer intensity,

        /** Optional secondary hex color (#rrggbb) for two-color effects */
        @Size(max = 7)
        String secondaryColor,

        /** Optional feldspar substitution: Potash Feldspar, Nepheline Syenite, or Soda Feldspar */
        @Size(max = 40, message = "Feldspar substitute must be 40 characters or less")
        String feldsparSubstitute,

        /** Optional color character bias: Natural, Clean, Earthy, or Vibrant */
        @Size(max = 20, message = "Color character must be 20 characters or less")
        String colorCharacter,

        /** Optional kiln atmosphere: oxidation or reduction. Defaults to oxidation when omitted. */
        @Pattern(regexp = "(?i)oxidation|reduction", message = "Atmosphere must be oxidation or reduction")
        String atmosphere,

        /** Optional dinnerware safety mode. When true, recipe favors more stable food-safe chemistry. */
        Boolean foodSafe,

        /** Optional palette family id (e.g. "turquoise"). When set, it picks the colourant system directly. */
        @Pattern(regexp = "[a-z-]{1,30}", message = "Hue family must be a palette id")
        String hueFamily,

        /** 0–100 position on the family's muted → pure range; null treated as 50. Only read with hueFamily. */
        @Min(value = 0) @Max(value = 100)
        Integer saturation,

        /** 0–100 position on the family's light → deep range; null treated as 50. Only read with hueFamily. */
        @Min(value = 0) @Max(value = 100)
        Integer depth
) {

    /** Hex-only request: the colourant system is inferred from the colour. */
    public GlazeRequest(String color, Integer firingTempC, String surfaceFinish, String stability, String opacity,
                        List<String> effects, Integer intensity, String secondaryColor, String feldsparSubstitute,
                        String colorCharacter, String atmosphere, Boolean foodSafe) {
        this(color, firingTempC, surfaceFinish, stability, opacity, effects, intensity, secondaryColor,
                feldsparSubstitute, colorCharacter, atmosphere, foodSafe, null, null, null);
    }
}