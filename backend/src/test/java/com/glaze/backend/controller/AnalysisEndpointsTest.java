package com.glaze.backend.controller;

import java.util.Map;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.glaze.backend.dto.AnalyzeRequest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class AnalysisEndpointsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void materialsEndpointListsCatalog() throws Exception {
        mockMvc.perform(get("/api/materials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(30))))
                .andExpect(jsonPath("$[0].name").isString())
                .andExpect(jsonPath("$[0].category").isString())
                .andExpect(jsonPath("$[0].analysis").isMap())
                .andExpect(jsonPath("$[0].maxParts").isNumber());
    }

    @Test
    void analyzeReturnsRecipeUmfPropertiesAndWarnings() throws Exception {
        var req = new AnalyzeRequest(Map.of("Potash Feldspar", 40.0, "Whiting", 20.0, "EPK Kaolin", 15.0, "Silica", 25.0), 1222, "oxidation");

        mockMvc.perform(post("/api/recipes/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cone").value("6"))
                .andExpect(jsonPath("$.normalizedRecipe.Silica").value(25.0))
                .andExpect(jsonPath("$.umf.fluxes.CaO").isNumber())
                .andExpect(jsonPath("$.properties.meltLabel").isString())
                .andExpect(jsonPath("$.properties.expansion").isNumber())
                .andExpect(jsonPath("$.warnings").isArray())
                .andExpect(jsonPath("$.warnings[0].severity").isString());
    }

    @Test
    void analyzeRejectsEmptyRecipe() throws Exception {
        mockMvc.perform(post("/api/recipes/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"parts\":{},\"firingTempC\":1222}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void analyzeRejectsMissingTemperature() throws Exception {
        mockMvc.perform(post("/api/recipes/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"parts\":{\"Silica\":100}}"))
                .andExpect(status().isBadRequest());
    }
}
