package com.glaze.backend.service;

import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeSuggestion;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class GlazeRecipeService {

    private static final String DEFAULT_FELDSPAR = "Potash Feldspar";
    private static final String NEPHELINE_SYENITE = "Nepheline Syenite";
    private static final String SODA_FELDSPAR = "Soda Feldspar";
    private static final String CHARACTER_NATURAL = "natural";
    private static final String CHARACTER_CLEAN = "clean";
    private static final String CHARACTER_EARTHY = "earthy";
    private static final String CHARACTER_VIBRANT = "vibrant";

    // ── Public API ───────────────────────────────────────────────────────────

    public List<RecipeSuggestion> generateRecipes(GlazeRequest request) {
        var recipes = new ArrayList<RecipeSuggestion>();
        recipes.add(buildRecipe("Balanced",   standardBase(request.firingTempC()), request));
        recipes.add(buildRecipe("High-Silica", highSilicaBase(request.firingTempC()), request));
        recipes.add(buildRecipe("Fluxed",     fluxedBase(request.firingTempC()), request));
        return recipes;
    }

    // ── Recipe builder ───────────────────────────────────────────────────────

    private RecipeSuggestion buildRecipe(String variant, Map<String, Double> base, GlazeRequest req) {
        var formula = new LinkedHashMap<>(base);
        int intensity = req.intensity() != null ? req.intensity() : 50;

        applySurfaceAdjustments(formula, req.surfaceFinish(), req.firingTempC());
        applyStabilityAdjustments(formula, req.stability());
        applyColorants(formula, req.color(), req.secondaryColor(), req.colorCharacter());
        applyEffectAgents(formula, req.effects(), intensity, req.secondaryColor());
        applyFeldsparSubstitution(formula, req.feldsparSubstitute());
        applyFoodSafetyAdjustments(formula, req.foodSafe());
        normalize(formula);

        return new RecipeSuggestion(
                recipeName(variant, req),
                firingRangeFor(req.firingTempC()),
                formula,
                buildRationale(variant, req, formula));
    }

    private static String recipeName(String variant, GlazeRequest req) {
        String finish = capitalize(req.surfaceFinish());
        String range  = firingRangeShort(req.firingTempC());
        return switch (variant) {
            case "High-Silica" -> finish + " " + range + " — High-Silica";
            case "Fluxed"      -> finish + " " + range + " — Fluxed";
            default            -> finish + " " + range + " — Balanced";
        };
    }

    // ── Temperature-appropriate base formulas ────────────────────────────────

    /** Very low / low fire (≤ 1000 °C): frit-dominant. */
    private static Map<String, Double> lowFireBase() {
        var f = new LinkedHashMap<String, Double>();
        f.put("Ferro Frit 3134",  55.0);
        f.put("EPK Kaolin",       20.0);
        f.put("Silica",           17.0);
        f.put("Whiting",           6.0);
        f.put("Bentonite",         2.0);
        return f;
    }

    /** Low-mid fire (1000–1120 °C): partial frit + feldspar. */
    private static Map<String, Double> lowMidFireBase() {
        var f = new LinkedHashMap<String, Double>();
        f.put("Ferro Frit 3134",  35.0);
        f.put(DEFAULT_FELDSPAR,    18.0);
        f.put("Silica",           20.0);
        f.put("EPK Kaolin",       16.0);
        f.put("Whiting",           9.0);
        f.put("Bentonite",         2.0);
        return f;
    }

    /** Mid fire (1120–1200 °C): mineral flux base. */
    private static Map<String, Double> midFireBase() {
        var f = new LinkedHashMap<String, Double>();
        f.put(DEFAULT_FELDSPAR,    32.0);
        f.put("Silica",           23.0);
        f.put("EPK Kaolin",       16.0);
        f.put("Whiting",          14.0);
        f.put("Dolomite",          9.0);
        f.put("Zinc Oxide",        4.0);
        f.put("Bentonite",         2.0);
        return f;
    }

    /** High fire (≥ 1200 °C): feldspar-heavy, high silica. */
    private static Map<String, Double> highFireBase() {
        var f = new LinkedHashMap<String, Double>();
        f.put(DEFAULT_FELDSPAR,    37.0);
        f.put("Silica",           27.0);
        f.put("EPK Kaolin",       13.0);
        f.put("Whiting",          14.0);
        f.put("Dolomite",          7.0);
        f.put("Bentonite",         2.0);
        return f;
    }

    private static Map<String, Double> baseForTemp(int tempC) {
        if (tempC < 1000) return lowFireBase();
        if (tempC < 1120) return lowMidFireBase();
        if (tempC < 1200) return midFireBase();
        return highFireBase();
    }

    private static Map<String, Double> standardBase(int tempC) {
        return new LinkedHashMap<>(baseForTemp(tempC));
    }

    private static Map<String, Double> highSilicaBase(int tempC) {
        var f = new LinkedHashMap<>(baseForTemp(tempC));
        adjust(f, "Silica",           5.0);
        adjustIfPresent(f, "EPK Kaolin",       -3.0);
        adjustIfPresent(f, DEFAULT_FELDSPAR,  -2.0);
        adjustIfPresent(f, "Ferro Frit 3134",  -2.0);  // for low-fire
        // Extra flint raises durability and reduces crawling
        return f;
    }

    private static Map<String, Double> fluxedBase(int tempC) {
        var f = new LinkedHashMap<>(baseForTemp(tempC));
        if (tempC < 1120) {
            // For low/low-mid: add more frit as flux
            adjust(f, "Ferro Frit 3134", 6.0);
            adjustIfPresent(f, "Silica",       -3.0);
            adjustIfPresent(f, "Whiting",      -3.0);
        } else {
            // For mid/high: Lithium Carbonate boosts flux without adding alumina
            adjust(f, "Lithium Carbonate",  3.5);
            adjustIfPresent(f, DEFAULT_FELDSPAR, -2.0);
            adjustIfPresent(f, "Silica",          -1.5);
        }
        return f;
    }

    // ── Surface finish adjustments ───────────────────────────────────────────

    private static void applySurfaceAdjustments(Map<String, Double> f, String finish, int tempC) {
        String s = finish.toLowerCase(Locale.ROOT);
        if (s.contains("gloss")) {
            adjust(f, "Silica", 3.0);
            adjustIfPresent(f, DEFAULT_FELDSPAR, 2.0);
            adjustIfPresent(f, "Ferro Frit 3134", 2.0);
            adjustIfPresent(f, "Dolomite",       -2.0);
            adjustIfPresent(f, "EPK Kaolin",     -3.0);
        } else if (s.contains("matte")) {
            adjustIfPresent(f, "Dolomite",        4.0);
            adjust(f, "EPK Kaolin",               2.5);
            adjust(f, "Silica",                  -3.0);
            adjustIfPresent(f, DEFAULT_FELDSPAR,-2.0);
            // Wollastonite promotes matting in all temp ranges
            adjust(f, "Wollastonite",             2.0);
        } else {
            // Satin
            adjustIfPresent(f, "Dolomite",  2.0);
            adjust(f, "EPK Kaolin",         1.0);
            adjust(f, "Silica",            -2.0);
        }
    }

    // ── Stability adjustments ────────────────────────────────────────────────

    private static void applyStabilityAdjustments(Map<String, Double> f, String stability) {
        String s = stability.toLowerCase(Locale.ROOT);
        if (s.contains("high")) {
            adjust(f, "EPK Kaolin",   2.0);
            adjust(f, "Bentonite",    0.5);
            adjust(f, "Silica",      -1.5);
            adjustIfPresent(f, "Whiting", -1.0);
        } else if (s.contains("low")) {
            adjust(f, "Silica",      1.5);
            adjust(f, "EPK Kaolin", -1.5);
            adjust(f, "Bentonite",  -0.5);
        }
        // Medium: no adjustment — base formula is already balanced
    }

    // ── Colorant additions ───────────────────────────────────────────────────

    private static void applyColorants(Map<String, Double> formula,
                                       String primary,
                                       String secondary,
                                       String colorCharacter) {
        String character = normalizeCharacter(colorCharacter);
        if (isValidHex(primary)) {
            addColorantFromHex(formula, primary, 1.0, character);
        }
        if (isValidHex(secondary)) {
            addColorantFromHex(formula, secondary, 0.35, character);
        }
    }

    private static void addColorantFromHex(Map<String, Double> formula,
                                           String hex,
                                           double weight,
                                           String colorCharacter) {
        double[] hsl = hexToHsl(hex);
        double h = hsl[0], s = hsl[1], l = hsl[2];
        double chromaFactor = applyCharacterChroma(0.55 + (0.9 * s), colorCharacter);
        double darkFactor = clamp01((0.52 - l) / 0.52);
        double lightFactor = clamp01((l - 0.48) / 0.52);

        if (l < 0.12) {
            // Near-black
            adjust(formula, "Red Iron Oxide",    7.0 * weight);
            adjust(formula, "Cobalt Carbonate",  1.5 * weight);
            adjust(formula, "Manganese Dioxide", 3.0 * weight);
        } else if (s < 0.12 || l > 0.87) {
            // White / near-white / very desaturated
            adjust(formula, "Zircopax",  9.0 * weight);
        } else if ((h < 30) || h >= 330) {
            // Red / rust
            adjust(formula, "Red Iron Oxide",  7.0 * weight * chromaFactor);
        } else if (h < 60) {
            // Orange
            adjust(formula, "Red Iron Oxide",  4.0 * weight * chromaFactor);
            adjust(formula, "Rutile",          3.0 * weight * (0.7 + 0.6 * s));
        } else if (h < 80) {
            // Yellow / amber
            adjust(formula, "Rutile",          5.5 * weight * (0.7 + 0.6 * s));
            adjust(formula, "Yellow Iron Oxide", 2.0 * weight * chromaFactor);
        } else if (h < 180) {
            // Green family: differentiate olive/chartreuse, true green, and mint/blue-green.
            if (h < 105) {
                // Olive and chartreuse: warmer iron-rich path.
                adjust(formula, "Copper Carbonate", 2.8 * weight * chromaFactor);
                adjust(formula, "Yellow Iron Oxide", 1.4 * weight * (0.6 + 0.8 * s));
                adjust(formula, "Rutile", 0.9 * weight * (0.6 + darkFactor));
                adjust(formula, "Red Iron Oxide", 0.8 * weight * darkFactor);
            } else if (h < 150) {
                // True greens.
                adjust(formula, "Copper Carbonate", 3.6 * weight * chromaFactor);
                adjust(formula, "Yellow Iron Oxide", 0.5 * weight * (0.5 + 0.8 * s));
                adjust(formula, "Red Iron Oxide", 0.5 * weight * darkFactor);
            } else {
                // Mint/seafoam end: cooler with light opacification.
                adjust(formula, "Copper Carbonate", 2.6 * weight * chromaFactor);
                adjust(formula, "Cobalt Carbonate", 0.35 * weight * (0.5 + 0.8 * s));
                adjust(formula, "Zircopax", 1.8 * weight * lightFactor);
            }
        } else if (h < 220) {
            // Cyan / teal
            adjust(formula, "Copper Carbonate",  2.5 * weight * chromaFactor);
            adjust(formula, "Cobalt Carbonate",  0.4 * weight * (0.7 + 0.7 * s));
        } else if (h < 260) {
            // Blue family: navy vs medium blue vs sky blue.
            if (l < 0.30) {
                adjust(formula, "Cobalt Carbonate", 1.45 * weight * chromaFactor);
                adjust(formula, "Manganese Dioxide", 0.9 * weight * (0.6 + darkFactor));
                adjust(formula, "Red Iron Oxide", 0.35 * weight * darkFactor);
            } else if (l > 0.66) {
                adjust(formula, "Cobalt Carbonate", 0.95 * weight * chromaFactor);
                adjust(formula, "Copper Carbonate", 0.55 * weight * (0.4 + 0.6 * s));
                adjust(formula, "Zircopax", 2.6 * weight * lightFactor);
            } else {
                adjust(formula, "Cobalt Carbonate", 1.2 * weight * chromaFactor);
                adjust(formula, "Copper Carbonate", 0.25 * weight * (0.4 + 0.6 * s));
            }
        } else {
            // Purple / violet
            adjust(formula, "Manganese Dioxide", 3.5 * weight * chromaFactor);
            adjust(formula, "Cobalt Carbonate",  0.6 * weight * (0.7 + 0.7 * s));
        }

        // Tone adjustments ensure different shades within a hue map to different chemistry.
        if (darkFactor > 0.0) {
            adjust(formula, "Red Iron Oxide", 2.2 * weight * darkFactor);
            adjust(formula, "Manganese Dioxide", 1.1 * weight * darkFactor);
        }
        if (lightFactor > 0.0) {
            adjust(formula, "Zircopax", 3.8 * weight * lightFactor);
        }
        if (s < 0.28 && l >= 0.2 && l <= 0.8) {
            adjust(formula, "Rutile", 0.9 * weight * (0.28 - s) / 0.28);
        }

        applyStudioProfileTuning(formula, h, s, l, weight);
        applyCharacterBias(formula, colorCharacter, weight, darkFactor, lightFactor);
    }

    private static void applyCharacterBias(Map<String, Double> formula,
                                           String colorCharacter,
                                           double weight,
                                           double darkFactor,
                                           double lightFactor) {
        switch (colorCharacter) {
            case CHARACTER_CLEAN -> {
                adjust(formula, "Zircopax", 0.9 * weight + 1.3 * weight * lightFactor);
                adjust(formula, "Silica", 0.45 * weight);
                adjust(formula, "Red Iron Oxide", -0.65 * weight);
                adjust(formula, "Manganese Dioxide", -0.5 * weight);
            }
            case CHARACTER_EARTHY -> {
                adjust(formula, "Rutile", 0.9 * weight);
                adjust(formula, "Red Iron Oxide", 0.95 * weight + 0.5 * weight * darkFactor);
                adjust(formula, "Yellow Iron Oxide", 0.55 * weight);
                adjust(formula, "Zircopax", -0.7 * weight);
            }
            case CHARACTER_VIBRANT -> {
                adjust(formula, "Copper Carbonate", 0.6 * weight);
                adjust(formula, "Cobalt Carbonate", 0.35 * weight);
                adjust(formula, "Lithium Carbonate", 0.3 * weight);
                adjust(formula, "Rutile", -0.35 * weight);
                adjust(formula, "Zircopax", -0.6 * weight);
            }
            default -> {
                // Natural keeps the tuned model unchanged.
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

    // Second-pass tuning for common studio outcomes.
    private static void applyStudioProfileTuning(Map<String, Double> formula,
                                                 double h,
                                                 double s,
                                                 double l,
                                                 double weight) {
        if (isCeladonZone(h, s, l)) {
            // Celadon: iron-kissed translucent green at higher silica.
            adjust(formula, "Red Iron Oxide", 0.45 * weight);
            adjust(formula, "Copper Carbonate", 0.35 * weight);
            adjust(formula, "Silica", 0.9 * weight);
            adjustIfPresent(formula, "EPK Kaolin", -0.45 * weight);
        }

        if (isRobinsEggZone(h, s, l)) {
            // Robin's egg: soft blue with slight opacity and variegation potential.
            adjust(formula, "Copper Carbonate", 0.75 * weight);
            adjust(formula, "Cobalt Carbonate", 0.35 * weight);
            adjust(formula, "Zircopax", 1.3 * weight);
            adjust(formula, "Rutile", 0.3 * weight);
        }

        if (isArmyOliveZone(h, s, l)) {
            // Army olive: earthy iron-dominant green-brown cast.
            adjust(formula, "Yellow Iron Oxide", 0.95 * weight);
            adjust(formula, "Red Iron Oxide", 0.7 * weight);
            adjust(formula, "Rutile", 0.55 * weight);
            adjust(formula, "Copper Carbonate", 0.2 * weight);
        }

        if (isSeafoamMintZone(h, s, l)) {
            // Seafoam mint: clean, bright mint with cooler cast and opacity.
            adjust(formula, "Copper Carbonate", 0.9 * weight);
            adjust(formula, "Cobalt Carbonate", 0.22 * weight);
            adjust(formula, "Zircopax", 1.7 * weight);
            adjust(formula, "Silica", 0.35 * weight);
        }
    }

    private static boolean isCeladonZone(double h, double s, double l) {
        return h >= 100 && h <= 155 && s >= 0.18 && s <= 0.5 && l >= 0.38 && l <= 0.72;
    }

    private static boolean isRobinsEggZone(double h, double s, double l) {
        return h >= 175 && h <= 210 && s >= 0.25 && s <= 0.65 && l >= 0.56 && l <= 0.84;
    }

    private static boolean isArmyOliveZone(double h, double s, double l) {
        return h >= 70 && h <= 110 && s >= 0.22 && s <= 0.55 && l >= 0.24 && l <= 0.5;
    }

    private static boolean isSeafoamMintZone(double h, double s, double l) {
        return h >= 145 && h <= 180 && s >= 0.22 && s <= 0.6 && l >= 0.62 && l <= 0.9;
    }

    // ── Effect-specific chemistry ─────────────────────────────────────────────

    private static void applyEffectAgents(Map<String, Double> formula, List<String> effects,
                                          int intensity, String secondaryColor) {
        double t = intensity / 100.0;   // 0 = none, 1 = standard, 2 = extreme
        for (String rawEffect : effects) {
            String e = rawEffect.toLowerCase(Locale.ROOT);
            if (e.contains("speck")) {
                // Granular speckle agents
                adjust(formula, "Ilmenite (granular)",   clamp(1.5 * t));
                adjust(formula, "Manganese Granules",    clamp(1.5 * t));
            } else if (e.contains("crystal")) {
                // Crystalline: high zinc, low alumina, TiO₂ as nucleating agent
                adjust(formula, "Zinc Oxide",           clamp(14.0 * t));
                adjust(formula, "Titanium Dioxide",     clamp(2.5  * t));
                adjust(formula, "Silica",               clamp(4.0  * t));
                adjustIfPresent(formula, "EPK Kaolin",  -clamp(7.0 * t));  // reduce alumina
                adjustIfPresent(formula, "Whiting",     -clamp(3.0 * t));
            } else if (e.contains("varieg")) {
                // Rutile + iron for colour movement
                adjust(formula, "Rutile",      clamp(4.5 * t));
                adjust(formula, "Iron Oxide",  clamp(1.5 * t));
            } else if (e.contains("flame")) {
                // Flame-style: TiO₂ promotes phase separation; iron chromate for metallic flash
                adjust(formula, "Titanium Dioxide",  clamp(2.5 * t));
                adjust(formula, "Iron Chromate",     clamp(1.2 * t));
                adjust(formula, "Copper Carbonate",  clamp(0.8 * t));
            } else if (e.contains("melt")) {
                // Lithium Carbonate as a strong flux to encourage melt / run
                adjust(formula, "Lithium Carbonate", clamp(3.0 * t));
                adjust(formula, "Wollastonite",      clamp(2.0 * t));
                adjustIfPresent(formula, DEFAULT_FELDSPAR, -clamp(1.5 * t));
            } else if (e.contains("opaque")) {
                adjust(formula, "Zircopax",   clamp(6.0 * t));
                adjust(formula, "Tin Oxide",  clamp(2.5 * t));
            } else if (e.contains("transluc")) {
                adjust(formula, "Silica",        clamp(3.5 * t));
                adjustIfPresent(formula, "EPK Kaolin", -clamp(2.0 * t));
            }
        }
    }

    // ── Rationale builder ────────────────────────────────────────────────────

    private static String buildRationale(String variant, GlazeRequest req, Map<String, Double> formula) {
        var sb = new StringBuilder();
        String feldspar = selectedFeldsparName(req.feldsparSubstitute());

        // Firing system
        sb.append(fluxSystemDescription(req.firingTempC(), feldspar)).append(". ");

        // Variant note
        sb.append(switch (variant) {
            case "High-Silica" -> "Extra Silica raises durability and reduces crawling — well suited for functional work.";
            case "Fluxed"      -> req.firingTempC() < 1120
                    ? "Elevated Frit content promotes a fluid, glossy melt and vibrant colour response."
                    : "Lithium Carbonate addition intensifies flux activity and brightens colorant development.";
            default            -> "Balanced flux-silica-alumina ratio for reliable results across a range of kilns.";
        });
        sb.append(" ");

        // Color
        if (isValidHex(req.color())) {
            String colorName = hueToColorName(req.color());
            var colorants = formula.entrySet().stream()
                    .filter(en -> isColorant(en.getKey()) && en.getValue() > 0.01)
                    .map(en -> en.getKey() + " (" + roundTwo(en.getValue()) + "%)")
                    .toList();
            if (!colorants.isEmpty()) {
                sb.append("Primary ").append(colorName)
                  .append(" hue driven by: ").append(String.join(", ", colorants)).append(". ");
            }
        }

        // Effects
        if (!req.effects().isEmpty()) {
            String effectNames = req.effects().stream()
                    .map(GlazeRecipeService::effectNote)
                    .collect(Collectors.joining("; "));
            sb.append(effectNames).append(".");
        }

        if (Boolean.TRUE.equals(req.foodSafe())) {
            sb.append(" Dinnerware safety mode enabled: reduced high-leach-risk colorants and shifted toward a more stable silica/alumina balance.");
        }

        return sb.toString().strip();
    }

    private static void applyFoodSafetyAdjustments(Map<String, Double> formula, Boolean foodSafe) {
        if (!Boolean.TRUE.equals(foodSafe)) {
            return;
        }

        // Increase network-formers and suspension for glaze durability.
        adjust(formula, "Silica", 3.2);
        adjust(formula, "EPK Kaolin", 1.9);
        adjust(formula, "Bentonite", 0.5);

        // Keep a little opacifier support for clean, stable surfaces.
        adjust(formula, "Zircopax", 0.4);

        // Reduce additives that can raise leachability risk in functional ware.
        scaleIfPresent(formula, "Copper Carbonate", 0.45);
        scaleIfPresent(formula, "Cobalt Carbonate", 0.35);
        scaleIfPresent(formula, "Manganese Dioxide", 0.25);
        scaleIfPresent(formula, "Manganese Granules", 0.15);
        scaleIfPresent(formula, "Iron Chromate", 0.0);

        // Tame very aggressive fluxing to reduce run/craze tendency.
        scaleIfPresent(formula, "Lithium Carbonate", 0.75);
    }

    private static String fluxSystemDescription(int tempC, String feldspar) {
        if (tempC < 1000) return "Low-fire frit base (Ferro Frit 3134) — alumina/silica supplied by kaolin";
        if (tempC < 1120) return "Transitional base combining soft frit with " + feldspar + " for mid-range firing";
        if (tempC < 1200) return "Mid-fire mineral base using " + feldspar + ", Dolomite, and Zinc Oxide as fluxes";
        return "High-fire " + feldspar + " base — silica and kaolin provide the glass network";
    }

    private static void applyFeldsparSubstitution(Map<String, Double> formula, String substitution) {
        String targetFeldspar = selectedFeldsparName(substitution);
        if (DEFAULT_FELDSPAR.equals(targetFeldspar) || !formula.containsKey(DEFAULT_FELDSPAR)) {
            return;
        }

        double amount = formula.remove(DEFAULT_FELDSPAR);
        formula.merge(targetFeldspar, amount, Double::sum);
    }

    private static String selectedFeldsparName(String substitution) {
        if (substitution == null || substitution.isBlank()) {
            return DEFAULT_FELDSPAR;
        }

        String normalized = substitution.toLowerCase(Locale.ROOT);
        if (normalized.contains("nepheline")) {
            return NEPHELINE_SYENITE;
        }
        if (normalized.contains("soda")) {
            return SODA_FELDSPAR;
        }
        return DEFAULT_FELDSPAR;
    }

    private static String effectNote(String effect) {
        String e = effect.toLowerCase(Locale.ROOT);
        if (e.contains("speck"))   return "Ilmenite and Manganese Granules create fired speckle";
        if (e.contains("crystal")) return "High Zinc Oxide and Titanium Dioxide nucleate macro-crystalline growth";
        if (e.contains("varieg"))  return "Rutile promotes colour movement and variegation in the melt";
        if (e.contains("flame"))   return "Titanium Dioxide and Iron Chromate drive phase-separation flashing";
        if (e.contains("melt"))    return "Lithium Carbonate and Wollastonite increase flux activity for a fluid run";
        if (e.contains("opaque"))  return "Zircopax and Tin Oxide create a dense opaque white";
        if (e.contains("transluc")) return "Elevated Silica promotes a translucent, glassy quality";
        return effect + " effect applied";
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static void adjust(Map<String, Double> f, String key, double delta) {
        f.compute(key, (k, v) -> Math.max(0.0, (v == null ? 0.0 : v) + delta));
    }

    /** Only modifies the value if the key already exists in the formula. */
    private static void adjustIfPresent(Map<String, Double> f, String key, double delta) {
        if (f.containsKey(key)) {
            f.put(key, Math.max(0.0, f.get(key) + delta));
        }
    }

    private static void scaleIfPresent(Map<String, Double> f, String key, double factor) {
        if (f.containsKey(key)) {
            f.put(key, Math.max(0.0, f.get(key) * factor));
        }
    }

    private static double clamp(double v) {
        return Math.max(0.0, v);
    }

    private static double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private static void normalize(Map<String, Double> formula) {
        double total = formula.values().stream().mapToDouble(Double::doubleValue).sum();
        if (total == 0.0) return;
        var keys = new ArrayList<>(formula.keySet());
        double running = 0.0;
        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get(i);
            if (i == keys.size() - 1) {
                formula.put(key, roundTwo(100.0 - running));
            } else {
                double n = roundTwo(formula.get(key) / total * 100.0);
                formula.put(key, n);
                running += n;
            }
        }
        formula.entrySet().removeIf(en -> en.getValue() <= 0.0);
    }

    private static boolean isValidHex(String s) {
        return s != null && s.matches("^#[0-9a-fA-F]{6}$");
    }

    private static double[] hexToHsl(String hex) {
        int r = Integer.parseInt(hex.substring(1, 3), 16);
        int g = Integer.parseInt(hex.substring(3, 5), 16);
        int b = Integer.parseInt(hex.substring(5, 7), 16);
        double rn = r / 255.0, gn = g / 255.0, bn = b / 255.0;
        double max = Math.max(rn, Math.max(gn, bn));
        double min = Math.min(rn, Math.min(gn, bn));
        double delta = max - min;
        double l = (max + min) / 2.0;
        double s = (delta == 0) ? 0.0 : delta / (1.0 - Math.abs(2.0 * l - 1.0));
        double h = 0;
        if (delta > 0) {
            if (max == rn) h = 60.0 * (((gn - bn) / delta + 6.0) % 6.0);
            else if (max == gn) h = 60.0 * (((bn - rn) / delta) + 2.0);
            else h = 60.0 * (((rn - gn) / delta) + 4.0);
        }
        return new double[]{h, s, l};
    }

    private static String hueToColorName(String hex) {
        double[] hsl = hexToHsl(hex);
        double h = hsl[0], s = hsl[1], l = hsl[2];
        if (l > 0.87 || s < 0.12) return "white/neutral";
        if (l < 0.12)              return "black/dark";
        if (h < 30 || h >= 330)   return "red/rust";
        if (h < 60)                return "orange/amber";
        if (h < 80)                return "yellow";
        if (h < 180)               return "green";
        if (h < 220)               return "cyan/teal";
        if (h < 260)               return "blue";
        return "purple/violet";
    }

    private static final java.util.Set<String> COLORANT_KEYS = java.util.Set.of(
            "Red Iron Oxide", "Yellow Iron Oxide", "Iron Oxide", "Cobalt Carbonate",
            "Copper Carbonate", "Manganese Dioxide", "Rutile", "Zircopax",
            "Ilmenite (granular)", "Manganese Granules", "Titanium Dioxide",
            "Iron Chromate", "Tin Oxide", "Lithium Carbonate", "Zinc Oxide",
            "Wollastonite"
    );

    private static boolean isColorant(String key) {
        return COLORANT_KEYS.contains(key);
    }

    private static String firingRangeFor(int tempC) {
        if (tempC < 700)  return "Very low fire (cone 022\u2013019)";
        if (tempC < 900)  return "Low fire (cone 018\u2013010)";
        if (tempC < 1100) return "Low\u2013mid fire (cone 09\u201302)";
        if (tempC < 1200) return "Mid fire (cone 01\u20135)";
        if (tempC < 1260) return "Mid\u2013high fire (cone 6\u20137)";
        return "High fire (cone 8\u201310)";
    }

    private static String firingRangeShort(int tempC) {
        if (tempC < 1000) return "Low Fire";
        if (tempC < 1120) return "Low-Mid";
        if (tempC < 1200) return "Mid Fire";
        if (tempC < 1260) return "Cone 6-7";
        return "High Fire";
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1).toLowerCase(Locale.ROOT);
    }

    private static double roundTwo(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
