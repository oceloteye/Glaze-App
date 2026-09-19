package com.glaze.backend.service.recipe;

public final class RecipeColorUtil {

    private RecipeColorUtil() {
    }

    public static double[] hexToHsl(String hex) {
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

    public static boolean isCeladonZone(double h, double s, double l) {
        return h >= 100 && h <= 155 && s >= 0.18 && s <= 0.5 && l >= 0.38 && l <= 0.72;
    }

    public static boolean isRobinsEggZone(double h, double s, double l) {
        return h >= 175 && h <= 210 && s >= 0.25 && s <= 0.65 && l >= 0.56 && l <= 0.84;
    }

    public static boolean isArmyOliveZone(double h, double s, double l) {
        return h >= 70 && h <= 110 && s >= 0.22 && s <= 0.55 && l >= 0.24 && l <= 0.5;
    }

    public static boolean isSeafoamMintZone(double h, double s, double l) {
        return h >= 145 && h <= 180 && s >= 0.22 && s <= 0.6 && l >= 0.62 && l <= 0.9;
    }
}