package com.glaze.backend.service.recipe;

import com.glaze.backend.dto.Umf;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    static final String BAO = "BaO";
    static final String SRO = "SrO";
    static final String TIO2 = "TiO2";
    static final String ZRO2 = "ZrO2";
    static final String SNO2 = "SnO2";
    static final String P2O5 = "P2O5";
    static final String FE2O3 = "Fe2O3";
    static final String CUO = "CuO";
    static final String COO = "CoO";
    static final String MNO = "MnO";
    static final String CR2O3 = "Cr2O3";
    static final String NIO = "NiO";

    private static final Map<String, Double> MOLAR_MASS = Map.ofEntries(
            Map.entry(SIO2, 60.08), Map.entry(AL2O3, 101.96), Map.entry(B2O3, 69.62),
            Map.entry(K2O, 94.20), Map.entry(NA2O, 61.98), Map.entry(LI2O, 29.88),
            Map.entry(CAO, 56.08), Map.entry(MGO, 40.30), Map.entry(ZNO, 81.38),
            Map.entry(BAO, 153.33), Map.entry(SRO, 103.62),
            Map.entry(TIO2, 79.87), Map.entry(ZRO2, 123.22), Map.entry(SNO2, 150.71),
            Map.entry(P2O5, 141.94),
            Map.entry(FE2O3, 159.69), Map.entry(CUO, 79.55), Map.entry(COO, 74.93),
            Map.entry(MNO, 70.94), Map.entry(CR2O3, 151.99), Map.entry(NIO, 74.69));

    static final List<String> R2O = List.of(K2O, NA2O, LI2O);
    static final List<String> RO = List.of(CAO, MGO, ZNO, SRO, BAO);
    static final List<String> STABILIZERS = List.of(AL2O3, B2O3);
    static final List<String> GLASS_FORMERS = List.of(SIO2, TIO2, ZRO2, SNO2, P2O5);
    static final List<String> COLORANTS = List.of(FE2O3, CUO, COO, MNO, CR2O3, NIO);

    private UmfCalculator() {
    }

    public static Umf calculate(Map<String, Double> recipe) {
        var moles = rawMoles(recipe);

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

    /**
     * Unrounded moles of every oxide per unit of flux (R2O + RO = 1).
     * Returns an empty map when the recipe contains no flux.
     */
    static Map<String, Double> unityMoles(Map<String, Double> recipe) {
        var moles = rawMoles(recipe);
        double unity = sum(moles, R2O) + sum(moles, RO);
        if (unity <= 0.0) return Map.of();
        var out = new LinkedHashMap<String, Double>();
        moles.forEach((oxide, value) -> out.put(oxide, value / unity));
        return out;
    }

    private static Map<String, Double> rawMoles(Map<String, Double> recipe) {
        var moles = new LinkedHashMap<String, Double>();
        recipe.forEach((material, percent) -> {
            Map<String, Double> analysis = MaterialCatalog.analysis(material);
            if (analysis == null || percent == null) return;
            analysis.forEach((oxide, weightPct) ->
                    moles.merge(oxide, percent * weightPct / 100.0 / MOLAR_MASS.get(oxide), Double::sum));
        });
        return moles;
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
