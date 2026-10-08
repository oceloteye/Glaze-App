package com.glaze.backend.service.recipe;

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
        formula.entrySet().removeIf(entry -> entry.getValue() <= 0.0);
        double total = formula.values().stream().mapToDouble(Double::doubleValue).sum();
        if (total == 0.0) return;
        // Round each share, then push the rounding residue onto the largest ingredient
        // so a trace material never absorbs a phantom 0.01.
        String largest = null;
        double running = 0.0;
        for (var entry : formula.entrySet()) {
            double normalized = roundTwo(entry.getValue() / total * 100.0);
            entry.setValue(normalized);
            running += normalized;
            if (largest == null || normalized > formula.get(largest)) {
                largest = entry.getKey();
            }
        }
        formula.put(largest, roundTwo(formula.get(largest) + (100.0 - running)));
        formula.entrySet().removeIf(entry -> entry.getValue() <= 0.0);
    }

    public static double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}