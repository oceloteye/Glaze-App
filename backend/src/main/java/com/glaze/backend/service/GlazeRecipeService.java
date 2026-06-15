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
        applyColorants(formula, req.color(), req.secondaryColor());
        applyEffectAgents(formula, req.effects(), intensity, req.secondaryColor());
        applyFeldsparSubstitution(formula, req.feldsparSubstitute());
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

    private static void applyColorants(Map<String, Double> formula, String primary, String secondary) {
        if (isValidHex(primary))   addColorantFromHex(formula, primary,   1.0);
        if (isValidHex(secondary)) addColorantFromHex(formula, secondary, 0.35);
    }

    private static void addColorantFromHex(Map<String, Double> formula, String hex, double weight) {
        double[] hsl = hexToHsl(hex);
        double h = hsl[0], s = hsl[1], l = hsl[2];

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
            adjust(formula, "Red Iron Oxide",  7.0 * weight);
        } else if (h < 60) {
            // Orange
            adjust(formula, "Red Iron Oxide",  4.0 * weight);
            adjust(formula, "Rutile",          3.0 * weight);
        } else if (h < 80) {
            // Yellow / amber
            adjust(formula, "Rutile",          5.5 * weight);
            adjust(formula, "Yellow Iron Oxide", 2.0 * weight);
        } else if (h < 180) {
            // Green
            adjust(formula, "Copper Carbonate", 3.5 * weight);
            if (h < 130) {
                adjust(formula, "Yellow Iron Oxide", 1.0 * weight); // yellow-green warmth
            }
        } else if (h < 220) {
            // Cyan / teal
            adjust(formula, "Copper Carbonate",  2.5 * weight);
            adjust(formula, "Cobalt Carbonate",  0.4 * weight);
        } else if (h < 260) {
            // Blue
            adjust(formula, "Cobalt Carbonate",  1.2 * weight);
        } else {
            // Purple / violet
            adjust(formula, "Manganese Dioxide", 3.5 * weight);
            adjust(formula, "Cobalt Carbonate",  0.6 * weight);
        }
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

        return sb.toString().strip();
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

    private static double clamp(double v) {
        return Math.max(0.0, v);
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
