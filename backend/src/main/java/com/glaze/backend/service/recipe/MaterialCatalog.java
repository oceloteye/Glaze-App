package com.glaze.backend.service.recipe;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.glaze.backend.dto.MaterialInfo;

import static com.glaze.backend.service.recipe.RecipeIngredients.*;
import static com.glaze.backend.service.recipe.UmfCalculator.*;

/** The materials the app knows about: typical oxide analyses plus handling and food-safety notes. */
public final class MaterialCatalog {

    public static final String FELDSPARS_AND_FRITS = "Feldspars & frits";
    public static final String FLUXES = "Fluxes";
    public static final String CLAYS_AND_STABILIZERS = "Clays & stabilizers";
    public static final String GLASS_FORMERS = "Glass formers";
    public static final String OPACIFIERS = "Opacifiers";
    public static final String COLORANTS = "Colorants";

    private static final String MANGANESE_HAZARD =
            "Manganese dust and kiln fumes are neurotoxic with repeated exposure. Wear a respirator when weighing and ventilate the kiln.";
    private static final String MANGANESE_FOOD =
            "Manganese can leach from food surfaces at higher additions; keep liner glazes below roughly 3–4%.";
    private static final String COBALT_HAZARD =
            "Cobalt compounds are toxic and skin-sensitising. Avoid dust and skin contact.";
    private static final String COBALT_FOOD =
            "Stable at small additions in a balanced, fully melted glaze; avoid heavy saturation on food surfaces.";
    private static final String COPPER_HAZARD =
            "Copper compounds irritate skin, eyes and lungs as dust.";
    private static final String COPPER_FOOD =
            "Copper leaches readily from soft, fluid or underfired glazes, especially with acidic foods. Keep it under ~2–3% on liner glazes.";
    private static final String CHROME_HAZARD =
            "Chromium compounds are toxic and suspected carcinogens as dust; wear a respirator and gloves. Chrome fumes can flash pink onto nearby tin glazes.";
    private static final String CHROME_FOOD =
            "Fairly stable once fully melted, but avoid high chrome on food surfaces.";

    private static final List<MaterialInfo> MATERIALS = List.of(
            // ── Feldspars & frits ───────────────────────────────────────────────
            material(POTASH_FELDSPAR, FELDSPARS_AND_FRITS, "Primary flux / glass former",
                    "Brings potassium, alumina and silica in one mineral. Melts at stoneware temperatures and gives a stiff, durable glass that keeps colours bright.",
                    Map.of(SIO2, 68.5, AL2O3, 17.0, K2O, 10.0, NA2O, 3.0, CAO, 0.3), null, null, 80),
            material(CUSTER_FELDSPAR, FELDSPARS_AND_FRITS, "Primary flux / glass former",
                    "A widely used North American potash feldspar; a little more alumina and sodium than the generic analysis, otherwise interchangeable.",
                    Map.of(SIO2, 68.5, AL2O3, 17.4, K2O, 10.0, NA2O, 3.0, CAO, 0.3, FE2O3, 0.1), null, null, 80),
            material(SODA_FELDSPAR, FELDSPARS_AND_FRITS, "Primary flux / glass former",
                    "Sodium-based feldspar: a slightly more fluid, glossier melt with higher thermal expansion. Warms copper toward turquoise.",
                    Map.of(SIO2, 68.0, AL2O3, 19.0, NA2O, 7.0, K2O, 4.0, CAO, 1.5), null, null, 80),
            material(NEPHELINE_SYENITE, FELDSPARS_AND_FRITS, "Strong alkaline flux",
                    "A low-silica feldspathic rock with more sodium and potassium than feldspar. Melts earlier, brightens alkaline colours and raises expansion.",
                    Map.of(SIO2, 60.7, AL2O3, 23.3, NA2O, 9.8, K2O, 4.6, CAO, 0.7), null, null, 80),
            material(FERRO_FRIT_3134, FELDSPARS_AND_FRITS, "Low-temperature flux",
                    "Pre-melted calcium-boron-sodium glass with no alumina. Melts early and evenly, adds gloss and clarity, and carries low- and mid-fire glazes.",
                    Map.of(SIO2, 46.5, B2O3, 23.1, CAO, 20.1, NA2O, 10.3), null, null, 80),
            material(FERRO_FRIT_3124, FELDSPARS_AND_FRITS, "Low-temperature flux",
                    "A boron frit that also carries alumina, so it makes a more complete glaze on its own than Frit 3134 and is less prone to running.",
                    Map.of(SIO2, 55.3, AL2O3, 9.9, B2O3, 13.7, CAO, 14.1, NA2O, 6.3, K2O, 0.7), null, null, 80),

            // ── Fluxes ─────────────────────────────────────────────────────────
            material(WHITING, FLUXES, "Calcium flux",
                    "Calcium carbonate. Inactive at low fire but a powerful flux above cone 4; increases hardness and durability and gives matte surfaces in excess.",
                    Map.of(CAO, 56.0), null, null, 30),
            material(WOLLASTONITE, FLUXES, "Calcium flux / silica source",
                    "Calcium silicate. Adds calcium without releasing carbon dioxide, so it reduces pinholes while contributing silica.",
                    Map.of(CAO, 47.5, SIO2, 51.0), null, null, 30),
            material(DOLOMITE, FLUXES, "Calcium + magnesium flux",
                    "Supplies both calcium and magnesium. Magnesium gives a buttery, satin-to-matte surface and softens colours toward pastels.",
                    Map.of(CAO, 30.4, MGO, 21.7), null, null, 30),
            material(TALC, FLUXES, "Magnesium flux / silica source",
                    "Magnesium silicate. Lowers expansion, promotes buttery satin-matte surfaces at cone 6+ and is a body flux at low fire.",
                    Map.of(SIO2, 63.4, MGO, 31.9),
                    "Use ceramic-grade talc; some historic talc deposits contained asbestos. Avoid breathing the dust.", null, 40),
            material(GERSTLEY_BORATE, FLUXES, "Boron flux",
                    "A natural calcium-boron mineral. Melts very early and gives fluid, glossy, often milky-blue surfaces, but is variable and partly soluble so it gels in the bucket.",
                    Map.of(SIO2, 14.7, B2O3, 26.8, CAO, 19.4, NA2O, 4.0, MGO, 3.5, AL2O3, 1.0, FE2O3, 0.4), null, null, 50),
            material(ZINC_OXIDE, FLUXES, "Flux / crystal former",
                    "An active mid- and high-fire flux that brightens colours and increases gloss. High levels grow zinc-silicate crystals on a slow cool.",
                    Map.of(ZNO, 100.0),
                    "Zinc fumes from the kiln can cause metal-fume fever; ventilate.",
                    "Zinc leaches mildly from matte or underfired glazes; fine in a balanced glossy glaze.", 20),
            material(LITHIUM_CARBONATE, FLUXES, "Powerful alkaline flux",
                    "A strong low-expansion flux that lowers the melting point, increases fluidity and gloss, and brightens copper blues.",
                    Map.of(LI2O, 40.4),
                    "Harmful if swallowed and irritating to skin and eyes; slightly soluble, so it migrates as the glaze dries.",
                    "Lithium leaches from alkaline glazes that are short on silica and alumina.", 10),
            material(SPODUMENE, FLUXES, "Lithium feldspar",
                    "A lithium aluminium silicate that brings lithium in an insoluble form, lowering expansion and the melting point without the handling issues of the carbonate.",
                    Map.of(SIO2, 64.5, AL2O3, 27.4, LI2O, 7.6), null, null, 40),
            material(STRONTIUM_CARBONATE, FLUXES, "Alkaline-earth flux",
                    "Behaves like a stronger whiting and is the usual non-toxic stand-in for barium: satin to matte surfaces and good colour response.",
                    Map.of(SRO, 70.2), null, null, 20),
            material(BARIUM_CARBONATE, FLUXES, "Alkaline-earth flux (toxic)",
                    "Produces distinctive silky barium mattes and vivid blues and greens with copper and cobalt, but barium is toxic and can leach.",
                    Map.of(BAO, 77.7),
                    "Toxic if swallowed or inhaled (a soluble barium salt). Wear gloves and a respirator and keep it away from food preparation areas.",
                    "Barium leaches from matte, underfired or high-barium glazes. Not recommended for food surfaces.", 30),
            material(BONE_ASH, FLUXES, "Phosphate opalescence",
                    "Calcium phosphate. Small amounts give opalescent blue-white chun effects and encourage the glaze to bubble and vary; larger amounts opacify and stiffen.",
                    Map.of(CAO, 55.8, P2O5, 42.4), null, null, 15),

            // ── Clays & stabilizers ────────────────────────────────────────────
            material(EPK_KAOLIN, CLAYS_AND_STABILIZERS, "Alumina source / suspension",
                    "Pure clay that supplies alumina for stiffness and durability, keeps the raw glaze suspended, and helps it adhere to the pot before firing.",
                    Map.of(SIO2, 45.7, AL2O3, 37.4, TIO2, 0.4, FE2O3, 0.8), null, null, 40),
            material(BALL_CLAY, CLAYS_AND_STABILIZERS, "Alumina source / suspension",
                    "A plastic secondary clay with more silica and iron than kaolin. Excellent suspension, slightly warmer colour, higher drying shrinkage.",
                    Map.of(SIO2, 60.0, AL2O3, 26.0, TIO2, 1.5, FE2O3, 1.0, K2O, 0.9, NA2O, 0.3, MGO, 0.3, CAO, 0.2), null, null, 40),
            material(BENTONITE, CLAYS_AND_STABILIZERS, "Suspension agent",
                    "Highly plastic clay used at 1–3% to keep the glaze from settling and to toughen the dry coat. More than that slows drying and cracks.",
                    Map.of(SIO2, 60.0, AL2O3, 20.0, FE2O3, 3.5, MGO, 2.5, NA2O, 2.5, CAO, 0.7), null, null, 5),

            // ── Glass formers ──────────────────────────────────────────────────
            material(SILICA, GLASS_FORMERS, "Glass former",
                    "The backbone of the glass. More silica gives a harder, more durable, more acid-resistant surface and raises the melting point.",
                    Map.of(SIO2, 100.0), null, null, 50),

            // ── Opacifiers ─────────────────────────────────────────────────────
            material(ZIRCOPAX, OPACIFIERS, "Opacifier",
                    "Zirconium silicate. Whitens and opacifies without affecting the melt much; also stiffens the glaze and makes colours more pastel.",
                    Map.of(ZRO2, 67.2, SIO2, 32.8), null, null, 15),
            material(TIN_OXIDE, OPACIFIERS, "Opacifier",
                    "A soft, creamy white opacifier. Softer looking than Zircopax and reacts with chrome to make pinks.",
                    Map.of(SNO2, 100.0), null, null, 10),
            material(TITANIUM_DIOXIDE, OPACIFIERS, "Opacifier / crystal seeding",
                    "Pure titania. Seeds micro-crystals for satin or matte surfaces and colour variegation, and adds a soft opacity.",
                    Map.of(TIO2, 100.0), null, null, 10),
            material(RUTILE, OPACIFIERS, "Variegation / colour modifier",
                    "Impure titanium dioxide with iron. Creates streaks, mottling and crystalline variegation; tans, creams and blues depending on the base and cooling.",
                    Map.of(TIO2, 93.0, FE2O3, 3.0), null, null, 10),

            // ── Colorants ──────────────────────────────────────────────────────
            material(RED_IRON_OXIDE, COLORANTS, "Colorant",
                    "The most common iron colorant. Amber and honey in oxidation, celadon greens and tenmoku blacks in reduction; also a flux.",
                    Map.of(FE2O3, 100.0), null, null, 12),
            material(YELLOW_IRON_OXIDE, COLORANTS, "Colorant",
                    "Fine iron hydroxide that disperses evenly for smooth tans and yellows; slightly weaker than red iron by weight.",
                    Map.of(FE2O3, 89.9), null, null, 12),
            material(IRON_OXIDE, COLORANTS, "Colorant",
                    "Iron in general. Warm browns and ambers in oxidation, greens and blacks in reduction; increases fluidity of the melt.",
                    Map.of(FE2O3, 100.0), null, null, 12),
            material(COBALT_CARBONATE, COLORANTS, "Colorant",
                    "The strongest blue colorant; a fraction of a percent gives a clear blue. Shifts toward purple with manganese and softens with magnesium.",
                    Map.of(COO, 63.0), COBALT_HAZARD, COBALT_FOOD, 4),
            material(COBALT_OXIDE, COLORANTS, "Colorant",
                    "Concentrated cobalt — about 1.5× the strength of the carbonate, so it needs very thorough mixing to avoid specks.",
                    Map.of(COO, 93.0), COBALT_HAZARD, COBALT_FOOD, 3),
            material(COPPER_CARBONATE, COLORANTS, "Colorant",
                    "Greens in oxidation, turquoise in alkaline bases, reds in reduction. Also a flux; higher amounts make the glaze fluid and can go metallic.",
                    Map.of(CUO, 71.9), COPPER_HAZARD, COPPER_FOOD, 8),
            material(COPPER_OXIDE, COLORANTS, "Colorant",
                    "Black copper oxide: the same colours as the carbonate at roughly 70% of the weight, with a coarser, speckier dispersion.",
                    Map.of(CUO, 100.0), COPPER_HAZARD, COPPER_FOOD, 6),
            material(MANGANESE_DIOXIDE, COLORANTS, "Colorant",
                    "Browns and purples, especially with cobalt in alkaline bases. Metallic surfaces at high amounts. Also a flux.",
                    Map.of(MNO, 81.6), MANGANESE_HAZARD, MANGANESE_FOOD, 8),
            material(MANGANESE_GRANULES, COLORANTS, "Speckle agent",
                    "Coarse manganese that melts into dark specks in the glaze surface rather than dissolving evenly.",
                    Map.of(MNO, 81.6), MANGANESE_HAZARD, MANGANESE_FOOD, 5),
            material(ILMENITE_GRANULAR, COLORANTS, "Speckle agent",
                    "Coarse iron-titanium ore that produces dark, slightly metallic specks scattered through the glaze.",
                    Map.of(TIO2, 52.7, FE2O3, 47.3), null, null, 5),
            material(IRON_CHROMATE, COLORANTS, "Colorant",
                    "Iron and chrome together. Greys, browns and black; with tin it can shift toward pink-brown.",
                    Map.of(CR2O3, 68.0, FE2O3, 32.0), CHROME_HAZARD, CHROME_FOOD, 5),
            material(CHROME_OXIDE, COLORANTS, "Colorant",
                    "Opaque greens even at 1–2%; pinks with tin, browns with zinc. Refractory, so it stiffens the melt.",
                    Map.of(CR2O3, 100.0), CHROME_HAZARD, CHROME_FOOD, 5),
            material(NICKEL_OXIDE, COLORANTS, "Colorant",
                    "Greys, greens and browns; pinks and blues with high zinc or barium. Strong and unpredictable, so small amounts.",
                    Map.of(NIO, 100.0),
                    "Nickel compounds are carcinogenic as dust and strong skin sensitisers. Wear a respirator and gloves.",
                    "Nickel can leach and trigger allergic reactions; avoid on food surfaces.", 5));

    private static final Map<String, MaterialInfo> BY_NAME;
    private static final Map<String, Map<String, Double>> ANALYSES;

    static {
        var byName = new LinkedHashMap<String, MaterialInfo>();
        var analyses = new LinkedHashMap<String, Map<String, Double>>();
        for (MaterialInfo m : MATERIALS) {
            byName.put(m.name(), m);
            analyses.put(m.name(), m.analysis());
        }
        BY_NAME = Map.copyOf(byName);
        ANALYSES = Map.copyOf(analyses);
    }

    private MaterialCatalog() {
    }

    public static List<MaterialInfo> all() {
        return MATERIALS;
    }

    public static Optional<MaterialInfo> find(String name) {
        return Optional.ofNullable(BY_NAME.get(name));
    }

    /** Oxide weight % for a material, or null when unknown. */
    static Map<String, Double> analysis(String name) {
        return ANALYSES.get(name);
    }

    private static MaterialInfo material(String name, String category, String role, String description,
                                         Map<String, Double> analysis, String hazard, String foodSafety, int maxParts) {
        return new MaterialInfo(name, category, role, description, analysis, hazard, foodSafety, maxParts);
    }
}
