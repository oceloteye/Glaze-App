package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.Map;

import static com.glaze.backend.service.recipe.RecipeIngredients.BENTONITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.DOLOMITE;
import static com.glaze.backend.service.recipe.RecipeIngredients.EPK_KAOLIN;
import static com.glaze.backend.service.recipe.RecipeIngredients.FERRO_FRIT_3134;
import static com.glaze.backend.service.recipe.RecipeIngredients.POTASH_FELDSPAR;
import static com.glaze.backend.service.recipe.RecipeIngredients.SILICA;
import static com.glaze.backend.service.recipe.RecipeIngredients.WHITING;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZINC_OXIDE;

public final class RecipeBaseFactory {

    private RecipeBaseFactory() {
    }

    public static Map<String, Double> standardBase(int tempC) {
        return new LinkedHashMap<>(baseForTemp(tempC));
    }

    public static Map<String, Double> highSilicaBase(int tempC) {
        var formula = new LinkedHashMap<>(baseForTemp(tempC));
        RecipeMath.adjust(formula, SILICA, 5.0);
        RecipeMath.adjustIfPresent(formula, EPK_KAOLIN, -3.0);
        RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -2.0);
        RecipeMath.adjustIfPresent(formula, FERRO_FRIT_3134, -2.0);
        return formula;
    }

    public static Map<String, Double> fluxedBase(int tempC) {
        var formula = new LinkedHashMap<>(baseForTemp(tempC));
        if (tempC < 1120) {
            RecipeMath.adjust(formula, FERRO_FRIT_3134, 6.0);
            RecipeMath.adjustIfPresent(formula, SILICA, -3.0);
            RecipeMath.adjustIfPresent(formula, WHITING, -3.0);
        } else {
            RecipeMath.adjust(formula, RecipeIngredients.LITHIUM_CARBONATE, 3.5);
            RecipeMath.adjustIfPresent(formula, POTASH_FELDSPAR, -2.0);
            RecipeMath.adjustIfPresent(formula, SILICA, -1.5);
        }
        return formula;
    }

    private static Map<String, Double> lowFireBase() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(FERRO_FRIT_3134, 55.0);
        formula.put(EPK_KAOLIN, 20.0);
        formula.put(SILICA, 17.0);
        formula.put(WHITING, 6.0);
        formula.put(BENTONITE, 2.0);
        return formula;
    }

    private static Map<String, Double> lowMidFireBase() {
        var formula = new LinkedHashMap<String, Double>();
        formula.put(FERRO_FRIT_3134, 35.0);
        formula.put(POTASH_FELDSPAR, 18.0);
        formula.put(SILICA, 20.0);
        formula.put(EPK_KAOLIN, 16.0);
        formula.put(WHITING, 9.0);
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
        if (tempC < 1000) return lowFireBase();
        if (tempC < 1120) return lowMidFireBase();
        if (tempC < 1200) return midFireBase();
        return highFireBase();
    }
}