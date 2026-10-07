package com.glaze.backend.service.recipe;

/** Temperature bands the generator uses to pick a base recipe and scale its surface modifiers. */
public enum FiringBand {
    /** Up to cone 04: frit-carried, no feldspar. */
    LOW(1060),
    /** Cone 03–02: frit plus feldspar. */
    LOW_MID(1120),
    /** Cone 01–5: feldspar, dolomite and zinc. */
    MID(1200),
    /** Cone 6–7: feldspar carried by Frit 3134 boron. */
    CONE_6(1260),
    /** Cone 8 and above: feldspar, whiting, dolomite. */
    HIGH(Integer.MAX_VALUE);

    private final int upperBoundExclusive;

    FiringBand(int upperBoundExclusive) {
        this.upperBoundExclusive = upperBoundExclusive;
    }

    public static FiringBand of(int tempC) {
        for (FiringBand band : values()) {
            if (tempC < band.upperBoundExclusive) return band;
        }
        return HIGH;
    }

    public boolean isLowFire() {
        return this == LOW || this == LOW_MID;
    }
}
