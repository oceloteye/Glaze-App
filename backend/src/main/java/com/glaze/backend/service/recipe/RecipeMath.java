package com.glaze.backend.service.recipe;

import java.util.ArrayList;
import java.util.Map;

public final class RecipeMath {

    private RecipeMath() {
    }

    public static void adjust(Map<String, Double> formula, String key, double delta) {
        if (Math.abs(delta) < 1e-9) {
            return;
        }
        formula.compute(key, (name, value) -> Math.max(0.0, (value == null ? 0.0 : value) + delta));
    }

    public static void adjustIfPresent(Map<String, Double> formula, String key, double delta) {
        if (Math.abs(delta) < 1e-9 || !formula.containsKey(key)) {
            return;
        }
        formula.put(key, Math.max(0.0, formula.get(key) + delta));
    }

    public static void scaleIfPresent(Map<String, Double> formula, String key, double factor) {
        if (formula.containsKey(key)) {
            formula.put(key, Math.max(0.0, formula.get(key) * factor));
        }
    }

    public static double clamp(double value) {
        return Math.max(0.0, value);
    }

    public static double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    public static void normalize(Map<String, Double> formula) {
        double total = formula.values().stream().mapToDouble(Double::doubleValue).sum();
        if (total == 0.0) return;
        var keys = new ArrayList<>(formula.keySet());
        double running = 0.0;
        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get(i);
            if (i == keys.size() - 1) {
                formula.put(key, roundTwo(100.0 - running));
            } else {
                double normalized = roundTwo(formula.get(key) / total * 100.0);
                formula.put(key, normalized);
                running += normalized;
            }
        }
        formula.entrySet().removeIf(entry -> entry.getValue() <= 0.0);
    }

    public static double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}