package com.glaze.backend.service;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import org.junit.jupiter.api.Test;

import com.glaze.backend.dto.FiringSchedule;
import com.glaze.backend.dto.FiringSegment;
import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipeSuggestion;

class FiringScheduleTest {

    private final GlazeRecipeService service = new GlazeRecipeService();

    private static GlazeRequest request(int tempC, String finish, List<String> effects, String atmosphere, Boolean foodSafe) {
        return new GlazeRequest("#3a6bc1", tempC, finish, "Medium", effects, 50, null, null, null, atmosphere, foodSafe);
    }

    private static RecipeSuggestion variant(List<RecipeSuggestion> recipes, String label) {
        return recipes.stream().filter(r -> r.name().contains(label)).findFirst().orElseThrow();
    }

    private static FiringSchedule medium(RecipeSuggestion recipe) {
        return ofLength(recipe, "medium");
    }

    private static FiringSchedule ofLength(RecipeSuggestion recipe, String length) {
        return recipe.firingSchedules().stream().filter(s -> length.equals(s.length())).findFirst().orElseThrow();
    }

    private static FiringSegment peakSegment(FiringSchedule schedule) {
        return schedule.segments().stream()
                .filter(s -> "Heat".equals(s.phase()))
                .reduce((a, b) -> b)
                .orElseThrow();
    }

    @Test
    void everyRecipeCarriesAScheduleEndingAtRequestedPeak() {
        var recipes = service.generateRecipes(request(1222, "Satin", List.of(), null, null));
        assertThat(recipes).hasSize(3);
        for (var recipe : recipes) {
            assertThat(recipe.firingSchedules()).extracting(FiringSchedule::length).containsExactly("short", "medium", "long");
            var schedule = medium(recipe);
            assertThat(schedule).isNotNull();
            assertThat(schedule.cone()).isEqualTo("6");
            assertThat(schedule.peakTempC()).isEqualTo(1222);
            assertThat(schedule.peakTempF()).isEqualTo(2232);
            assertThat(schedule.atmosphere()).isEqualTo("oxidation");
            assertThat(schedule.estimatedHours()).isGreaterThan(0.0);
            assertThat(peakSegment(schedule).targetTempC()).isEqualTo(1222);
            assertThat(schedule.segments()).last().extracting(FiringSegment::targetTempC).isEqualTo(150);
        }
    }

    @Test
    void lengthsOrderTotalTimeAndSoak() {
        var recipe = variant(service.generateRecipes(request(1222, "Satin", List.of(), null, null)), "Balanced");
        var shortS = ofLength(recipe, "short");
        var mediumS = ofLength(recipe, "medium");
        var longS = ofLength(recipe, "long");

        assertThat(shortS.estimatedHours()).isLessThan(mediumS.estimatedHours());
        assertThat(mediumS.estimatedHours()).isLessThan(longS.estimatedHours());
        assertThat(peakSegment(shortS).holdMinutes()).isLessThan(peakSegment(mediumS).holdMinutes());
        assertThat(peakSegment(mediumS).holdMinutes()).isLessThan(peakSegment(longS).holdMinutes());
        assertThat(peakSegment(shortS).targetTempC()).isEqualTo(1222);
        assertThat(peakSegment(longS).targetTempC()).isEqualTo(1222);
        assertThat(longS.coolingStrategy()).isEqualTo("Controlled cool");
    }

    @Test
    void heatingAndCoolingHoursSplitTheTotal() {
        var schedule = medium(variant(service.generateRecipes(request(1222, "Glossy", List.of(), null, null)), "Balanced"));
        double heatHours = 0.0;
        int current = 20;
        for (var segment : schedule.segments()) {
            if (!"Heat".equals(segment.phase())) break;
            heatHours += (segment.targetTempC() - current) / (double) segment.rateCPerHour() + segment.holdMinutes() / 60.0;
            current = segment.targetTempC();
        }
        assertThat(schedule.heatingHours()).isCloseTo(heatHours, within(0.1));
        assertThat(schedule.coolingHours()).isGreaterThan(0.0);
        assertThat(schedule.estimatedHours()).isCloseTo(schedule.heatingHours() + schedule.coolingHours(), within(0.1));
    }

    @Test
    void segmentTemperaturesAreMonotonicUpThenDown() {
        var schedule = medium(variant(service.generateRecipes(request(1180, "Glossy", List.of(), null, null)), "Balanced"));
        boolean cooling = false;
        int previous = 20;
        for (var segment : schedule.segments()) {
            if ("Cool".equals(segment.phase())) {
                cooling = true;
                assertThat(segment.targetTempC()).isLessThan(previous);
            } else {
                assertThat(cooling).isFalse();
                assertThat(segment.targetTempC()).isGreaterThan(previous);
            }
            previous = segment.targetTempC();
        }
    }

    @Test
    void crystallineEffectAddsGrowthHold() {
        var schedule = medium(variant(service.generateRecipes(request(1222, "Glossy", List.of("Crystalline"), null, null)), "Balanced"));
        assertThat(schedule.coolingStrategy()).isEqualTo("Crystal-growth hold");
        assertThat(schedule.segments())
                .anyMatch(s -> "Cool".equals(s.phase()) && s.targetTempC() == 1100 && s.holdMinutes() >= 120);
    }

    @Test
    void matteFinishUsesControlledSlowCool() {
        var schedule = medium(variant(service.generateRecipes(request(1222, "Matte", List.of(), null, null)), "Balanced"));
        assertThat(schedule.coolingStrategy()).isEqualTo("Controlled slow cool");
        assertThat(schedule.segments())
                .anyMatch(s -> "Cool".equals(s.phase()) && s.rateCPerHour() != null && s.rateCPerHour() <= 100 && s.targetTempC() == 750);
    }

    @Test
    void glossyWithoutEffectsCoolsNaturally() {
        var schedule = medium(variant(service.generateRecipes(request(1222, "Glossy", List.of(), null, null)), "Balanced"));
        assertThat(schedule.coolingStrategy()).isEqualTo("Natural cool");
    }

    @Test
    void reductionAddsBodyReductionHold() {
        var schedule = medium(variant(service.generateRecipes(request(1280, "Satin", List.of(), "reduction", null)), "Balanced"));
        assertThat(schedule.atmosphere()).isEqualTo("reduction");
        assertThat(schedule.segments())
                .anyMatch(s -> "Heat".equals(s.phase()) && s.targetTempC() == 900 && s.holdMinutes() >= 30);
        assertThat(schedule.notes()).anyMatch(n -> n.toLowerCase().contains("reduction"));
    }

    @Test
    void fluxedVariantSoaksShorterAndClimbsSlowerThanHighSilica() {
        var recipes = service.generateRecipes(request(1222, "Satin", List.of(), null, null));
        var fluxed = peakSegment(medium(variant(recipes, "Fluxed")));
        var highSilica = peakSegment(medium(variant(recipes, "High-Silica")));

        assertThat(fluxed.holdMinutes()).isLessThan(highSilica.holdMinutes());
        assertThat(fluxed.rateCPerHour()).isLessThan(highSilica.rateCPerHour());
    }

    @Test
    void foodSafeExtendsPeakSoak() {
        var standard = peakSegment(medium(variant(service.generateRecipes(request(1222, "Satin", List.of(), null, false)), "Balanced")));
        var foodSafe = peakSegment(medium(variant(service.generateRecipes(request(1222, "Satin", List.of(), null, true)), "Balanced")));
        assertThat(foodSafe.holdMinutes()).isGreaterThan(standard.holdMinutes());
    }

    @Test
    void lowFireScheduleStaysBelowPeakAndMapsToLowCone() {
        var schedule = medium(variant(service.generateRecipes(request(998, "Glossy", List.of(), null, null)), "Balanced"));
        assertThat(schedule.cone()).isEqualTo("06");
        assertThat(schedule.segments()).allMatch(s -> s.targetTempC() <= 998);
        assertThat(schedule.notes()).anyMatch(n -> n.toLowerCase().contains("low-fire"));
    }

    @Test
    void fahrenheitValuesMatchCelsius() {
        var schedule = medium(variant(service.generateRecipes(request(1222, "Satin", List.of(), null, null)), "Balanced"));
        for (var segment : schedule.segments()) {
            assertThat(segment.targetTempF()).isEqualTo((int) Math.round(segment.targetTempC() * 9.0 / 5.0 + 32.0));
            if (segment.rateCPerHour() == null) {
                assertThat(segment.rateFPerHour()).isNull();
            } else {
                assertThat(segment.rateFPerHour()).isEqualTo((int) Math.round(segment.rateCPerHour() * 1.8));
            }
        }
    }
}
