package com.glaze.backend.service.recipe;

import java.util.Set;

final class RecipeIngredients {

    static final String POTASH_FELDSPAR = "Potash Feldspar";
    static final String NEPHELINE_SYENITE = "Nepheline Syenite";
    static final String SODA_FELDSPAR = "Soda Feldspar";
    static final String FERRO_FRIT_3134 = "Ferro Frit 3134";
    static final String EPK_KAOLIN = "EPK Kaolin";
    static final String WHITING = "Whiting";
    static final String DOLOMITE = "Dolomite";
    static final String SILICA = "Silica";
    static final String BENTONITE = "Bentonite";
    static final String WOLLASTONITE = "Wollastonite";
    static final String ZINC_OXIDE = "Zinc Oxide";
    static final String ZIRCOPAX = "Zircopax";
    static final String TIN_OXIDE = "Tin Oxide";
    static final String RUTILE = "Rutile";
    static final String TITANIUM_DIOXIDE = "Titanium Dioxide";
    static final String COPPER_CARBONATE = "Copper Carbonate";
    static final String COBALT_CARBONATE = "Cobalt Carbonate";
    static final String MANGANESE_DIOXIDE = "Manganese Dioxide";
    static final String MANGANESE_GRANULES = "Manganese Granules";
    static final String ILMENITE_GRANULAR = "Ilmenite (granular)";
    static final String IRON_CHROMATE = "Iron Chromate";
    static final String IRON_OXIDE = "Iron Oxide";
    static final String RED_IRON_OXIDE = "Red Iron Oxide";
    static final String YELLOW_IRON_OXIDE = "Yellow Iron Oxide";
    static final String LITHIUM_CARBONATE = "Lithium Carbonate";

    // Builder-only materials (not used by the generator's base recipes).
    static final String CUSTER_FELDSPAR = "Custer Feldspar";
    static final String FERRO_FRIT_3124 = "Ferro Frit 3124";
    static final String TALC = "Talc";
    static final String GERSTLEY_BORATE = "Gerstley Borate";
    static final String BALL_CLAY = "Ball Clay";
    static final String SPODUMENE = "Spodumene";
    static final String BONE_ASH = "Bone Ash";
    static final String STRONTIUM_CARBONATE = "Strontium Carbonate";
    static final String BARIUM_CARBONATE = "Barium Carbonate";
    static final String COBALT_OXIDE = "Cobalt Oxide";
    static final String COPPER_OXIDE = "Copper Oxide";
    static final String CHROME_OXIDE = "Chrome Oxide";
    static final String NICKEL_OXIDE = "Nickel Oxide";

    static final Set<String> COLORANT_KEYS = Set.of(
            RED_IRON_OXIDE, YELLOW_IRON_OXIDE, IRON_OXIDE, COBALT_CARBONATE,
            COPPER_CARBONATE, MANGANESE_DIOXIDE, RUTILE, ZIRCOPAX,
            ILMENITE_GRANULAR, MANGANESE_GRANULES, TITANIUM_DIOXIDE,
            IRON_CHROMATE, TIN_OXIDE, LITHIUM_CARBONATE, ZINC_OXIDE,
            WOLLASTONITE
    );

    private RecipeIngredients() {
    }
}