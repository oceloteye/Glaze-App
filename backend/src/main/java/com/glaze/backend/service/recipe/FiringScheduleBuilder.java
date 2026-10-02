package com.glaze.backend.service.recipe;

import com.glaze.backend.dto.FiringSchedule;
import com.glaze.backend.dto.FiringSegment;
import com.glaze.backend.dto.GlazeRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.glaze.backend.service.recipe.RecipeIngredients.LITHIUM_CARBONATE;
import static com.glaze.backend.service.recipe.RecipeIngredients.RUTILE;
import static com.glaze.backend.service.recipe.RecipeIngredients.ZINC_OXIDE;

public final class FiringScheduleBuilder {

    static final String PHASE_HEAT = "Heat";
    static final String PHASE_COOL = "Cool";

    /** Overall firing length. Rates, soaks and cooling windows scale with it. */
    public enum Length {
        VERY_SHORT("very-short", 200, 350, 250, 2.0, 0.25, 150, 60, false),
        SHORT("short", 100, 200, 150, 1.6, 0.5, 120, 90, false),
        MEDIUM("medium", 100, 150, 120, 1.0, 1.0, 80, 180, false),
        LONG("long", 100, 100, 90, 0.75, 2.0, 50, 300, true);

        final String label;
        final int preheatRate;
        final int mainRateOxidation;
        final int mainRateReduction;
        final double finalRateFactor;
        final double holdFactor;
        final int slowCoolRate;
        final int crystalHoldMinutes;
        final boolean controlledCoolForGlossy;

        Length(String label, int preheatRate, int mainRateOxidation, int mainRateReduction, double finalRateFactor,
               double holdFactor, int slowCoolRate, int crystalHoldMinutes, boolean controlledCoolForGlossy) {
            this.label = label;
            this.preheatRate = preheatRate;
            this.mainRateOxidation = mainRateOxidation;
            this.mainRateReduction = mainRateReduction;
            this.finalRateFactor = finalRateFactor;
            this.holdFactor = holdFactor;
            this.slowCoolRate = slowCoolRate;
            this.crystalHoldMinutes = crystalHoldMinutes;
            this.controlledCoolForGlossy = controlledCoolForGlossy;
        }
    }

    private static final int ROOM_TEMP_C = 20;
    private static final int QUARTZ_INVERSION_C = 600;
    private static final int BODY_REDUCTION_C = 900;
    private static final int KILN_OPEN_C = 150;
    /** Uncontrolled cooling slows as the kiln loses heat; band-average rates used for time estimates. */
    private static final int[] NATURAL_COOL_BAND_FLOORS_C = {1000, 750, 0};
    private static final double[] NATURAL_COOL_BAND_RATES = {200.0, 130.0, 90.0};

    // Orton self-supporting cones at ~108°C/hr final ramp (approximate).
    private static final String[] CONE_LABELS = {
            "022", "021", "020", "019", "018", "017", "016", "015", "014", "013", "012", "011", "010",
            "09", "08", "07", "06", "05", "04", "03", "02", "01",
            "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"
    };
    private static final int[] CONE_TEMPS_C = {
            600, 614, 635, 683, 717, 747, 792, 804, 838, 852, 884, 894, 900,
            923, 955, 984, 999, 1046, 1060, 1101, 1120, 1137,
            1154, 1162, 1168, 1186, 1196, 1222, 1240, 1263, 1280, 1305, 1315, 1326
    };

    private FiringScheduleBuilder() {
    }

    public static List<FiringSchedule> buildAll(String variant, GlazeRequest request, Map<String, Double> formula) {
        return List.of(
                build(variant, request, formula, Length.VERY_SHORT),
                build(variant, request, formula, Length.SHORT),
                build(variant, request, formula, Length.MEDIUM),
                build(variant, request, formula, Length.LONG));
    }

    public static FiringSchedule build(String variant, GlazeRequest request, Map<String, Double> formula) {
        return build(variant, request, formula, Length.MEDIUM);
    }

    public static FiringSchedule build(String variant, GlazeRequest request, Map<String, Double> formula, Length length) {
        int peak = request.firingTempC();
        boolean reduction = "reduction".equalsIgnoreCase(request.atmosphere());
        boolean foodSafe = Boolean.TRUE.equals(request.foodSafe());
        boolean lowFire = peak < 1000;
        String finish = request.surfaceFinish() == null ? "" : request.surfaceFinish().toLowerCase(Locale.ROOT);
        List<String> effects = request.effects().stream().map(e -> e.toLowerCase(Locale.ROOT)).toList();

        boolean crystalline = effects.stream().anyMatch(e -> e.contains("crystal"))
                || formula.getOrDefault(ZINC_OXIDE, 0.0) >= 9.0;
        boolean matte = finish.contains("matte");
        boolean variegated = effects.stream().anyMatch(e -> e.contains("varieg") || e.contains("flame"))
                || formula.getOrDefault(RUTILE, 0.0) >= 2.5;
        boolean fluid = RecipeVariants.FLUXED.equals(variant)
                || effects.stream().anyMatch(e -> e.contains("melt"))
                || formula.getOrDefault(LITHIUM_CARBONATE, 0.0) >= 2.0;
        boolean stiff = RecipeVariants.HIGH_SILICA.equals(variant);

        var segments = new ArrayList<FiringSegment>();
        var notes = new ArrayList<String>();

        int preheatHold = length == Length.LONG ? 30 : 0;
        segments.add(segment(PHASE_HEAT, length.preheatRate, Math.min(120, peak), preheatHold,
                preheatHold > 0
                        ? "Gentle start with a candling hold to fully dry the glaze coat"
                        : "Gentle start to drive off moisture from the glaze coat"));

        int mainRate = reduction ? length.mainRateReduction : length.mainRateOxidation;
        int approachStart = peak - (peak >= 1200 ? 100 : 80);
        if (approachStart > QUARTZ_INVERSION_C) {
            segments.add(segment(PHASE_HEAT, mainRate, QUARTZ_INVERSION_C, 0,
                    "Steady climb through quartz inversion (573°C / 1063°F)"));
            if (reduction && approachStart > BODY_REDUCTION_C) {
                segments.add(segment(PHASE_HEAT, mainRate, BODY_REDUCTION_C, scaledHold(30, length),
                        "Begin body reduction; hold in moderate reduction, then keep light–moderate reduction to peak"));
            }
            segments.add(segment(PHASE_HEAT, mainRate, approachStart, 0,
                    reduction ? "Continue climb under light–moderate reduction" : "Main climb"));
        } else {
            segments.add(segment(PHASE_HEAT, mainRate, approachStart, 0, "Main climb"));
        }

        int baseFinalRate = fluid ? 50 : (stiff ? 70 : 60);
        int finalRate = (int) Math.round(baseFinalRate * length.finalRateFactor);
        int hold = lowFire ? 5 : 10;
        if (stiff) hold += 5;
        if (fluid) hold = Math.max(5, hold - 5);
        if (foodSafe) hold += 5;
        hold = scaledHold(hold, length);
        segments.add(segment(PHASE_HEAT, finalRate, peak, hold,
                "Slow final approach for even heatwork; soak to mature the melt"));

        String coolingStrategy;
        if (crystalline) {
            int growthZone = peak >= 1200 ? 1100 : peak - 120;
            segments.add(segment(PHASE_COOL, null, growthZone, length.crystalHoldMinutes,
                    "Drop quickly to the crystal-growth zone and hold to grow zinc-silicate crystals"));
            segments.add(segment(PHASE_COOL, 100, 750, 0, "Controlled cool out of the growth zone"));
            coolingStrategy = "Crystal-growth hold";
            notes.add("Crystal size scales with the length of the growth hold; extend toward 4–5 h for larger crystals.");
            notes.add("Crystalline glazes run — fire on a catcher or pedestal.");
        } else if (matte || variegated) {
            int slowFrom = Math.min(peak, 1050);
            if (slowFrom < peak) {
                segments.add(segment(PHASE_COOL, null, slowFrom, 0, "Natural cool to the start of the slow-cool window"));
            }
            segments.add(segment(PHASE_COOL, length.slowCoolRate, 750, 0,
                    matte
                            ? "Slow cool develops a microcrystalline matte surface"
                            : "Slow cool lets rutile/titania variegation and flashing develop"));
            coolingStrategy = "Controlled slow cool";
            if (matte) {
                notes.add("Fast cooling can turn this matte glossy; keep the " + length.slowCoolRate + "°C/hr segment.");
            }
        } else if (length.controlledCoolForGlossy) {
            segments.add(segment(PHASE_COOL, 100, 750, 0,
                    "Controlled cool reduces thermal shock and evens out colour and gloss"));
            coolingStrategy = "Controlled cool";
        } else {
            segments.add(segment(PHASE_COOL, null, 750, 0, "Kiln natural cool"));
            coolingStrategy = "Natural cool";
        }
        segments.add(segment(PHASE_COOL, null, KILN_OPEN_C, 0,
                "Natural cool; do not crack the lid above 150°C / 300°F"));

        String cone = nearestCone(peak);
        notes.add(0, "Peak ≈ cone " + cone + " (" + peak + "°C / " + toF(peak) + "°F). Confirm with a witness cone.");
        if (reduction) {
            notes.add("Reduction: start body reduction around cone 010 (~900°C) and hold a light–moderate flame to peak; oxidize briefly at the end for cleaner colour.");
        }
        if (fluid) {
            notes.add("Fluid melt: apply a thinner coat and leave a bare foot; the slower final ramp and shorter soak limit running.");
        }
        if (stiff) {
            notes.add("Stiff, high-silica melt: the longer soak helps heal pinholes and fully mature the surface.");
        }
        if (foodSafe) {
            notes.add("Dinnerware mode: extended soak ensures full maturation for a durable, low-leach surface.");
        }
        if (lowFire) {
            notes.add("Frit-based low-fire glaze matures quickly; avoid overfiring by more than one cone.");
        }
        switch (length) {
            case VERY_SHORT -> notes.add("Very short schedule: ~4 h to peak suits small electric kilns and thin, bone-dry test tiles; confirm your kiln can sustain the main ramp, and expect muted colour development and a higher pinhole/crawl risk.");
            case SHORT -> notes.add("Short schedule: faster ramps suit thin-walled, well-dried work; expect slightly less colour development and a higher pinhole risk.");
            case LONG -> notes.add("Long schedule: slow ramps and extended soaks favour thick or large pieces and give the fullest melt and surface development.");
            default -> { }
        }

        int heatEnd = heatingEndIndex(segments);
        double heatingHours = roundTenth(estimateHours(segments, 0, heatEnd));
        double coolingHours = roundTenth(estimateHours(segments, heatEnd, segments.size()));

        return new FiringSchedule(
                length.label,
                cone,
                peak,
                toF(peak),
                reduction ? "reduction" : "oxidation",
                coolingStrategy,
                heatingHours,
                coolingHours,
                roundTenth(heatingHours + coolingHours),
                List.copyOf(segments),
                List.copyOf(notes));
    }

    static String nearestCone(int tempC) {
        int bestIndex = 0;
        int bestDistance = Integer.MAX_VALUE;
        for (int i = 0; i < CONE_TEMPS_C.length; i++) {
            int distance = Math.abs(CONE_TEMPS_C[i] - tempC);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }
        return CONE_LABELS[bestIndex];
    }

    private static int scaledHold(int minutes, Length length) {
        return (int) Math.round(minutes * length.holdFactor);
    }

    private static FiringSegment segment(String phase, Integer rateC, int targetC, int holdMinutes, String note) {
        Integer rateF = rateC == null ? null : (int) Math.round(rateC * 1.8);
        return new FiringSegment(phase, rateC, rateF, targetC, toF(targetC), holdMinutes, note);
    }

    /** Index of the first cooling segment; heating (including the peak soak) ends here. */
    private static int heatingEndIndex(List<FiringSegment> segments) {
        for (int i = 0; i < segments.size(); i++) {
            if (PHASE_COOL.equals(segments.get(i).phase())) {
                return i;
            }
        }
        return segments.size();
    }

    private static double estimateHours(List<FiringSegment> segments, int startInclusive, int endExclusive) {
        double hours = 0.0;
        int current = startInclusive == 0 ? ROOM_TEMP_C : segments.get(startInclusive - 1).targetTempC();
        for (FiringSegment segment : segments.subList(startInclusive, endExclusive)) {
            if (segment.rateCPerHour() == null) {
                hours += naturalCoolHours(current, segment.targetTempC());
            } else {
                hours += Math.abs(segment.targetTempC() - current) / (double) segment.rateCPerHour();
            }
            hours += segment.holdMinutes() / 60.0;
            current = segment.targetTempC();
        }
        return hours;
    }

    private static double naturalCoolHours(int fromC, int toC) {
        double hours = 0.0;
        int current = fromC;
        for (int i = 0; i < NATURAL_COOL_BAND_FLOORS_C.length && current > toC; i++) {
            int floor = Math.max(NATURAL_COOL_BAND_FLOORS_C[i], toC);
            if (current > floor) {
                hours += (current - floor) / NATURAL_COOL_BAND_RATES[i];
                current = floor;
            }
        }
        return hours;
    }

    private static double roundTenth(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static int toF(int c) {
        return (int) Math.round(c * 9.0 / 5.0 + 32.0);
    }
}
