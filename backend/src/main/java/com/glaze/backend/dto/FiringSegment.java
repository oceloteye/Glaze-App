package com.glaze.backend.dto;

/**
 * One controller segment. A null rate means "uncontrolled / as fast as the kiln allows".
 */
public record FiringSegment(
        String phase,
        Integer rateCPerHour,
        Integer rateFPerHour,
        int targetTempC,
        int targetTempF,
        int holdMinutes,
        String note
) {
}
