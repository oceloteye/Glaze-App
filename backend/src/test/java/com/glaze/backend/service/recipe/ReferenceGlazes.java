package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.glaze.backend.service.recipe.RecipeIngredients.*;

/**
 * Classic, widely published and well-tested glaze recipes used as ground truth.
 *
 * <p>Each entry carries the firing temperature it is known to work at, the surface it is known to give,
 * and approximate unity-formula values for it. The ranges are deliberately generous (material analyses
 * vary by supplier and decade) and were cross-checked by hand against the {@link MaterialCatalog} analyses,
 * so they validate the calculator's arithmetic as well as its general agreement with the literature.
 */
final class ReferenceGlazes {

    record ReferenceGlaze(
            String name,
            String provenance,
            int tempC,
            Map<String, Double> recipe,
            Set<String> acceptableSurfaces,
            Map<String, double[]> expectedUmf) {
    }

    /** Leach's 4-3-2-1: the archetypal cone 10 reduction stoneware clear/celadon base. */
    static final ReferenceGlaze LEACH_4321 = new ReferenceGlaze(
            "Leach 4-3-2-1",
            "Bernard Leach, A Potter's Book (1940); reproduced in virtually every glaze text",
            1285,
            recipe(POTASH_FELDSPAR, 40, SILICA, 30, WHITING, 20, EPK_KAOLIN, 10),
            Set.of("Glossy", "Satin"),
            umf("SiO2", 3.4, 4.2, "Al2O3", 0.35, 0.50, "CaO", 0.62, 0.78, "KNaO", 0.22, 0.38));

    /** Tenmoku: the Leach base saturated with iron. Chemistry of the base is unchanged. */
    static final ReferenceGlaze TENMOKU = new ReferenceGlaze(
            "Tenmoku (4-3-2-1 + 10% red iron oxide)",
            "Traditional; e.g. Hamer & Hamer, The Potter's Dictionary",
            1285,
            recipe(POTASH_FELDSPAR, 40, SILICA, 30, WHITING, 20, EPK_KAOLIN, 10, RED_IRON_OXIDE, 10),
            Set.of("Glossy", "Satin"),
            umf("SiO2", 3.4, 4.2, "Al2O3", 0.35, 0.50, "CaO", 0.62, 0.78, "Fe2O3", 0.15, 0.35));

    /** Tony Hansen's 5x20 (G1214M): the standard cone 6 glossy transparent demonstration base (Si:Al ≈ 9.5). */
    static final ReferenceGlaze FIVE_BY_TWENTY = new ReferenceGlaze(
            "5x20 / G1214M cone 6 clear",
            "Tony Hansen, Digitalfire (1980s onward)",
            1222,
            recipe(WOLLASTONITE, 20, FERRO_FRIT_3134, 20, CUSTER_FELDSPAR, 20, EPK_KAOLIN, 20, SILICA, 20),
            Set.of("Glossy"),
            umf("SiO2", 3.0, 3.6, "Al2O3", 0.30, 0.40, "B2O3", 0.18, 0.26, "CaO", 0.70, 0.84, "KNaO", 0.16, 0.30));

    /** Floating Blue: the ubiquitous cone 6 oxidation rutile/cobalt/iron variegated glaze. */
    static final ReferenceGlaze FLOATING_BLUE = new ReferenceGlaze(
            "Floating Blue (cone 6)",
            "John Chappell / Ceramics Monthly; widely reproduced",
            1222,
            recipe(NEPHELINE_SYENITE, 47.6, GERSTLEY_BORATE, 27.0, SILICA, 20.4, EPK_KAOLIN, 5.4,
                    RED_IRON_OXIDE, 2.0, COBALT_CARBONATE, 1.0, RUTILE, 4.0),
            Set.of("Glossy", "Satin"),
            umf("SiO2", 3.3, 4.2, "Al2O3", 0.45, 0.62, "B2O3", 0.36, 0.52, "KNaO", 0.40, 0.58, "CaO", 0.34, 0.50, "MgO", 0.06, 0.14));

    /** Frit 3124 + kaolin: the textbook cone 06 clear / majolica base. */
    static final ReferenceGlaze LOW_FIRE_FRIT_CLEAR = new ReferenceGlaze(
            "Frit 3124 90 / EPK 10 cone 06 clear",
            "Standard low-fire majolica base (e.g. Linda Arbuckle's teaching recipes)",
            1000,
            recipe(FERRO_FRIT_3124, 90, EPK_KAOLIN, 10),
            Set.of("Glossy"),
            umf("SiO2", 2.0, 3.2, "Al2O3", 0.20, 0.45, "B2O3", 0.35, 0.65, "CaO", 0.45, 0.75, "KNaO", 0.25, 0.50));

    /** Classic cone 10 dolomite matte pattern (feldspar / dolomite / kaolin / silica). */
    static final ReferenceGlaze DOLOMITE_MATTE = new ReferenceGlaze(
            "Cone 10 dolomite matte",
            "Traditional magnesia matte (e.g. Hamer & Hamer; Cooper, The Potter's Book of Glaze Recipes)",
            1285,
            recipe(POTASH_FELDSPAR, 45, DOLOMITE, 22, EPK_KAOLIN, 23, SILICA, 10),
            Set.of("Matte", "Dry matte", "Satin"),
            umf("SiO2", 2.4, 3.6, "Al2O3", 0.40, 0.70, "MgO", 0.30, 0.55, "CaO", 0.30, 0.55));

    static final List<ReferenceGlaze> ALL = List.of(
            LEACH_4321, TENMOKU, FIVE_BY_TWENTY, FLOATING_BLUE, LOW_FIRE_FRIT_CLEAR, DOLOMITE_MATTE);

    private ReferenceGlazes() {
    }

    private static Map<String, Double> recipe(Object... kv) {
        var out = new LinkedHashMap<String, Double>();
        for (int i = 0; i < kv.length; i += 2) out.put((String) kv[i], ((Number) kv[i + 1]).doubleValue());
        return out;
    }

    private static Map<String, double[]> umf(Object... kv) {
        var out = new LinkedHashMap<String, double[]>();
        for (int i = 0; i < kv.length; i += 3) {
            out.put((String) kv[i], new double[]{((Number) kv[i + 1]).doubleValue(), ((Number) kv[i + 2]).doubleValue()});
        }
        return out;
    }
}
