package com.glaze.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SpaForwardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void clientRouteForwardsToIndex() throws Exception {
        mockMvc.perform(get("/generator"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void nestedClientRouteForwardsToIndex() throws Exception {
        mockMvc.perform(get("/generator/some/deep/link"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void apiRoutesAreNotForwarded() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void pathsWithExtensionsAreNotForwarded() throws Exception {
        mockMvc.perform(get("/missing-asset.js"))
                .andExpect(status().isNotFound());
    }
}
