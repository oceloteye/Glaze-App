package com.glaze.backend.service.recipe;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

import com.glaze.backend.dto.GlazeRequest;

import static com.glaze.backend.service.recipe.RecipeIngredients.BARIUM_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.BONE_ASH;
import static com.glaze.backend.service.recipe.RecipeIngredients.CHROME_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COBALT_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COBALT_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COPPER_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COPPER_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.DOLOMITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.EPK_KAOLIN;
import static com.glaze.backend.service.recipe.RecipeIngredients.GERSTLEY_BORATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ILMENITE_GRANULAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.IRON_CHROMATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.MANGANESE_DIOXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.NICKEL_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.RED_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.RUTILE;
import static com.glaze.backend.service.recipe.RecipeIngredients.SILICA;
import static com.glaze.backend.service.recipe.RecipeIngredients.TIN_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.TITANIUM_DIOXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.YELLOW_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZINC_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZIRCOPAX;

/**
 * Proposes the colourant routes that can reach an asked colour at the requested cone and atmosphere.
 * The first route is always the generator's primary cascade; alternatives are distinct chemistries
 * (chrome instead of copper for a green, nickel-in-zinc instead of cobalt for a soft blue, ...).
 */
public final class ColourRoutes {

    /** Materials that only opacify or soften; never the headline of a route. */
    private static final Set<String> OPACIFIERS = Set.of(ZIRCOPAX, TIN_OXIDE, TITANIUM_DIOXIDE);

    /** Rough colouring power per percent, used to decide which colourant leads a route's name. */
    private static final Map<String, Double> COLOURING_POWER = Map.ofEntries(
            Map.entry(COBALT_CARBONATE, 10.0), Map.entry(COBALT_OXIDE, 14.0),
            Map.entry(CHROME_OXIDE, 5.0), Map.entry(NICKEL_OXIDE, 4.0),
            Map.entry(COPPER_CARBONATE, 2.0), Map.entry(COPPER_OXIDE, 2.8),
            Map.entry(MANGANESE_DIOXIDE, 1.5), Map.entry(IRON_CHROMATE, 1.5),
            Map.entry(RED_IRON_OXIDE, 1.0), Map.entry(IRON_OXIDE, 1.0), Map.entry(YELLOW_IRON_OXIDE, 0.8),
            Map.entry(RUTILE, 0.7), Map.entry(ILMENITE_GRANULAR, 0.5), Map.entry(BONE_ASH, 0.4),
            Map.entry(ZIRCOPAX, 0.1), Map.entry(TIN_OXIDE, 0.15), Map.entry(TITANIUM_DIOXIDE, 0.1));

    private static final Map<String, String> SHORT_LABEL = Map.ofEntries(
            Map.entry(COBALT_CARBONATE, "Cobalt"), Map.entry(COBALT_OXIDE, "Cobalt"),
            Map.entry(CHROME_OXIDE, "Chrome"), Map.entry(NICKEL_OXIDE, "Nickel"),
            Map.entry(COPPER_CARBONATE, "Copper"), Map.entry(COPPER_OXIDE, "Copper"),
            Map.entry(MANGANESE_DIOXIDE, "Manganese"), Map.entry(IRON_CHROMATE, "Iron chromate"),
            Map.entry(RED_IRON_OXIDE, "Iron"), Map.entry(IRON_OXIDE, "Iron"), Map.entry(YELLOW_IRON_OXIDE, "Yellow iron"),
            Map.entry(RUTILE, "Rutile"), Map.entry(ILMENITE_GRANULAR, "Ilmenite"), Map.entry(BONE_ASH, "Bone ash"),
            Map.entry(ZIRCOPAX, "Zircon"), Map.entry(TIN_OXIDE, "Tin"), Map.entry(TITANIUM_DIOXIDE, "Titania"));

    private static final Map<String, String> LEAD_SUMMARY = Map.ofEntries(
            Map.entry("Cobalt", "Cobalt is the strongest and most reliable blue colourant; a fraction of a percent is enough and it survives any cone or atmosphere."),
            Map.entry("Copper", "Copper gives green in a lime/boron melt and swings toward turquoise as the alkali rises; it volatilises above cone 8 and is not dinnerware-safe in quantity."),
            Map.entry("Iron", "Iron is the workhorse colourant: honey through brown with dose, celadon to tenmoku in reduction, and the melt decides how much warmth comes through."),
            Map.entry("Yellow iron", "Yellow iron is a weaker, yellower iron source for ochres and honeys without the heaviness of red iron."),
            Map.entry("Manganese", "Manganese gives plum-browns and violets; a trace of cobalt pushes it toward blue, and it should be kept off food surfaces."),
            Map.entry("Chrome", "Chrome is a strong, stable green in a zinc-free base; a trace is enough and it stays put in the melt."),
            Map.entry("Nickel", "Nickel is fickle: blue in zinc glazes, grey-green in magnesia, brown in between; keep the dose low."),
            Map.entry("Rutile", "Rutile gives warm tans and variegation, and breaks cobalt into milky floating blues."),
            Map.entry("Bone ash", "Phosphorus from bone ash scatters light in a reduction clear for the milky chun blue."),
            Map.entry("Zircon", "Opacifiers carry this colour; no transition-metal colourant is needed."),
            Map.entry("Tin", "Tin opacifies at roughly half the dose zircon needs and keeps the white clean."),
            Map.entry("Titania", "Titania opacifies and seeds crystals; it warms the surface slightly."));

    private ColourRoutes() {
    }

    /** Routes for the request, primary first, then alternatives by descending fitness. Never empty. */
    public static List<ColourRoute> propose(GlazeRequest request) {
        int tempC = request.firingTempC();
        ColourRoute primary = primary(request);
        var routes = new ArrayList<ColourRoute>();
        routes.add(primary);

        if (!isValidHex(request.color())) {
            return routes;
        }
        double[] hsl = RecipeColorUtil.hexToHsl(request.color());
        double h = hsl[0], s = hsl[1], l = hsl[2];
        boolean reduction = "reduction".equalsIgnoreCase(request.atmosphere());
        boolean zincFreeBase = RecipeBaseFactory.standardBase(tempC).getOrDefault(ZINC_OXIDE, 0.0) < 3.0;

        var alternatives = new ArrayList<ColourRoute>();

        // ── greens ─────────────────────────────────────────────────────────────
        // chrome is a muted, slightly yellow leaf green: it cannot reach saturated grass greens or blue-greens
        if (h >= 80 && h < 150 && s < 0.2 && l >= 0.25 && l < 0.78 && zincFreeBase) {
            double chrome = 0.3 + 2.2 * RecipeMath.clamp01((0.72 - l) / 0.35);
            alternatives.add(new ColourRoute("Chrome green",
                    "Chrome oxide gives an opaque, stable leaf green at a trace dose; it must stay away from zinc (brown) and tin (pink).",
                    List.of(CHROME_OXIDE), null,
                    formula -> RecipeMath.adjust(formula, CHROME_OXIDE, chrome), 0.8));
        }
        if (!reduction && tempC >= 1240 && h >= 60 && h < 160 && s < 0.3 && l >= 0.35 && l < 0.7) {
            double nickel = 0.8 + 1.0 * RecipeMath.clamp01((0.6 - l) / 0.25);
            alternatives.add(new ColourRoute("Nickel in magnesia",
                    "Nickel in a dolomite-rich high-fire melt reads grey-green / khaki; the magnesia is what keeps it from going brown.",
                    List.of(NICKEL_OXIDE, DOLOMITE), null,
                    formula -> {
                        RecipeMath.adjust(formula, DOLOMITE, 8.0);
                        RecipeMath.adjustIfPresent(formula, "Whiting", -4.0);
                        RecipeMath.adjust(formula, NICKEL_OXIDE, nickel);
                    }, 0.5));
        }

        // ── soft blues ─────────────────────────────────────────────────────────
        // nickel blue tops out at a mid lightness; anything darker or more saturated needs cobalt
        if (!reduction && tempC >= 1150 && h >= 200 && h < 265 && s < 0.4 && l >= 0.5 && l < 0.78) {
            double nickel = 0.6 + 0.8 * RecipeMath.clamp01((0.7 - l) / 0.25);
            alternatives.add(new ColourRoute("Nickel–zinc blue",
                    "Nickel in a high-zinc base gives a soft blue to blue-violet without cobalt; the zinc is doing half the work, so the base changes with it.",
                    List.of(NICKEL_OXIDE, ZINC_OXIDE), null,
                    formula -> {
                        topUp(formula, ZINC_OXIDE, 10.0);
                        RecipeMath.adjust(formula, NICKEL_OXIDE, nickel);
                    }, 0.6));
        }
        // rutile pulls cobalt into a low-saturation slate: only offer it for muted or darker blues
        if (!reduction && h >= 200 && h < 250 && (s < 0.2 || l < 0.5) && s < 0.4 && l >= 0.4 && l < 0.7) {
            double cobalt = 0.3 + 0.4 * RecipeMath.clamp01((0.65 - l) / 0.25);
            alternatives.add(new ColourRoute("Cobalt + rutile",
                    "A little cobalt broken up by rutile: titania pulls the blue into a milky, variegated slate that floats and streaks where thick.",
                    List.of(COBALT_CARBONATE, RUTILE), null,
                    formula -> {
                        RecipeMath.adjust(formula, COBALT_CARBONATE, cobalt);
                        RecipeMath.adjust(formula, RUTILE, 4.0);
                    }, 0.7));
        }

        // ── turquoise ──────────────────────────────────────────────────────────
        if (!reduction && tempC >= 1240 && h >= 160 && h < 215 && s >= 0.2 && l >= 0.3 && l < 0.7) {
            double copper = 1.5 + 2.0 * RecipeMath.clamp01((0.65 - l) / 0.3);
            var bariumBase = new LinkedHashMap<String, Double>();
            bariumBase.put(POTASH_FELDSPAR, 40.0);
            bariumBase.put(BARIUM_CARBONATE, 30.0);
            bariumBase.put(SILICA, 20.0);
            bariumBase.put(EPK_KAOLIN, 10.0);
            alternatives.add(new ColourRoute("Copper in barium",
                    "The classic high-fire barium matte: barium turns copper a true turquoise-blue and gives a silky matte surface. Not for food surfaces.",
                    List.of(BARIUM_CARBONATE, COPPER_CARBONATE), bariumBase,
                    formula -> RecipeMath.adjust(formula, COPPER_CARBONATE, copper), 0.7));
        }

        // ── browns / tans ──────────────────────────────────────────────────────
        // zinc chromate is a soft, low-saturation tan-brown; rich honeys and ambers stay with iron
        if (!reduction && tempC >= 1150 && h >= 15 && h < 50 && s >= 0.15 && s < 0.33 && l >= 0.28 && l < 0.65) {
            double chrome = 0.9 + 1.5 * RecipeMath.clamp01((0.6 - l) / 0.3);
            alternatives.add(new ColourRoute("Zinc–chrome brown",
                    "Chrome in a high-zinc base forms zinc chromate and goes tan to brown instead of green — a clean, even brown with no iron.",
                    List.of(ZINC_OXIDE, CHROME_OXIDE), null,
                    formula -> {
                        topUp(formula, ZINC_OXIDE, 10.0);
                        RecipeMath.adjust(formula, CHROME_OXIDE, chrome);
                    }, 0.6));
        }

        // ── greys ──────────────────────────────────────────────────────────────
        if (s < 0.10 && l >= 0.3 && l < 0.75) {
            double depth = RecipeMath.clamp01((0.65 - l) / 0.3);
            double iron = 1.0 + 2.0 * depth;
            double cobalt = 0.15 + 0.25 * depth;
            alternatives.add(new ColourRoute("Iron + cobalt grey",
                    "A little iron and a trace of cobalt cancel each other to a neutral grey; the balance decides whether it leans warm or blue.",
                    List.of(RED_IRON_OXIDE, COBALT_CARBONATE), null,
                    formula -> {
                        RecipeMath.adjust(formula, RED_IRON_OXIDE, iron);
                        RecipeMath.adjust(formula, COBALT_CARBONATE, cobalt);
                    }, 0.7));
        }

        // ── blacks ─────────────────────────────────────────────────────────────
        if (l < 0.2) {
            alternatives.add(new ColourRoute("Iron-saturate black",
                    "Iron alone at saturation: a tenmoku-type black that breaks to rust-brown on edges and where thin.",
                    List.of(RED_IRON_OXIDE), null,
                    formula -> RecipeMath.adjust(formula, RED_IRON_OXIDE, 11.0), 0.7));
            if (s < 0.15) {
                alternatives.add(new ColourRoute("Iron + cobalt + manganese black",
                        "Iron carries the load while cobalt and manganese kill the brown: a dense, neutral black that does not break on edges.",
                        List.of(RED_IRON_OXIDE, COBALT_CARBONATE, MANGANESE_DIOXIDE), null,
                        formula -> {
                            RecipeMath.adjust(formula, RED_IRON_OXIDE, 7.0);
                            RecipeMath.adjust(formula, COBALT_CARBONATE, 1.2);
                            RecipeMath.adjust(formula, MANGANESE_DIOXIDE, 2.5);
                        }, 0.7));
            }
        }

        Set<String> primarySignature = Set.copyOf(primary.signature());
        alternatives.stream()
                .filter(route -> !Set.copyOf(route.signature()).equals(primarySignature))
                .sorted(Comparator.comparingDouble(ColourRoute::fitness).reversed())
                .forEach(routes::add);
        return routes;
    }

    /** The generator's existing colourant cascade, described by what it actually adds to the standard base. */
    private static ColourRoute primary(GlazeRequest request) {
        Consumer<Map<String, Double>> cascade = formula -> RecipeModifier.applyColorants(
                formula, request.color(), request.secondaryColor(), request.colorCharacter(),
                request.firingTempC(), request.atmosphere());

        var probe = RecipeBaseFactory.standardBase(request.firingTempC());
        RecipeModifier.applyOpacityAdjustments(probe, request.opacity());
        var before = new LinkedHashMap<>(probe);
        cascade.accept(probe);

        String archetype = RecipeModifier.archetypeName(request.color(), request.firingTempC(), request.atmosphere());
        List<String> added = addedColourants(before, probe);
        List<String> signature = added.stream().filter(key -> !OPACIFIERS.contains(key)).toList();
        if (signature.isEmpty()) {
            signature = added;
        }

        if (archetype != null) {
            return new ColourRoute(archetype,
                    "A whole-recipe family rather than a colourant on a generic base: the melt itself is tuned so this colour can form.",
                    signature, null, cascade, 1.0);
        }

        List<String> leads = added.stream()
                .sorted(Comparator.comparingDouble((String key) ->
                        probe.getOrDefault(key, 0.0) * COLOURING_POWER.getOrDefault(key, 0.5)).reversed())
                .map(key -> SHORT_LABEL.getOrDefault(key, key))
                .distinct()
                .limit(2)
                .toList();
        if (leads.isEmpty()) {
            return new ColourRoute("Clear base", "No colourant: the base glaze reads as the clay body beneath it.",
                    List.of(), null, cascade, 1.0);
        }
        String name = String.join(" + ", leads);
        String summary = LEAD_SUMMARY.getOrDefault(leads.get(0), "Standard colourant route for this hue.");
        return new ColourRoute(name, summary, signature, null, cascade, 1.0);
    }

    private static List<String> addedColourants(Map<String, Double> before, Map<String, Double> after) {
        return after.entrySet().stream()
                .filter(entry -> COLOURING_POWER.containsKey(entry.getKey()))
                .filter(entry -> entry.getValue() - before.getOrDefault(entry.getKey(), 0.0) > 0.1)
                .map(Map.Entry::getKey)
                .toList();
    }

    private static void topUp(Map<String, Double> formula, String key, double target) {
        double room = target - formula.getOrDefault(key, 0.0);
        if (room > 0) {
            RecipeMath.adjust(formula, key, room);
        }
    }

    private static boolean isValidHex(String value) {
        return value != null && value.matches("^#[0-9a-fA-F]{6}$");
    }
}
