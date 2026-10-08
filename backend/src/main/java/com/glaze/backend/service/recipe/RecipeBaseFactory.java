package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.Map;

import static com.glaze.backend.service.recipe.RecipeIngredients.BENTONITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.DOLOMITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.EPK_KAOLIN;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3124;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3134;
import static com.glaze.backend.service.recipe.RecipeIngredients.LITHIUM_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.SILICA;
import static com.glaze.backend.service.recipe.RecipeIngredients.WHITING;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZINC_OXIDE;

public final class RecipeBaseFactory {

    /** Lithium carbonate added by the Fluxed variant; also the ceiling Low stability may top up to. */
    static final double FLUXED_LITHIUM_CARBONATE = 3.0;

    private RecipeBaseFactory() {
    }

    public static Map<String, Double> standardBase(int tempC) {
        return new LinkedHashMap<>(baseForTemp(tempC));
    }

    public static Map<String, Double> highSilicaBase(int tempC) {
        var formula = new LinkedHashMap<>(baseForTemp(tempC));
        // Extra silica for durability; keep most of the kaolin so the Si:Al ratio (and a matte request) survives.
        RecipeMath.adjust(formula, SILICA, 4.0);
        RecipeMath.adjustIfPresent(formula, EPK_KAOLIN, -1.0);
        RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -2.0);
        RecipeMath.adjustIfPresent(formula, FERRO_FRIT_3134, -2.0);
        return formula;
    }

    public static Map<String, Double> fluxedBase(int tempC) {
        var formula = new LinkedHashMap<>(baseForTemp(tempC));
        switch (FiringBand.of(tempC)) {
            case LOW, LOW_MID -> {
                RecipeMath.adjust(formula, FERRO_FRIT_3134, 6.0);
                RecipeMath.adjustIfPresent(formula, SILICA, -3.0);
                RecipeMath.adjustIfPresent(formula, WHITING, -3.0);
            }
            case CONE_6 -> {
                RecipeMath.adjust(formula, FERRO_FRIT_3134, 4.0);
                RecipeMath.adjust(formula, LITHIUM_CARBONATE, 1.0);
                RecipeMath.adjustIfPresent(formula, WHITING, -2.0);
                RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -1.5);
            }
            default -> {
                RecipeMath.adjust(formula, LITHIUM_CARBONATE, FLUXED_LITHIUM_CARBONATE);
                RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -3.0);
            }
        }
        return formula;
    }

    /** Cone 06–04: two frits, no feldspar. Target UMF ~ SiO2 2.8, Al2O3 0.28, B2O3 0.6, CaO 0.68, KNaO 0.32. */
    private static Map<String, Double> lowFireBase() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(FERRO_FRIT_3134, 52.0);
        formula.put(FERRO_FRIT_3124, 14.0);
        formula.put(EPK_KAOLIN, 20.0);
        formula.put(SILICA, 12.0);
        formula.put(BENTONITE, 2.0);
        return formula;
    }

    /** Cone 03–02: frit with feldspar. Target UMF ~ SiO2 2.8, Al2O3 0.32, B2O3 0.39, CaO 0.64, MgO 0.06, KNaO 0.30. */
    private static Map<String, Double> lowMidFireBase() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(FERRO_FRIT_3134, 37.0);
        formula.put(POTASH_FELDSPAR, 21.0);
        formula.put(SILICA, 14.0);
        formula.put(EPK_KAOLIN, 17.0);
        formula.put(WHITING, 6.0);
        formula.put(DOLOMITE, 3.0);
        formula.put(BENTONITE, 2.0);
        return formula;
    }

    private static Map<String, Double> midFireBase() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(POTASH_FELDSPAR, 32.0);
        formula.put(SILICA, 23.0);
        formula.put(EPK_KAOLIN, 16.0);
        formula.put(WHITING, 14.0);
        formula.put(DOLOMITE, 9.0);
        formula.put(ZINC_OXIDE, 4.0);
        formula.put(BENTONITE, 2.0);
        return formula;
    }

    /** Cone 6: feldspar base carried by Frit 3134 boron. Target UMF ~ SiO2 3.1, Al2O3 0.36, B2O3 0.15, CaO 0.67, MgO 0.11, KNaO 0.22. */
    private static Map<String, Double> cone6Base() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(POTASH_FELDSPAR, 28.0);
        formula.put(SILICA, 22.0);
        formula.put(EPK_KAOLIN, 16.0);
        formula.put(FERRO_FRIT_3134, 14.0);
        formula.put(WHITING, 12.0);
        formula.put(DOLOMITE, 6.0);
        formula.put(BENTONITE, 2.0);
        return formula;
    }

    private static Map<String, Double> highFireBase() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(POTASH_FELDSPAR, 37.0);
        formula.put(SILICA, 27.0);
        formula.put(EPK_KAOLIN, 13.0);
        formula.put(WHITING, 14.0);
        formula.put(DOLOMITE, 7.0);
        formula.put(BENTONITE, 2.0);
        return formula;
    }

    private static Map<String, Double> baseForTemp(int tempC) {
        return switch (FiringBand.of(tempC)) {
            case LOW -> lowFireBase();
            case LOW_MID -> lowMidFireBase();
            case MID -> midFireBase();
            case CONE_6 -> cone6Base();
            case HIGH -> highFireBase();
        };
    }
}