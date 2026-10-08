package com.glaze.backend.service.recipe;

import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import com.glaze.backend.dto.GlazeRequest;
import static com.glaze.backend.service.recipe.RecipeIngredients.COLORANT_KEYS;
import static com.glaze.backend.service.recipe.RecipeIngredients.DOLOMITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3124;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3134;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;

public final class RecipeNarrativeBuilder {

    private RecipeNarrativeBuilder() {
    }

    public static String recipeName(String label, GlazeRequest request) {
        String finish = capitalize(request.surfaceFinish());
        String range = firingRangeShort(request.firingTempC());
        return finish + " " + range + " — " + label;
    }

    public static String buildRationale(String meltVariant, String routeSummary, GlazeRequest request, Map<String, Double> formula) {
        var rationale = new StringBuilder();
        String feldspar = selectedFeldsparName(request.feldsparSubstitute());

        rationale.append(fluxSystemDescription(request.firingTempC(), feldspar)).append(". ");

        if (routeSummary != null && !routeSummary.isBlank()) {
            rationale.append(routeSummary.strip()).append(' ');
        }

        rationale.append(switch (meltVariant) {
            case RecipeVariants.HIGH_SILICA -> "Extra Silica raises durability and reduces crawling — well suited for functional work.";
            case RecipeVariants.FLUXED -> request.firingTempC() < 1120
                    ? "Elevated Frit content promotes a fluid, glossy melt and vibrant colour response."
                    : "Lithium Carbonate addition intensifies flux activity and brightens colorant development.";
            default -> "Balanced flux-silica-alumina ratio for reliable results across a range of kilns.";
        });
        rationale.append(' ');

        if (isValidHex(request.color())) {
            String colorName = hueToColorName(request.color());
            var colorants = formula.entrySet().stream()
                    .filter(entry -> isColorant(entry.getKey()) && entry.getValue() > 0.01)
                    .map(entry -> entry.getKey() + " (" + RecipeMath.roundTwo(entry.getValue()) + "%)")
                    .toList();
            if (!colorants.isEmpty()) {
                rationale.append("Primary ").append(colorName)
                        .append(" hue driven by: ").append(String.join(", ", colorants)).append(". ");
            }
        }

        if (!request.effects().isEmpty()) {
            String effectNames = request.effects().stream()
                    .map(RecipeNarrativeBuilder::effectNote)
                    .collect(Collectors.joining("; "));
            rationale.append(effectNames).append(". ");
        }

        if (RecipeModifier.isFluidStability(request.stability())) {
            rationale.append("Fluid melt target: Lithium Carbonate and Wollastonite raise flux activity so the glaze moves and pools. ");
        } else if (RecipeModifier.isStiffStability(request.stability())) {
            rationale.append("Stiff melt target: extra Kaolin and Bentonite hold the glaze in place on vertical surfaces. ");
        }

        String opacity = request.opacity() == null ? "" : request.opacity().toLowerCase(Locale.ROOT);
        if (opacity.contains("transluc") || opacity.contains("transparent")) {
            rationale.append("Elevated Silica promotes a translucent, glassy quality. ");
        } else if (opacity.contains("opaque") && !opacity.contains("semi")) {
            rationale.append("Zircopax and Tin Oxide opacify the glaze to a dense, covering surface. ");
        } else {
            rationale.append("A light Zircopax addition softens the glaze to semi-opaque. ");
        }

        if (Boolean.TRUE.equals(request.foodSafe())) {
            rationale.append(" Dinnerware safety mode enabled: reduced high-leach-risk colorants and shifted toward a more stable silica/alumina balance.");
        }

        return rationale.toString().strip();
    }

    public static String fluxSystemDescription(int tempC, String feldspar) {
        return switch (FiringBand.of(tempC)) {
            case LOW -> "Low-fire frit base (" + FERRO_FRIT_3134 + " with " + FERRO_FRIT_3124 + ") — alumina supplied by kaolin";
            case LOW_MID -> "Transitional base combining soft frit with " + feldspar + " for mid-range firing";
            case MID -> "Mid-fire mineral base using " + feldspar + ", " + DOLOMITE + ", and Zinc Oxide as fluxes";
            case CONE_6 -> "Cone 6 " + feldspar + " base with " + FERRO_FRIT_3134 + " boron to complete the melt";
            case HIGH -> "High-fire " + feldspar + " base — silica and kaolin provide the glass network";
        };
    }

    public static String firingRangeFor(int tempC) {
        if (tempC < 700) return "Very low fire (cone 022–019)";
        if (tempC < 900) return "Low fire (cone 018–010)";
        if (tempC < 1100) return "Low–mid fire (cone 09–02)";
        if (tempC < 1200) return "Mid fire (cone 01–5)";
        if (tempC < 1260) return "Mid–high fire (cone 6–7)";
        return "High fire (cone 8–10)";
    }

    public static String firingRangeShort(int tempC) {
        if (tempC < 1000) return "Low Fire";
        if (tempC < 1120) return "Low-Mid";
        if (tempC < 1200) return "Mid Fire";
        if (tempC < 1260) return "Cone 6-7";
        return "High Fire";
    }

    public static String effectNote(String effect) {
        String normalized = effect.toLowerCase(Locale.ROOT);
        if (normalized.contains("speck")) return "Ilmenite and Manganese Granules create fired speckle";
        if (normalized.contains("crystal")) return "High Zinc Oxide and Titanium Dioxide nucleate macro-crystalline growth";
        if (normalized.contains("varieg")) return "Rutile promotes colour movement and variegation in the melt";
        if (normalized.contains("flame")) return "Titanium Dioxide and Iron Chromate drive phase-separation flashing";
        return effect + " effect applied";
    }

    private static boolean isValidHex(String value) {
        return value != null && value.matches("^#[0-9a-fA-F]{6}$");
    }

    private static String hueToColorName(String hex) {
        double[] hsl = RecipeColorUtil.hexToHsl(hex);
        double h = hsl[0], s = hsl[1], l = hsl[2];
        if (l > 0.87 || s < 0.12) return "white/neutral";
        if (l < 0.12) return "black/dark";
        if (h < 30 || h >= 330) return "red/rust";
        if (h < 60) return "orange/amber";
        if (h < 80) return "yellow";
        if (h < 180) return "green";
        if (h < 220) return "cyan/teal";
        if (h < 260) return "blue";
        return "purple/violet";
    }

    private static boolean isColorant(String key) {
        return COLORANT_KEYS.contains(key);
    }

    private static String selectedFeldsparName(String substitution) {
        if (substitution == null || substitution.isBlank()) {
            return POTASH_FELDSPAR;
        }

        String normalized = substitution.toLowerCase(Locale.ROOT);
        if (normalized.contains("nepheline")) return RecipeIngredients.NEPHELINE_SYENITE;
        if (normalized.contains("soda")) return RecipeIngredients.SODA_FELDSPAR;
        return POTASH_FELDSPAR;
    }

    private static String capitalize(String value) {
        if (value == null || value.isEmpty()) return value;
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1).toLowerCase(Locale.ROOT);
    }
}