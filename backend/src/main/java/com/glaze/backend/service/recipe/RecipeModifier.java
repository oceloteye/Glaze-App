package com.glaze.backend.service.recipe;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.glaze.backend.service.recipe.RecipeIngredients.BALL_CLAY;
import static com.glaze.backend.service.recipe.RecipeIngredients.BENTONITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.BONE_ASH;
import static com.glaze.backend.service.recipe.RecipeIngredients.CHROME_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COBALT_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COPPER_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.CUSTER_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.DOLOMITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.EPK_KAOLIN;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3124;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3134;
import static com.glaze.backend.service.recipe.RecipeIngredients.GERSTLEY_BORATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ILMENITE_GRANULAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.IRON_CHROMATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.LITHIUM_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.MANGANESE_DIOXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.MANGANESE_GRANULES;
import static com.glaze.backend.service.recipe.RecipeIngredients.NEPHELINE_SYENITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.NICKEL_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.RED_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.RUTILE;
import static com.glaze.backend.service.recipe.RecipeIngredients.SILICA;
import static com.glaze.backend.service.recipe.RecipeIngredients.SPODUMENE;
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
        if (isValidHex(primary) && applyArchetypeBase(formula, primary, tempC, atmosphereMode)) {
            return;
        }
        if (isValidHex(primary)) {
            addColorantFromHex(formula, primary, 1.0, character, tempC, atmosphereMode);
        }
        if (isValidHex(secondary)) {
            addColorantFromHex(formula, secondary, 0.35, character, tempC, atmosphereMode);
        }
    }

    /**
     * Some colours only exist as a whole recipe family, not as a colourant added to a generic base:
     * saturated iron reds, kaki, copper reds and shino. When the ask lands squarely in one of those
     * the generic base is replaced by the canonical recipe for that family.
     */
    private static boolean applyArchetypeBase(Map<String, Double> formula, String hex, int tempC, String atmosphere) {
        double[] hsl = RecipeColorUtil.hexToHsl(hex);
        double h = hsl[0], s = hsl[1], l = hsl[2];
        boolean reduction = ATMOSPHERE_REDUCTION.equals(atmosphere);
        boolean redHue = h < 30 || h >= 330;

        if (!reduction && redHue && s >= 0.45 && l >= 0.2 && l <= 0.45 && tempC >= 1150 && tempC <= 1260) {
            // Randy's Red family: iron-saturated boron/talc melt that recrystallises to rust on cooling
            replace(formula, Map.of(GERSTLEY_BORATE, 32.0, SILICA, 30.0, POTASH_FELDSPAR, 20.0, TALC, 14.0,
                    EPK_KAOLIN, 5.0, RED_IRON_OXIDE, 15.0, BENTONITE, 2.0));
            return true;
        }
        if (reduction && tempC >= 1250) {
            if (h >= 5 && h < 30 && s >= 0.4 && l >= 0.15 && l <= 0.35) {
                // Ohata kaki: saturated iron re-oxidising over bone ash / talc seeds
                replace(formula, Map.of(CUSTER_FELDSPAR, 48.0, SILICA, 24.0, WHITING, 12.0, BONE_ASH, 7.0,
                        TALC, 4.5, RED_IRON_OXIDE, 12.0));
                return true;
            }
            if ((h >= 330 || h < 8) && s >= 0.3 && l >= 0.3 && l <= 0.55) {
                // copper red: a trace of copper and tin in a lime glossy
                replace(formula, Map.of(POTASH_FELDSPAR, 40.0, SILICA, 30.0, WHITING, 20.0, EPK_KAOLIN, 10.0,
                        COPPER_CARBONATE, 0.5, TIN_OXIDE, 1.0));
                return true;
            }
            if (h >= 20 && h < 45 && s >= 0.3 && l >= 0.6) {
                // shino: high-alumina soda/lithium melt, no lime, flashes orange where thin
                replace(formula, Map.of(NEPHELINE_SYENITE, 50.0, SPODUMENE, 25.0, EPK_KAOLIN, 15.0, BALL_CLAY, 10.0));
                return true;
            }
        }
        return false;
    }

    private static void replace(Map<String, Double> formula, Map<String, Double> recipe) {
        formula.clear();
        formula.putAll(recipe);
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
        boolean reduction = !oxidation;
        boolean warm = h < 60 || h >= 330;
        double chromaFactor = applyCharacterChroma(0.55 + (0.9 * s), colorCharacter);
        double darkFactor = RecipeMath.clamp01((0.52 - l) / 0.52);
        double lightFactor = RecipeMath.clamp01((l - 0.48) / 0.52);
        // how far below "pale" the ask sits; iron doses scale with this so a honey is not dosed like a brick
        double depth = RecipeMath.clamp01((0.9 - l) / 0.5);
        // cobalt is strong enough that low-saturation blues need a fraction of the full dose
        double satScale = cobaltSatScale(s);

        if (l > 0.87 || (s < 0.12 && l > 0.7)) {
            RecipeMath.adjust(formula, ZIRCOPAX, 9.0 * weight);
            return;
        }
        boolean ironSaturate = warm && s >= 0.15 && s < 0.45 && l < 0.26;
        if (l < 0.2 || ironSaturate) {
            if (warm && s >= 0.15) {
                // tenmoku: ~10% iron once normalised; below that the melt sits at yellow-brown
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 11.0 * weight);
            } else {
                // black: iron carries the load, cobalt only kills the brown
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 9.0 * weight);
                RecipeMath.adjust(formula, COBALT_CARBONATE, 1.8 * weight);
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 2.5 * weight);
            }
            return;
        }
        if (s < 0.12) {
            // neutral grey / khaki: nickel, darkened with a little iron and manganese
            RecipeMath.adjust(formula, NICKEL_OXIDE, 1.2 * weight * (1.0 - l));
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 2.5 * weight * darkFactor);
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.8 * weight * darkFactor);
            return;
        }
        if (reduction && h >= 80 && h < 200 && s < 0.32 && l >= 0.45) {
            // celadon family: iron alone, blue-grey at a trace and olive as it builds
            double dose = h < 120 ? 2.0 + 4.5 * (1.0 - l) : 0.6 + 2.2 * (1.0 - l);
            RecipeMath.adjust(formula, RED_IRON_OXIDE, dose * weight);
            return;
        }
        if (reduction && h >= 195 && h < 215 && s < 0.35 && l >= 0.6) {
            // chun: phosphate opalescence over a trace of iron
            RecipeMath.adjust(formula, BONE_ASH, 4.0 * weight);
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 1.0 * weight);
            return;
        }
        if (h >= 205 && h < 260 && s < 0.35 && l >= 0.6) {
            // pale blue: a trace of cobalt is all a clear needs; whiten only the very palest
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.45 * weight * RecipeMath.clamp01((0.85 - l) / 0.25) * (0.5 + s));
            RecipeMath.adjust(formula, ZIRCOPAX, 3.0 * weight * RecipeMath.clamp01((l - 0.7) / 0.15));
            return;
        }
        if ((h >= 330 || h < 15) && l >= 0.6 && s >= 0.3 && s <= 0.6) {
            // chrome-tin pink
            RecipeMath.adjust(formula, TIN_OXIDE, 5.0 * weight);
            RecipeMath.adjust(formula, CHROME_OXIDE, 0.25 * weight);
            return;
        }
        if (h >= 255 && s < 0.4 && l >= 0.3) {
            // manganese plum, pushed toward violet by a cobalt trace as the ask gets bluer
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 4.0 * weight * chromaFactor + 2.5 * weight * darkFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.35 * weight * RecipeMath.clamp01((300.0 - h) / 40.0));
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.5 * weight);
            return;
        }

        if ((h < 30) || h >= 330) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 7.0 * weight * chromaFactor * RecipeMath.clamp01(depth + 0.3));
        } else if (h < 60) {
            // honey / amber: iron builds faster than linearly with depth so tans stay pale and ambers go deep
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 4.0 * weight * chromaFactor * depth + 4.0 * weight * chromaFactor * depth * depth);
            RecipeMath.adjust(formula, RUTILE, 3.0 * weight * (0.7 + 0.6 * s) * RecipeMath.clamp01(depth * 1.6));
        } else if (h < 80) {
            RecipeMath.adjust(formula, RUTILE, 5.5 * weight * (0.7 + 0.6 * s));
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 2.0 * weight * chromaFactor);
        } else if (h < 180) {
            if (h < 105) {
                RecipeMath.adjust(formula, COPPER_CARBONATE, 2.8 * weight * chromaFactor * depth);
                RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 1.4 * weight * (0.6 + 0.8 * s));
                RecipeMath.adjust(formula, RUTILE, 0.9 * weight * (0.6 + darkFactor));
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.8 * weight * darkFactor);
            } else if (h < 150) {
                RecipeMath.adjust(formula, COPPER_CARBONATE, 3.6 * weight * chromaFactor * depth);
                RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.5 * weight * (0.5 + 0.8 * s));
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.5 * weight * darkFactor);
            } else {
                // turquoise: copper in an alkaline melt, no cobalt
                RecipeMath.adjust(formula, COPPER_CARBONATE, 2.6 * weight * chromaFactor);
                RecipeMath.adjust(formula, ZIRCOPAX, 1.8 * weight * lightFactor);
                if (s >= 0.25) {
                    moveToAlkalineFlux(formula);
                }
            }
        } else if (h < 220) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 2.5 * weight * chromaFactor);
            if (h >= 200) {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.4 * weight * (0.7 + 0.7 * s) * satScale);
            } else if (s >= 0.25) {
                moveToAlkalineFlux(formula);
            }
        } else if (h < 260) {
            if (l < 0.30) {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 1.45 * weight * chromaFactor * satScale);
                RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.9 * weight * (0.6 + darkFactor));
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.35 * weight * darkFactor);
            } else if (l > 0.66) {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 0.95 * weight * chromaFactor * satScale);
                RecipeMath.adjust(formula, COPPER_CARBONATE, 0.55 * weight * (0.4 + 0.6 * s));
                RecipeMath.adjust(formula, ZIRCOPAX, 2.6 * weight * lightFactor);
            } else {
                RecipeMath.adjust(formula, COBALT_CARBONATE, 1.2 * weight * chromaFactor * satScale);
                RecipeMath.adjust(formula, COPPER_CARBONATE, 0.25 * weight * (0.4 + 0.6 * s));
            }
            // low-saturation blues are rutile blues: titania breaks the cobalt into a milky slate
            RecipeMath.adjust(formula, RUTILE, 2.5 * weight * RecipeMath.clamp01((0.28 - s) / 0.12));
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
            } else if (warm) {
                RecipeMath.adjust(formula, RED_IRON_OXIDE, 3.5 * weight * darkFactor);
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

    /** Cobalt dose scale for a given saturation: a floor so dusty blues still read blue, full dose from s≈0.4. */
    private static double cobaltSatScale(double s) {
        return RecipeMath.clamp01((s - 0.06) / 0.34);
    }

    /** Copper only goes turquoise in a soda/lithium melt: swap potash feldspar for nepheline syenite and the calcium frit for the soda frit. */
    private static void moveToAlkalineFlux(Map<String, Double> formula) {
        Double potash = formula.remove(POTASH_FELDSPAR);
        if (potash != null) {
            RecipeMath.adjust(formula, NEPHELINE_SYENITE, potash);
        }
        Double calciumFrit = formula.remove(FERRO_FRIT_3124);
        if (calciumFrit != null) {
            RecipeMath.adjust(formula, FERRO_FRIT_3134, calciumFrit);
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
        double depth = RecipeMath.clamp01((0.9 - l) / 0.5);

        if (h < 60) {
            RecipeMath.adjust(formula, RED_IRON_OXIDE, 0.55 * weight * (0.5 + 0.8 * s) * zoneFactor * depth);
            RecipeMath.adjust(formula, RUTILE, 0.85 * weight * (0.5 + 0.9 * s) * zoneFactor * depth);
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.35 * weight * chromaFactor * zoneFactor * depth);
        } else if (h < 105) {
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.65 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, RUTILE, 0.7 * weight * (0.55 + 0.8 * s) * zoneFactor);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.2 * weight * (0.3 + 0.6 * s) * zoneFactor);
        } else if (h < 180) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.75 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, YELLOW_IRON_OXIDE, 0.4 * weight * (0.5 + 0.7 * s) * zoneFactor * (h < 150 ? 1.0 : 0.0));
            RecipeMath.adjust(formula, ZIRCOPAX, 0.35 * weight * lightFactor * zoneFactor);
        } else if (h < 220) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.55 * weight * chromaFactor * zoneFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.45 * weight * (0.4 + 0.8 * s) * zoneFactor * (h >= 200 ? 1.0 : 0.0));
            RecipeMath.adjust(formula, ZIRCOPAX, 0.55 * weight * lightFactor * zoneFactor);
        } else if (h < 260) {
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.55 * weight * chromaFactor * zoneFactor * cobaltSatScale(s));
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.25 * weight * (0.4 + darkFactor + 0.7 * s) * zoneFactor);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.2 * weight * (0.4 + 0.8 * s) * zoneFactor);
        } else {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.7 * weight * (0.5 + 0.9 * s) * zoneFactor);
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.35 * weight * (0.5 + 0.8 * s) * zoneFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.18 * weight * (0.3 + 0.7 * s) * zoneFactor);
        }

        // manganese and cobalt only deepen cool hues; on warm asks they just muddy the colour
        boolean cool = h >= 200 && h < 330;
        double coolDepth = cool ? (1.0 - lightFactor) : 0.0;
        if (tempC < 1000) {
            RecipeMath.adjust(formula, ZIRCOPAX, 0.45 * weight * lightFactor);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.15 * weight * chromaFactor * coolDepth);
        } else if (tempC < 1120) {
            RecipeMath.adjust(formula, COPPER_CARBONATE, 0.18 * weight * chromaFactor * (h >= 80 && h < 220 ? 1.0 : 0.0));
            RecipeMath.adjust(formula, SILICA, 0.22 * weight);
        } else if (tempC < 1200) {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.24 * weight * (0.5 + s) * coolDepth);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.12 * weight * (0.4 + s) * coolDepth);
        } else if (tempC < 1260) {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.35 * weight * (0.6 + s) * coolDepth);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.18 * weight * (0.5 + s) * coolDepth);
            RecipeMath.adjust(formula, ZIRCOPAX, 0.22 * weight * lightFactor);
        } else {
            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 0.42 * weight * (0.6 + s) * coolDepth);
            RecipeMath.adjust(formula, COBALT_CARBONATE, 0.22 * weight * (0.5 + s) * coolDepth);
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