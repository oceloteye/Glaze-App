package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

import com.glaze.backend.dto.GlazeRequest;

import static com.glaze.backend.service.recipe.RecipeIngredients.BENTONITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.BONE_ASH;
import static com.glaze.backend.service.recipe.RecipeIngredients.CHROME_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COBALT_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.COPPER_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.CUSTER_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.EPK_KAOLIN;
import static com.glaze.backend.service.recipe.RecipeIngredients.GERSTLEY_BORATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.MANGANESE_DIOXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.NEPHELINE_SYENITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.NICKEL_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.RED_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.RUTILE;
import static com.glaze.backend.service.recipe.RecipeIngredients.SILICA;
import static com.glaze.backend.service.recipe.RecipeIngredients.TALC;
import static com.glaze.backend.service.recipe.RecipeIngredients.TIN_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.WHITING;
import static com.glaze.backend.service.recipe.RecipeIngredients.YELLOW_IRON_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZINC_OXIDE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZIRCOPAX;

/**
 * Palette-driven colourant routes. Each hue family the picker offers maps to one colourant system, dosed by
 * the two sliders: saturation (muted → pure) and depth (light → deep). Unlike the hex cascade nothing is
 * inferred from the colour; the family picks the chemistry and the sliders only scale it.
 */
public final class HueFamilyRoutes {

    /** Above {@code ColourRoutes.LEADS}: a family route is the recipe the palette promised, so it always leads. */
    static final double FAMILY_FITNESS = 1.3;

    public static final Set<String> FAMILIES = Set.of(
            "rust-red", "bright-red", "orange", "amber", "yellow", "olive", "green", "turquoise", "blue",
            "violet", "magenta", "wine", "pink", "brown", "grey", "black", "white");

    /** Families whose clean, saturated version only exists as an inclusion stain; the route is the nearest oxide colour. */
    public static final Set<String> STAIN_ONLY = Set.of("bright-red", "orange", "yellow", "magenta");

    private static final String STAIN_NOTE =
            " This saturated colour only exists as an inclusion (encapsulated) stain; oxides give the nearest glaze colour, so expect a more muted result.";

    private HueFamilyRoutes() {
    }

    /** The family's route for the request, or empty when the request has no (known) family. */
    public static Optional<ColourRoute> primary(GlazeRequest request) {
        String family = request.hueFamily();
        if (family == null || !FAMILIES.contains(family)) {
            return Optional.empty();
        }
        double s = slider(request.saturation());
        double d = slider(request.depth());
        double c = RecipeModifier.characterChroma(request.colorCharacter());
        int tempC = request.firingTempC();
        boolean reduction = RecipeModifier.isReduction(request.atmosphere());
        boolean highFireReduction = reduction && tempC >= 1250;
        boolean zincFree = RecipeBaseFactory.standardBase(tempC).getOrDefault(ZINC_OXIDE, 0.0) < 3.0;

        ColourRoute route = switch (family) {
            case "rust-red" -> highFireReduction ? kaki(d) : reduction ? tenmoku(d) : ironRed(s, d);
            case "bright-red" -> highFireReduction ? copperRed(d, 0.5)
                    : stainFallback(reduction ? tenmoku(d) : ironRed(1.0, d));
            case "orange" -> stainFallback(route("Iron + rutile", List.of(RED_IRON_OXIDE, RUTILE),
                    "Iron and rutile together give a warm tan to burnt orange; the colour sits toward amber rather than a clean orange.",
                    f -> {
                        RecipeMath.adjust(f, RED_IRON_OXIDE, c * (2.0 + 3.5 * d));
                        RecipeMath.adjust(f, RUTILE, 4.0 * (0.7 + 0.3 * s));
                    }));
            case "amber" -> route("Iron", List.of(RED_IRON_OXIDE),
                    reduction
                            ? "Iron in reduction: a trace is celadon, a few percent goes amber-olive, and it heads for tenmoku as the dose climbs."
                            : "Iron alone: honey where thin, amber as the dose climbs, and the melt decides how much warmth comes through.",
                    f -> {
                        RecipeMath.adjust(f, RED_IRON_OXIDE, c * (1.2 + 6.0 * d * d) * (0.6 + 0.6 * s));
                        if (!reduction) {
                            RecipeMath.adjust(f, RUTILE, 3.0 * (0.7 + 0.6 * s) * RecipeMath.clamp01(0.3 + d));
                        }
                    });
            case "yellow" -> stainFallback(route("Rutile + yellow iron", List.of(RUTILE, YELLOW_IRON_OXIDE),
                    "Rutile with yellow iron gives mustard and ochre yellows; a clean lemon yellow is not an oxide colour.",
                    f -> {
                        RecipeMath.adjust(f, RUTILE, 5.5 * (0.7 + 0.6 * s));
                        RecipeMath.adjust(f, YELLOW_IRON_OXIDE, c * 2.0 * (0.5 + d));
                    }));
            case "olive" -> reduction
                    ? route("Iron celadon (olive)", List.of(RED_IRON_OXIDE),
                            "Iron in a reduction clear: olive-green as it builds past the blue-grey celadon trace.",
                            f -> RecipeMath.adjust(f, RED_IRON_OXIDE, c * (2.0 + 4.5 * d)))
                    : route("Copper + yellow iron", List.of(COPPER_CARBONATE, YELLOW_IRON_OXIDE),
                            "Copper greened toward olive by yellow iron and a little rutile: the yellow-green of leaves and moss.",
                            f -> {
                                RecipeMath.adjust(f, COPPER_CARBONATE, c * 2.8 * (0.3 + 0.7 * d) * (0.5 + 0.5 * s));
                                RecipeMath.adjust(f, YELLOW_IRON_OXIDE, 1.4 * (0.6 + 0.8 * s));
                                RecipeMath.adjust(f, RUTILE, 0.9 * (0.6 + d));
                                RecipeMath.adjust(f, RED_IRON_OXIDE, 0.8 * d);
                            });
            case "green" -> reduction && s < 0.5
                    ? route("Iron celadon", List.of(RED_IRON_OXIDE),
                            "A trace of iron in a reduction clear: the blue-green to green of celadon, deepening with the dose.",
                            f -> RecipeMath.adjust(f, RED_IRON_OXIDE, c * (0.6 + 2.2 * d)))
                    : s < 0.35 && zincFree
                    ? route("Chrome green", List.of(CHROME_OXIDE),
                            "Chrome oxide gives an opaque, stable leaf green at a trace dose; it must stay away from zinc (brown) and tin (pink).",
                            f -> RecipeMath.adjust(f, CHROME_OXIDE, 0.3 + 2.2 * d))
                    : route("Copper green", List.of(COPPER_CARBONATE),
                            "Copper in a lime/boron melt: a clear grass green that deepens with the dose and goes metallic past a few percent.",
                            f -> {
                                RecipeMath.adjust(f, COPPER_CARBONATE, c * 3.6 * (0.3 + 0.7 * d) * (0.5 + 0.5 * s));
                                RecipeMath.adjust(f, YELLOW_IRON_OXIDE, 0.5 * (0.5 + 0.8 * s));
                                RecipeMath.adjust(f, RED_IRON_OXIDE, 0.5 * d);
                            });
            case "turquoise" -> route("Copper in alkaline melt", List.of(COPPER_CARBONATE),
                    "Copper swings from green to turquoise as the alkali rises, so the base moves to a soda melt; a trace of cobalt deepens it toward teal.",
                    f -> {
                        RecipeModifier.moveToAlkalineFlux(f);
                        RecipeMath.adjust(f, COPPER_CARBONATE, c * 2.6 * (0.6 + 0.4 * s) * (1.0 + 0.6 * d));
                        RecipeMath.adjust(f, COBALT_CARBONATE, 0.3 * d);
                        RecipeMath.adjust(f, CHROME_OXIDE, 0.25 * d);
                        RecipeMath.adjust(f, ZIRCOPAX, 1.8 * (1.0 - d));
                    });
            case "blue" -> route(s < 0.3 ? "Cobalt + rutile" : "Cobalt", List.of(COBALT_CARBONATE),
                    s < 0.3
                            ? "A little cobalt broken up by rutile: titania pulls the blue into a milky, variegated slate."
                            : "Cobalt is the strongest and most reliable blue colourant; a fraction of a percent is enough and it survives any cone or atmosphere.",
                    f -> {
                        RecipeMath.adjust(f, COBALT_CARBONATE, c * (0.12 + 1.3 * d * d) * (0.3 + 0.7 * s));
                        RecipeMath.adjust(f, COPPER_CARBONATE, 0.25 * (0.4 + 0.6 * s) * (1.0 - d));
                        RecipeMath.adjust(f, RUTILE, 2.5 * RecipeMath.clamp01((0.3 - s) / 0.3));
                        RecipeMath.adjust(f, MANGANESE_DIOXIDE, 0.9 * RecipeMath.clamp01((d - 0.6) / 0.4));
                        RecipeMath.adjust(f, ZIRCOPAX, 2.6 * RecipeMath.clamp01((0.3 - d) / 0.3));
                    });
            case "violet" -> route("Manganese + cobalt", List.of(MANGANESE_DIOXIDE, COBALT_CARBONATE),
                    "Manganese gives the plum; a trace of cobalt pulls it toward violet. Copper has no place here, and the pair should stay off food surfaces.",
                    f -> {
                        double pd = 0.4 + 0.6 * d;
                        RecipeMath.adjust(f, MANGANESE_DIOXIDE, c * pd * 2.5 * (0.6 + 0.4 * s));
                        RecipeMath.adjust(f, COBALT_CARBONATE, c * pd * 0.35 * (0.5 + 0.5 * s));
                        RecipeMath.adjustIfPresent(f, ZIRCOPAX, -4.0 * pd * RecipeMath.clamp01((s - 0.5) / 0.5));
                    });
            case "magenta" -> stainFallback(route("Manganese + cobalt", List.of(MANGANESE_DIOXIDE, COBALT_CARBONATE),
                    "Manganese with only a trace of cobalt: the reddest purple oxides reach, a plum-magenta rather than a clean magenta.",
                    f -> {
                        double pd = 0.4 + 0.6 * d;
                        RecipeMath.adjust(f, MANGANESE_DIOXIDE, c * pd * 3.9 * (0.7 + 0.3 * s));
                        RecipeMath.adjust(f, COBALT_CARBONATE, c * pd * 0.14);
                        RecipeMath.adjustIfPresent(f, ZIRCOPAX, -4.0 * pd);
                    }));
            case "wine" -> highFireReduction ? copperRed(d, 0.5) : chromeTinWine(tempC, s, d);
            case "pink" -> highFireReduction ? copperRed(d, 0.3) : route("Chrome-tin pink", List.of(TIN_OXIDE, CHROME_OXIDE),
                    "A trace of chrome against 5% tin: the calcium-tin pink pigment forms in the melt, so magnesia and zinc are traded for whiting.",
                    f -> {
                        RecipeModifier.moveToLimeFlux(f);
                        RecipeMath.adjust(f, TIN_OXIDE, 5.0);
                        RecipeMath.adjust(f, CHROME_OXIDE, 0.16 + 0.14 * d + 0.06 * s);
                    });
            case "brown" -> route("Iron + manganese", List.of(RED_IRON_OXIDE, MANGANESE_DIOXIDE),
                    "Iron carries the brown and a little manganese deepens it without the warmth going orange.",
                    f -> {
                        RecipeMath.adjust(f, RED_IRON_OXIDE, c * (2.0 + 5.0 * d) * (0.7 + 0.3 * s));
                        RecipeMath.adjust(f, MANGANESE_DIOXIDE, 0.15 + 0.7 * d);
                        RecipeMath.adjust(f, RUTILE, 1.5 * (1.0 - s) * (1.0 - d));
                    });
            case "grey" -> route("Nickel + iron", List.of(NICKEL_OXIDE, RED_IRON_OXIDE),
                    "Nickel is grey-green in a magnesia melt; a little iron and manganese darken it to a neutral grey.",
                    f -> {
                        RecipeMath.adjust(f, NICKEL_OXIDE, 0.4 + 0.8 * d);
                        RecipeMath.adjust(f, RED_IRON_OXIDE, 0.4 + 2.2 * d);
                        RecipeMath.adjust(f, MANGANESE_DIOXIDE, 0.8 * d);
                        RecipeMath.adjust(f, COBALT_CARBONATE, 0.12 * s);
                    });
            case "black" -> s >= 0.5
                    ? route("Iron-saturate black", List.of(RED_IRON_OXIDE),
                            "Iron alone at saturation: a tenmoku-type black that breaks to rust-brown on edges and where thin.",
                            f -> RecipeMath.adjust(f, RED_IRON_OXIDE, 10.0 + 2.0 * d))
                    : route("Iron + cobalt + manganese black", List.of(RED_IRON_OXIDE, COBALT_CARBONATE, MANGANESE_DIOXIDE),
                            "Iron carries the load while cobalt and manganese kill the brown: a dense, neutral black that does not break on edges.",
                            f -> {
                                RecipeMath.adjust(f, RED_IRON_OXIDE, 7.0 + 2.0 * d);
                                RecipeMath.adjust(f, COBALT_CARBONATE, 1.2 + 0.6 * d);
                                RecipeMath.adjust(f, MANGANESE_DIOXIDE, 2.5);
                            });
            case "white" -> route("Zircon white", List.of(ZIRCOPAX),
                    "Zircon opacifies the clear to white; a touch of rutile and iron warms it toward cream.",
                    f -> {
                        RecipeMath.adjust(f, ZIRCOPAX, 9.0);
                        RecipeMath.adjust(f, RUTILE, 0.6 * d + 0.4 * s);
                        RecipeMath.adjust(f, RED_IRON_OXIDE, 0.25 * d);
                    });
            default -> throw new IllegalStateException(family);
        };
        return Optional.of(withSecondaryColour(route, request));
    }

    private static double slider(Integer value) {
        return RecipeMath.clamp01((value == null ? 50 : value) / 100.0);
    }

    private static ColourRoute route(String name, List<String> signature, String summary, Consumer<Map<String, Double>> colourants) {
        return new ColourRoute(name, summary, signature, null, colourants, FAMILY_FITNESS);
    }

    private static ColourRoute stainFallback(ColourRoute route) {
        return new ColourRoute(route.name(), route.summary() + STAIN_NOTE, route.signature(), route.baseOverride(),
                route.colourants(), route.fitness());
    }

    /** Iron-saturated boron/talc melt that recrystallises to rust on cooling. */
    private static ColourRoute ironRed(double s, double d) {
        var base = new LinkedHashMap<String, Double>();
        base.put(GERSTLEY_BORATE, 32.0);
        base.put(SILICA, 30.0);
        base.put(POTASH_FELDSPAR, 20.0);
        base.put(TALC, 14.0);
        base.put(EPK_KAOLIN, 5.0);
        base.put(BENTONITE, 2.0);
        return new ColourRoute("Iron-saturate red",
                "A whole-recipe family: saturated iron in a fluid boron/talc melt recrystallises to rust red on a slow cool.",
                List.of(RED_IRON_OXIDE), base,
                f -> RecipeMath.adjust(f, RED_IRON_OXIDE, 11.0 + 2.5 * s + 2.0 * d), FAMILY_FITNESS);
    }

    /** Saturated iron re-oxidising over bone ash / talc seeds at high-fire reduction. */
    private static ColourRoute kaki(double d) {
        var base = new LinkedHashMap<String, Double>();
        base.put(CUSTER_FELDSPAR, 48.0);
        base.put(SILICA, 24.0);
        base.put(WHITING, 12.0);
        base.put(BONE_ASH, 7.0);
        base.put(TALC, 4.5);
        return new ColourRoute("Iron-saturate kaki",
                "A whole-recipe family: saturated iron over bone ash and talc re-oxidises to rust on cooling from high-fire reduction.",
                List.of(RED_IRON_OXIDE), base,
                f -> RecipeMath.adjust(f, RED_IRON_OXIDE, 10.0 + 3.0 * d), FAMILY_FITNESS);
    }

    private static ColourRoute tenmoku(double d) {
        return route("Iron-saturate (tenmoku)", List.of(RED_IRON_OXIDE),
                "Iron at saturation in reduction: a brown-black that breaks to rust where thin.",
                f -> RecipeMath.adjust(f, RED_IRON_OXIDE, 8.0 + 3.0 * d));
    }

    /** A trace of copper and tin in a lime glossy, reduced. */
    private static ColourRoute copperRed(double d, double copperCeiling) {
        var base = new LinkedHashMap<String, Double>();
        base.put(POTASH_FELDSPAR, 40.0);
        base.put(SILICA, 30.0);
        base.put(WHITING, 20.0);
        base.put(EPK_KAOLIN, 10.0);
        return new ColourRoute("Copper red",
                "A whole-recipe family: a trace of copper with tin in a lime glossy goes oxblood to flambé in reduction.",
                List.of(COPPER_CARBONATE, TIN_OXIDE), base,
                f -> {
                    RecipeMath.adjust(f, COPPER_CARBONATE, copperCeiling * (0.6 + 0.4 * d));
                    RecipeMath.adjust(f, TIN_OXIDE, 1.0);
                }, FAMILY_FITNESS);
    }

    /** Chrome-tin in a lime-rich, low-alumina boron melt at cone 5–7; a lime-swapped standard base elsewhere. */
    private static ColourRoute chromeTinWine(int tempC, double s, double d) {
        double chrome = 0.22 + 0.25 * d + 0.08 * s;
        Map<String, Double> base = null;
        if (tempC >= 1180 && tempC <= 1250) {
            base = new LinkedHashMap<>();
            base.put(SILICA, 32.0);
            base.put(GERSTLEY_BORATE, 21.0);
            base.put(WHITING, 20.0);
            base.put(NEPHELINE_SYENITE, 16.0);
            base.put(EPK_KAOLIN, 11.0);
            base.put(BENTONITE, 2.0);
        }
        return new ColourRoute("Chrome-tin wine",
                "Chrome-tin in a lime-rich, low-alumina boron melt goes wine to burgundy where thick and breaks to lavender where thin. Magnesia and zinc would turn it grey, so none is allowed in.",
                List.of(TIN_OXIDE, CHROME_OXIDE), base,
                f -> {
                    RecipeModifier.moveToLimeFlux(f);
                    RecipeMath.adjust(f, TIN_OXIDE, 5.0);
                    RecipeMath.adjust(f, CHROME_OXIDE, chrome);
                }, FAMILY_FITNESS);
    }

    private static ColourRoute withSecondaryColour(ColourRoute route, GlazeRequest request) {
        String secondary = request.secondaryColor();
        if (secondary == null || !secondary.matches("^#[0-9a-fA-F]{6}$")) {
            return route;
        }
        Consumer<Map<String, Double>> colourants = route.colourants().andThen(formula ->
                RecipeModifier.applyColorants(formula, null, secondary, request.colorCharacter(),
                        request.firingTempC(), request.atmosphere()));
        return new ColourRoute(route.name(), route.summary(), route.signature(), route.baseOverride(),
                colourants, route.fitness());
    }
}
