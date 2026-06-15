package com.glaze.backend.controller;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.glaze.backend.dto.GlazeRequest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class RecipeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String URL = "/api/recipes/generate";

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test
    void validRequestReturns200WithThreeRecipes() throws Exception {
        var req = new GlazeRequest("#3a6bc1", 1220, "Satin", "Medium", List.of(), 50, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipes", hasSize(3)));
    }

    @Test
    void responseContainsRecipeFields() throws Exception {
        var req = new GlazeRequest("#00aa00", 1180, "Glossy", "High", List.of("Speckled"), 100, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipes[0].name").isString())
                .andExpect(jsonPath("$.recipes[0].firingRange").isString())
                .andExpect(jsonPath("$.recipes[0].ingredients").isMap())
                .andExpect(jsonPath("$.recipes[0].rationale").isString());
    }

    @Test
    void lowFireRequestSelectsLowFireRange() throws Exception {
        var req = new GlazeRequest("#ffffff", 900, "Matte", "Low", List.of(), 50, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipes[0].firingRange").value(org.hamcrest.Matchers.containsString("fire")));
    }

    @Test
    void requestWithSecondaryColorReturns200() throws Exception {
        var req = new GlazeRequest("#0000cc", 1220, "Satin", "Medium",
                List.of("Speckled"), 75, "#cc0000", null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipes", hasSize(3)));
    }

    @Test
    void maxIntensityReturns200() throws Exception {
        var req = new GlazeRequest("#ffffff", 1280, "Glossy", "Medium",
                List.of("Crystalline"), 200, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    // ── Validation rejections ─────────────────────────────────────────────────

    @Test
    void missingColorReturns400() throws Exception {
        String body = """
                {"firingTempC":1220,"surfaceFinish":"Satin","stability":"Medium","effects":[]}
                """;

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingFiringTempReturns400() throws Exception {
        String body = """
                {"color":"#ffffff","surfaceFinish":"Satin","stability":"Medium","effects":[]}
                """;

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void temperatureBelowMinReturns400() throws Exception {
        var req = new GlazeRequest("#ffffff", 100, "Satin", "Medium", List.of(), 50, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void temperatureAboveMaxReturns400() throws Exception {
        var req = new GlazeRequest("#ffffff", 1500, "Satin", "Medium", List.of(), 50, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void intensityAbove200Returns400() throws Exception {
        var req = new GlazeRequest("#ffffff", 1220, "Satin", "Medium", List.of(), 201, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void intensityBelowZeroReturns400() throws Exception {
        var req = new GlazeRequest("#ffffff", 1220, "Satin", "Medium", List.of(), -1, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void blankSurfaceFinishReturns400() throws Exception {
        var req = new GlazeRequest("#ffffff", 1220, "", "Medium", List.of(), 50, null, null);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingEffectsListReturns400() throws Exception {
        String body = """
                {"color":"#ffffff","firingTempC":1220,"surfaceFinish":"Satin","stability":"Medium"}
                """;

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
