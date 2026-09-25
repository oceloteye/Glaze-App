package com.glaze.backend.dto;

import java.util.List;

public record FiringSchedule(
        String length,
        String cone,
        int peakTempC,
        int peakTempF,
        String atmosphere,
        String coolingStrategy,
        double heatingHours,
        double coolingHours,
        double estimatedHours,
        List<FiringSegment> segments,
        List<String> notes
) {
}
