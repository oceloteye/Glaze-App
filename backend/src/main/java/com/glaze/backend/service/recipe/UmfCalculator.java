package com.glaze.backend.service.recipe;

import com.glaze.backend.dto.Umf;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.glaze.backend.service.recipe.RecipeIngredients.*;

/** Converts a weight-percent recipe into a Unity Molecular Formula using typical material analyses. */
public final class UmfCalculator {

    static final String SIO2 = "SiO2";
    static final String AL2O3 = "Al2O3";
    static final String B2O3 = "B2O3";
    static final String K2O = "K2O";
    static final String NA2O = "Na2O";
    static final String LI2O = "Li2O";
    static final String CAO = "CaO";
    static final String MGO = "MgO";
    static final String ZNO = "ZnO";
    static final String TIO2 = "TiO2";
    static final String ZRO2 = "ZrO2";
    static final String SNO2 = "SnO2";
    static final String FE2O3 = "Fe2O3";
    static final String CUO = "CuO";
    static final String COO = "CoO";
    static final String MNO = "MnO";
    static final String CR2O3 = "Cr2O3";

    private static final Map<String, Double> MOLAR_MASS = Map.ofEntries(
            Map.entry(SIO2, 60.08), Map.entry(AL2O3, 101.96), Map.entry(B2O3, 69.62),
            Map.entry(K2O, 94.20), Map.entry(NA2O, 61.98), Map.entry(LI2O, 29.88),
            Map.entry(CAO, 56.08), Map.entry(MGO, 40.30), Map.entry(ZNO, 81.38),
            Map.entry(TIO2, 79.87), Map.entry(ZRO2, 123.22), Map.entry(SNO2, 150.71),
            Map.entry(FE2O3, 159.69), Map.entry(CUO, 79.55), Map.entry(COO, 74.93),
            Map.entry(MNO, 70.94), Map.entry(CR2O3, 151.99));

    private static final List<String> R2O = List.of(K2O, NA2O, LI2O);
    private static final List<String> RO = List.of(CAO, MGO, ZNO);
    private static final List<String> STABILIZERS = List.of(AL2O3, B2O3);
    private static final List<String> GLASS_FORMERS = List.of(SIO2, TIO2, ZRO2, SNO2);
    private static final List<String> COLORANTS = List.of(FE2O3, CUO, COO, MNO, CR2O3);

    // Oxide weight % per material (loss on ignition omitted). Typical published analyses.
    private static final Map<String, Map<String, Double>> ANALYSES = Map.ofEntries(
            Map.entry(POTASH_FELDSPAR, Map.of(SIO2, 68.5, AL2O3, 17.0, K2O, 10.0, NA2O, 3.0, CAO, 0.3)),
            Map.entry(SODA_FELDSPAR, Map.of(SIO2, 68.0, AL2O3, 19.0, NA2O, 7.0, K2O, 4.0, CAO, 1.5)),
            Map.entry(NEPHELINE_SYENITE, Map.of(SIO2, 60.7, AL2O3, 23.3, NA2O, 9.8, K2O, 4.6, CAO, 0.7)),
            Map.entry(FERRO_FRIT_3134, Map.of(SIO2, 46.5, B2O3, 23.1, CAO, 20.1, NA2O, 10.3)),
            Map.entry(EPK_KAOLIN, Map.of(SIO2, 45.7, AL2O3, 37.4, TIO2, 0.4, FE2O3, 0.8)),
            Map.entry(WHITING, Map.of(CAO, 56.0)),
            Map.entry(DOLOMITE, Map.of(CAO, 30.4, MGO, 21.7)),
            Map.entry(WOLLASTONITE, Map.of(CAO, 47.5, SIO2, 51.0)),
            Map.entry(SILICA, Map.of(SIO2, 100.0)),
            Map.entry(BENTONITE, Map.of(SIO2, 60.0, AL2O3, 20.0, FE2O3, 3.5, MGO, 2.5, NA2O, 2.5, CAO, 0.7)),
            Map.entry(ZINC_OXIDE, Map.of(ZNO, 100.0)),
            Map.entry(LITHIUM_CARBONATE, Map.of(LI2O, 40.4)),
            Map.entry(ZIRCOPAX, Map.of(ZRO2, 67.2, SIO2, 32.8)),
            Map.entry(TIN_OXIDE, Map.of(SNO2, 100.0)),
            Map.entry(RUTILE, Map.of(TIO2, 93.0, FE2O3, 3.0)),
            Map.entry(TITANIUM_DIOXIDE, Map.of(TIO2, 100.0)),
            Map.entry(COPPER_CARBONATE, Map.of(CUO, 71.9)),
            Map.entry(COBALT_CARBONATE, Map.of(COO, 63.0)),
            Map.entry(MANGANESE_DIOXIDE, Map.of(MNO, 81.6)),
            Map.entry(MANGANESE_GRANULES, Map.of(MNO, 81.6)),
            Map.entry(ILMENITE_GRANULAR, Map.of(TIO2, 52.7, FE2O3, 47.3)),
            Map.entry(IRON_CHROMATE, Map.of(CR2O3, 68.0, FE2O3, 32.0)),
            Map.entry(IRON_OXIDE, Map.of(FE2O3, 100.0)),
            Map.entry(RED_IRON_OXIDE, Map.of(FE2O3, 100.0)),
            Map.entry(YELLOW_IRON_OXIDE, Map.of(FE2O3, 89.9)));

    private UmfCalculator() {
    }

    public static Umf calculate(Map<String, Double> recipe) {
        var moles = new LinkedHashMap<String, Double>();
        recipe.forEach((material, percent) -> {
            Map<String, Double> analysis = ANALYSES.get(material);
            if (analysis == null || percent == null) return;
            analysis.forEach((oxide, weightPct) ->
                    moles.merge(oxide, percent * weightPct / 100.0 / MOLAR_MASS.get(oxide), Double::sum));
        });

        double r2o = sum(moles, R2O);
        double ro = sum(moles, RO);
        double unity = r2o + ro;
        if (unity <= 0.0) {
            return new Umf(Map.of(), Map.of(), Map.of(), Map.of(), 0.0, 0.0);
        }

        var fluxes = group(moles, unity, R2O);
        fluxes.putAll(group(moles, unity, RO));
        double si = moles.getOrDefault(SIO2, 0.0);
        double al = moles.getOrDefault(AL2O3, 0.0);
        return new Umf(
                fluxes,
                group(moles, unity, STABILIZERS),
                group(moles, unity, GLASS_FORMERS),
                group(moles, unity, COLORANTS),
                al > 0.0 ? round(si / al, 1) : 0.0,
                round(r2o / unity, 2));
    }

    private static double sum(Map<String, Double> moles, List<String> oxides) {
        return oxides.stream().mapToDouble(o -> moles.getOrDefault(o, 0.0)).sum();
    }

    private static LinkedHashMap<String, Double> group(Map<String, Double> moles, double unity, List<String> oxides) {
        var out = new LinkedHashMap<String, Double>();
        for (String oxide : oxides) {
            double value = round(moles.getOrDefault(oxide, 0.0) / unity, 3);
            if (value > 0.0) out.put(oxide, value);
        }
        return out;
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
