package com.glaze.backend.service.recipe;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.glaze.backend.service.recipe.RecipeIngredients.BENTONITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COBALT_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COPPER_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.DOLOMITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.EPK_KAOLIN;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3124;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3134;
import static com.glaze.backend.service.recipe.RecipeIngredients.ILMENITE_GRANULAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.IRON_CHROMATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.LITHIUM_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.MANGANESE_DIOXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.MANGANESE_GRANULES;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.RED_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.RUTILE;
import static com.glaze.backend.service.recipe.RecipeIngredients.SILICA;
import static com.glaze.backend.service.recipe.RecipeIngredients.TALC;
import static com.glaze.backend.service.recipe.RecipeIngredients.TIN_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.TITANIUM_DIOXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.WHITING;
import static com.glaze.backend.service.recipe.RecipeIngredients.WOLLASTONITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.YELLOW_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZINC_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZIRCOPAX;

public final class RecipeModifier {

    private static final String CHARACTER_NATURAL = RecipeVariants.NATURAL;
    private static final String CHARACTER_CLEAN = RecipeVariants.CLEAN;
    private static final String CHARACTER_EARTHY = RecipeVariants.EARTHY;
    private static final String CHARACTER_VIBRANT = RecipeVariants.VIBRANT;
    private static final String ATMOSPHERE_OXIDATION = "oxidation";
    private static final String ATMOSPHERE_REDUCTION = "reduction";
    private static final double PURPLE_MID_HIGH_MAX_MANGANESE = 1.35;
    private static final double PURPLE_MID_HIGH_MAX_IRON_OXIDE = 0.55;
    private static final double PURPLE_MID_HIGH_MAX_RED_IRON = 0.65;
    private static final double PURPLE_MID_HIGH_MAX_YELLOW_IRON = 0.2;
    private static final double PURPLE_MID_HIGH_MAX_RUTILE = 1.7;
    private static final double PURPLE_MID_HIGH_MIN_COBALT = 0.8;

    private RecipeModifier() {
    }

    public static void applySurfaceAdjustments(Map<String, Double> formula, String finish, int tempC) {
        String normalized = finish.toLowerCase(Locale.ROOT);
        FiringBand band = FiringBand.of(tempC);
        if (normalized.contains("gloss")) {
            RecipeMath.adjust(formula, SILICA, band.isLowFire() ? 1.5 : 3.0);
            RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, 2.0);
            if (!band.isLowFire()) {
                RecipeMath.adjustIfPresent(formula, FERRO_FRIT_3134, 2.0);
            }
            RecipeMath.adjustIfPresent(formula, DOLOMITE, band == FiringBand.MID ? -4.0 : -2.0);
            RecipeMath.adjustIfPresent(formula, EPK_KAOLIN, -3.0);
        } else {
            applyMatteAdjustments(formula, band, normalized.contains("matte") ? 1.0 : satinDose(band));
        }
    }

    /**
     * Satin is a partial matte dose. The pure-frit low-fire base starts far up the gloss curve so it needs most of
     * the matte swap; the zinc/dolomite mid-fire base is already close to satin so it needs very little.
     */
    private static double satinDose(FiringBand band) {
        return switch (band) {
            case LOW -> 0.85;
            case LOW_MID -> 0.55;
            case MID -> 0.3;
            case CONE_6, HIGH -> 0.6;
        };
    }

    /**
     * Mattes come from raising Al2O3 and MgO relative to SiO2, not from starving the melt.
     * Each band pushes toward the classic matte chemistry for that temperature; satin uses a partial dose.
     */
    private static void applyMatteAdjustments(Map<String, Double> formula, FiringBand band, double scale) {
        switch (band) {
            case LOW, LOW_MID -> {
                // Swap boron-heavy frit for alumina-bearing frit, kaolin and talc: a magnesia matte.
                RecipeMath.adjustIfPresent(formula, FERRO_FRIT_3134, -22.0 * scale);
                RecipeMath.adjust(formula, FERRO_FRIT_3124, 12.0 * scale);
                RecipeMath.adjust(formula, EPK_KAOLIN, 8.0 * scale);
                RecipeMath.adjust(formula, TALC, 14.0 * scale);
                RecipeMath.adjust(formula, WHITING, 3.0 * scale);
                RecipeMath.adjust(formula, SILICA, -12.0 * scale);
                RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -2.0 * scale);
            }
            case MID -> {
                RecipeMath.adjust(formula, DOLOMITE, 6.0 * scale);
                RecipeMath.adjust(formula, EPK_KAOLIN, 6.0 * scale);
                RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -4.0 * scale);
                RecipeMath.adjustIfPresent(formula, WHITING, -2.0 * scale);
            }
            case CONE_6 -> {
                RecipeMath.adjust(formula, DOLOMITE, 6.0 * scale);
                RecipeMath.adjust(formula, EPK_KAOLIN, 6.0 * scale);
                RecipeMath.adjust(formula, SILICA, -7.0 * scale);
                RecipeMath.adjustIfPresent(formula, FERRO_FRIT_3134, -4.0 * scale);
                RecipeMath.adjustIfPresent(formula, WHITING, -2.0 * scale);
                RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, 2.0 * scale);
            }
            case HIGH -> {
                RecipeMath.adjust(formula, DOLOMITE, 6.0 * scale);
                RecipeMath.adjust(formula, EPK_KAOLIN, 6.0 * scale);
                RecipeMath.adjust(formula, SILICA, -4.0 * scale);
                RecipeMath.adjustIfPresent(formula, WHITING, -3.0 * scale);
                RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, 3.0 * scale);
            }
        }
    }

    public static boolean isFluidStability(String stability) {
        String normalized = stability == null ? "" : stability.toLowerCase(Locale.ROOT);
        return normalized.contains("low") || normalized.contains("fluid");
    }

    public static boolean isStiffStability(String stability) {
        String normalized = stability == null ? "" : stability.toLowerCase(Locale.ROOT);
        return normalized.contains("high") || normalized.contains("stiff");
    }

    public static void applyStabilityAdjustments(Map<String, Double> formula, String stability) {
        if (isStiffStability(stability)) {
            RecipeMath.adjust(formula, EPK_KAOLIN, 2.0);
            RecipeMath.adjust(formula, BENTONITE, 0.5);
            RecipeMath.adjust(formula, SILICA, -1.5);
            RecipeMath.adjustIfPresent(formula, "Whiting", -1.0);
        } else if (isFluidStability(stability)) {
            RecipeMath.adjust(formula, SILICA, 1.5);
            RecipeMath.adjust(formula, EPK_KAOLIN, -1.5);
            RecipeMath.adjust(formula, BENTONITE, -0.5);
            // Top up lithium only to the Fluxed-variant ceiling so Low + Fluxed does not stack Li2O past ~0.15.
            double lithiumRoom = RecipeBaseFactory.FLUXED_LITHIUM_CARBONATE - formula.getOrDefault(LITHIUM_CARBONATE, 0.0);
            RecipeMath.adjust(formula, LITHIUM_CARBONATE, Math.max(0.0, Math.min(1.5, lithiumRoom)));
            RecipeMath.adjust(formula, WOLLASTONITE, 1.0);
            RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -1.0);
        }
    }

    public static void applyOpacityAdjustments(Map<String, Double> formula, String opacity) {
        String normalized = opacity == null ? "" : opacity.toLowerCase(Locale.ROOT);
        if (normalized.contains("transluc") || normalized.contains("transparent")) {
            // A little extra silica for clarity; alumina is left alone so a translucent matte stays matte.
            RecipeMath.adjust(formula, SILICA, 1.5);
        } else if (normalized.isEmpty() || normalized.contains("semi")) {
            RecipeMath.adjust(formula, ZIRCOPAX, 5.0);
        } else if (normalized.contains("opaque")) {
            RecipeMath.adjust(formula, ZIRCOPAX, 10.0);
            RecipeMath.adjust(formula, TIN_OXIDE, 1.5);
        }
    }

    public static void applyColorants(Map<String, Double> formula,
                                      String primary,
                                      String secondary,
                                      String colorCharacter,
                                      int tempC,
                                      String atmosphere) {
        String character = normalizeCharacter(colorCharacter);
        String atmosphereMode = normalizeAtmosphere(atmosphere);
        if (isValidHex(primary)) {
            addColorantFromHex(formula, primary, 1.0, character, tempC, atmosphereMode);
        }
        if (isValidHex(secondary)) {
            addColorantFromHex(formula, secondary, 0.35, character, tempC, atmosphereMode);
        }
    }

    public static void applyEffectAgents(Map<String, Double> formula, List<String> effects,
                                         int intensity, String primaryColor, String secondaryColor,
                                         int tempC, String atmosphere) {
        double t = intensity / 100.0;
        String atmosphereMode = normalizeAtmosphere(atmosphere);
        boolean coolPurpleOxidation = ATMOSPHERE_OXIDATION.equals(atmosphereMode)
                && isValidHex(primaryColor)
                && isMidHighFirePurple(RecipeColorUtil.hexToHsl(primaryColor)[0], tempC);
        for (String rawEffect : effects) {
            String effect = rawEffect.toLowerCase(Locale.ROOT);
            if (effect.contains("speck")) {
                RecipeMath.adjust(formula, ILMENITE_GRANULAR, RecipeMath.clamp(1.5 * t));
                RecipeMath.adjust(formula, MANGANESE_GRANULES, RecipeMath.clamp(1.5 * t));
            } else if (effect.contains("crystal")) {
                RecipeMath.adjust(formula, ZINC_OXIDE, RecipeMath.clamp(14.0 * t));
                RecipeMath.adjust(formula, TITANIUM_DIOXIDE, RecipeMath.clamp(2.5 * t));
                RecipeMath.adjust(formula, SILICA, RecipeMath.clamp(4.0 * t));
                RecipeMath.adjustIfPresent(formula, EPK_KAOLIN, -RecipeMath.clamp(7.0 * t));
                RecipeMath.adjustIfPresent(formula, "Whiting", -RecipeMath.clamp(3.0 * t));
            } else if (effect.contains("varieg")) {
                if (coolPurpleOxidation) {
                    RecipeMath.adjust(formula, RUTILE, RecipeMath.clamp(3.2 * t));
                    RecipeMath.adjust(formula, IRON_OXIDE, RecipeMath.clamp(0.45 * t));
                } else {
                    RecipeMath.adjust(formula, RUTILE, RecipeMath.clamp(4.5 * t));
                    RecipeMath.adjust(formula, IRON_OXIDE, RecipeMath.clamp(1.5 * t));
                }
            } else if (effect.contains("flame")) {
                RecipeMath.adjust(formula, TITANIUM_DIOXIDE, RecipeMath.clamp(2.5 * t));
                RecipeMath.adjust(formula, IRON_CHROMATE, RecipeMath.clamp(1.2 * t));
                RecipeMath.adjust(formula, COPPER_CARBONATE, RecipeMath.clamp(0.8 * t));
            }
        }
    }

    public static void applyFoodSafetyAdjustments(Map<String, Double> formula, Boolean foodSafe) {
        if (!Boolean.TRUE.equals(foodSafe)) {
            return;
        }

        RecipeMath.adjust(formula, SILICA, 3.2);
        RecipeMath.adjust(formula, EPK_KAOLIN, 1.9);
        RecipeMath.adjust(formula, BENTONITE, 0.5);
        RecipeMath.adjust(formula, ZIRCOPAX, 0.4);

        RecipeMath.scaleIfPresent(formula, COPPER_CARBONATE, 0.45);
        RecipeMath.scaleIfPresent(formula, COBALT_CARBONATE, 0.35);
        RecipeMath.scaleIfPresent(formula, MANGANESE_DIOXIDE, 0.25);
        RecipeMath.scaleIfPresent(formula, MANGANESE_GRANULES, 0.15);
        RecipeMath.scaleIfPresent(formula, IRON_CHROMATE, 0.0);
        RecipeMath.scaleIfPresent(formula, LITHIUM_CARBONATE, 0.75);
    }

    public static void applyFeldsparSubstitution(Map<String, Double> formula, String substitution) {
        String target = selectedFeldsparName(substitution);
        if (POTASH_FELDSPAR.equals(target) || !formula.containsKey(POTASH_FELDSPAR)) {
            return;
        }

        double amount = formula.remove(POTASH_FELDSPAR);
        formula.put(target, formula.getOrDefault(target, 0.0) + amount);
    }

    private static void addColorantFromHex(Map<String, Double> formula,
                                           String hex,
                                           double weight,
                                           String colorCharacter,
                                           int tempC,
                                           String atmosphere) {
        double[] hsl = RecipeColorUtil.hexToHsl(hex);
        double h = hsl[0], s = hsl[1], l = hsl[2];
        boolean purpleZone = isPurpleZone(h);
        boolean oxidation = ATMOSPHERE_OXIDATION.equals(atmosphere);
        double chromaFactor = applyCharacterChroma(0.55 + (0.9 * s), colorCharacter);
        double darkFactor = RecipeMath.clamp01((0.52 - l) / 0.52);
        double lightFactor = RecipeMath.clamp01((l - 0.48) / 0.52);

        if (l < 0.12) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 7.0 * weight);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 1.5 * weight);
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 3.0 * weight);
        } else if (s < 0.12 || l > 0.87) {
            RecipeMath.adjust(formula, ZIRCOPAX, 9.0 * weight);
        } else if ((h < 30) || h >= 330) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 7.0 * weight * chromaFactor);
        } else if (h < 60) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 4.0 * weight * chromaFactor);
            RecipeMath.adjust(formula, RUTILE, 3.0 * weight * (0.7 + 0.6 * s));
        } else if (h < 80) {
            RecipeMath.adjust(formula, RUTILE, 5.5 * weight * (0.7 + 0.6 * s));
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 2.0 * weight * chromaFactor);
        } else if (h < 180) {
            if (h < 105) {
                RecipeMath.adjust(formula, COPPER_CARBONATE, 2.8 * weight * chromaFactor);
                RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 1.4 * weight * (0.6 + 0.8 * s));
                RecipeMath.adjust(formula, RUTILE, 0.9 * weight * (0.6 + darkFactor));
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.8 * weight * darkFactor);
            } else if (h < 150) {
                RecipeMath.adjust(formula, COPPER_CARBONATE, 3.6 * weight * chromaFactor);
                RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.5 * weight * (0.5 + 0.8 * s));
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.5 * weight * darkFactor);
            } else {
                RecipeMath.adjust(formula, COPPER_CARBONATE, 2.6 * weight * chromaFactor);
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.35 * weight * (0.5 + 0.8 * s));
                RecipeMath.adjust(formula, ZIRCOPAX, 1.8 * weight * lightFactor);
            }
        } else if (h < 220) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 2.5 * weight * chromaFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.4 * weight * (0.7 + 0.7 * s));
        } else if (h < 260) {
            if (l < 0.30) {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 1.45 * weight * chromaFactor);
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.9 * weight * (0.6 + darkFactor));
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.35 * weight * darkFactor);
            } else if (l > 0.66) {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.95 * weight * chromaFactor);
                RecipeMath.adjust(formula, COPPER_CARBONATE, 0.55 * weight * (0.4 + 0.6 * s));
                RecipeMath.adjust(formula, ZIRCOPAX, 2.6 * weight * lightFactor);
            } else {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 1.2 * weight * chromaFactor);
                RecipeMath.adjust(formula, COPPER_CARBONATE, 0.25 * weight * (0.4 + 0.6 * s));
            }
        } else {
            if (purpleZone) {
                double tempBias = (tempC - 1000.0) / 220.0;
                double manganeseBoost = 1.0 + Math.max(0.0, tempBias) * 1.4;
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 2.4 * weight * (0.7 + 0.7 * s) * chromaFactor * manganeseBoost);
                RecipeMath.adjust(formula, COPPER_CARBONATE, 1.25 * weight * (0.45 + 0.8 * s) * chromaFactor);
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.82 * weight * (0.45 + 0.55 * s) * chromaFactor);
            } else {
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 1.95 * weight * (0.6 + 0.6 * s) * chromaFactor);
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.95 * weight * (0.7 + 0.7 * s) * chromaFactor);
            }
        }

        if (darkFactor > 0.0) {
            if (purpleZone && oxidation) {
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.35 * weight * darkFactor);
            } else {
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 2.2 * weight * darkFactor);
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 1.1 * weight * darkFactor);
            }
        }
        if (lightFactor > 0.0) {
            RecipeMath.adjust(formula, ZIRCOPAX, 3.8 * weight * lightFactor);
        }
        if (s < 0.28 && l >= 0.2 && l <= 0.8) {
            RecipeMath.adjust(formula, RUTILE, 0.9 * weight * (0.28 - s) / 0.28);
        }

        applyStudioProfileTuning(formula, h, s, l, weight);
        applyRealWorldHueBias(formula, h, s, l, weight, darkFactor, lightFactor, chromaFactor, tempC, atmosphere);
        applyCharacterBias(formula, colorCharacter, weight, darkFactor, lightFactor);

        if (isMidHighFirePurple(h, tempC)) {
            applyMidHighPurpleCaps(formula, colorCharacter, atmosphere);
        }
    }

    private static void applyRealWorldHueBias(Map<String, Double> formula,
                                             double h,
                                             double s,
                                             double l,
                                             double weight,
                                             double darkFactor,
                                             double lightFactor,
                                             double chromaFactor,
                                             int tempC,
                                             String atmosphere) {
        double zoneFactor = firingZoneFactor(tempC);
        boolean reduction = ATMOSPHERE_REDUCTION.equals(atmosphere);

        if (h < 60) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.55 * weight * (0.5 + 0.8 * s) * zoneFactor);
            RecipeMath.adjust(formula, RUTILE, 0.85 * weight * (0.5 + 0.9 * s) * zoneFactor);
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.35 * weight * chromaFactor * zoneFactor);
        } else if (h < 105) {
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.65 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, RUTILE, 0.7 * weight * (0.55 + 0.8 * s) * zoneFactor);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.2 * weight * (0.3 + 0.6 * s) * zoneFactor);
        } else if (h < 180) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.75 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.4 * weight * (0.5 + 0.7 * s) * zoneFactor);
            RecipeMath.adjust(formula, ZIRCOPAX, 0.35 * weight * lightFactor * zoneFactor);
        } else if (h < 220) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.55 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.45 * weight * (0.4 + 0.8 * s) * zoneFactor);
            RecipeMath.adjust(formula, ZIRCOPAX, 0.55 * weight * lightFactor * zoneFactor);
        } else if (h < 260) {
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.55 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.25 * weight * (0.4 + darkFactor + 0.7 * s) * zoneFactor);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.2 * weight * (0.4 + 0.8 * s) * zoneFactor);
        } else {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.7 * weight * (0.5 + 0.9 * s) * zoneFactor);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.35 * weight * (0.5 + 0.8 * s) * zoneFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.18 * weight * (0.3 + 0.7 * s) * zoneFactor);
        }

        if (tempC < 1000) {
            RecipeMath.adjust(formula, ZIRCOPAX, 0.45 * weight * lightFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.15 * weight * chromaFactor);
        } else if (tempC < 1120) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.18 * weight * chromaFactor);
            RecipeMath.adjust(formula, SILICA, 0.22 * weight);
        } else if (tempC < 1200) {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.24 * weight * (0.5 + s));
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.12 * weight * (0.4 + s));
        } else if (tempC < 1260) {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.35 * weight * (0.6 + s));
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.18 * weight * (0.5 + s));
            RecipeMath.adjust(formula, ZIRCOPAX, 0.22 * weight * lightFactor);
        } else {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.42 * weight * (0.6 + s));
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.22 * weight * (0.5 + s));
        }

        if (reduction && (h >= 110 && h <= 220)) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.24 * weight * (0.7 + s));
            RecipeMath.adjust(formula, RUTILE, 0.18 * weight * (0.5 + s));
            RecipeMath.adjust(formula, COBALT_CARBONATE, -0.12 * weight);
        }
    }

    private static double firingZoneFactor(int tempC) {
        if (tempC < 1000) return 0.8;
        if (tempC < 1120) return 0.9;
        if (tempC < 1200) return 1.0;
        if (tempC < 1260) return 1.2;
        return 1.35;
    }

    private static void applyMidHighPurpleCaps(Map<String, Double> formula, String colorCharacter, String atmosphere) {
        boolean oxidation = ATMOSPHERE_OXIDATION.equals(atmosphere);
        double manganeseCap = oxidation ? PURPLE_MID_HIGH_MAX_MANGANESE : 1.8;
        double ironOxideCap = oxidation ? PURPLE_MID_HIGH_MAX_IRON_OXIDE : 0.75;
        double redIronCap = oxidation ? PURPLE_MID_HIGH_MAX_RED_IRON : 1.0;
        double yellowIronCap = oxidation ? PURPLE_MID_HIGH_MAX_YELLOW_IRON : 0.35;
        double rutileCap = oxidation ? PURPLE_MID_HIGH_MAX_RUTILE : 2.2;
        double cobaltMin = oxidation ? PURPLE_MID_HIGH_MIN_COBALT : 0.55;

        capIngredient(formula, MANGANESE_DIOXIDE, manganeseCap);
        capIngredient(formula, IRON_OXIDE, ironOxideCap);
        capIngredient(formula, RED_IRON_OXIDE, redIronCap);
        capIngredient(formula, YELLOW_IRON_OXIDE, yellowIronCap);
        if (!CHARACTER_EARTHY.equals(colorCharacter)) {
            capIngredient(formula, RUTILE, rutileCap);
        }

        double cobalt = formula.getOrDefault(COBALT_CARBONATE, 0.0);
        if (cobalt < cobaltMin) {
            RecipeMath.adjust(formula, COBALT_CARBONATE, cobaltMin - cobalt);
        }
        if (oxidation) {
            RecipeMath.adjust(formula, ZIRCOPAX, 0.6);
        } else {
            RecipeMath.adjust(formula, ZIRCOPAX, 0.2);
        }
    }

    private static void capIngredient(Map<String, Double> formula, String key, double max) {
        Double value = formula.get(key);
        if (value != null && value > max) {
            formula.put(key, max);
        }
    }

    private static boolean isPurpleZone(double hue) {
        return hue >= 260.0 && hue < 330.0;
    }

    private static boolean isMidHighFirePurple(double hue, int tempC) {
        return isPurpleZone(hue) && tempC >= 1200 && tempC <= 1265;
    }

    private static void applyCharacterBias(Map<String, Double> formula,
                                           String colorCharacter,
                                           double weight,
                                           double darkFactor,
                                           double lightFactor) {
        switch (colorCharacter) {
            case CHARACTER_CLEAN -> {
                RecipeMath.adjust(formula, ZIRCOPAX, 0.9 * weight + 1.3 * weight * lightFactor);
                RecipeMath.adjust(formula, SILICA, 0.45 * weight);
                RecipeMath.adjust(formula, RED_IRON_OXIDE, -0.65 * weight);
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, -0.5 * weight);
            }
            case CHARACTER_EARTHY -> {
                RecipeMath.adjust(formula, RUTILE, 0.9 * weight);
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.95 * weight + 0.5 * weight * darkFactor);
                RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.55 * weight);
                RecipeMath.adjust(formula, ZIRCOPAX, -0.7 * weight);
            }
            case CHARACTER_VIBRANT -> {
                RecipeMath.adjust(formula, COPPER_CARBONATE, 0.6 * weight);
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.35 * weight);
                RecipeMath.adjust(formula, LITHIUM_CARBONATE, 0.3 * weight);
                RecipeMath.adjust(formula, RUTILE, -0.35 * weight);
                RecipeMath.adjust(formula, ZIRCOPAX, -0.6 * weight);
            }
            default -> {
            }
        }
    }

    private static double applyCharacterChroma(double base, String colorCharacter) {
        return switch (colorCharacter) {
            case CHARACTER_CLEAN -> base * 0.92;
            case CHARACTER_EARTHY -> base * 0.95;
            case CHARACTER_VIBRANT -> base * 1.18;
            default -> base;
        };
    }

    private static void applyStudioProfileTuning(Map<String, Double> formula,
                                                 double h,
                                                 double s,
                                                 double l,
                                                 double weight) {
        if (RecipeColorUtil.isCeladonZone(h, s, l)) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.45 * weight);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.35 * weight);
            RecipeMath.adjust(formula, SILICA, 0.9 * weight);
            RecipeMath.adjustIfPresent(formula, EPK_KAOLIN, -0.45 * weight);
        }

        if (RecipeColorUtil.isRobinsEggZone(h, s, l)) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.75 * weight);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.35 * weight);
            RecipeMath.adjust(formula, ZIRCOPAX, 1.3 * weight);
            RecipeMath.adjust(formula, RUTILE, 0.3 * weight);
        }

        if (RecipeColorUtil.isArmyOliveZone(h, s, l)) {
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.95 * weight);
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.7 * weight);
            RecipeMath.adjust(formula, RUTILE, 0.55 * weight);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.2 * weight);
        }

        if (RecipeColorUtil.isSeafoamMintZone(h, s, l)) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.9 * weight);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.22 * weight);
            RecipeMath.adjust(formula, ZIRCOPAX, 1.7 * weight);
            RecipeMath.adjust(formula, SILICA, 0.35 * weight);
        }
    }

    private static String normalizeCharacter(String colorCharacter) {
        if (colorCharacter == null || colorCharacter.isBlank()) {
            return CHARACTER_NATURAL;
        }
        String normalized = colorCharacter.toLowerCase(Locale.ROOT).trim();
        if (normalized.contains("clean")) {
            return CHARACTER_CLEAN;
        }
        if (normalized.contains("earth")) {
            return CHARACTER_EARTHY;
        }
        if (normalized.contains("vibr")) {
            return CHARACTER_VIBRANT;
        }
        return CHARACTER_NATURAL;
    }

    private static String normalizeAtmosphere(String atmosphere) {
        if (atmosphere == null || atmosphere.isBlank()) {
            return ATMOSPHERE_OXIDATION;
        }
        String normalized = atmosphere.toLowerCase(Locale.ROOT).trim();
        return ATMOSPHERE_REDUCTION.equals(normalized) ? ATMOSPHERE_REDUCTION : ATMOSPHERE_OXIDATION;
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

    private static boolean isValidHex(String value) {
        return value != null && value.matches("^#[0-9a-fA-F]{6}$");
    }
}