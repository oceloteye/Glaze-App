package com.glaze.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.glaze.backend.dto.AnalyzeRequest;
import com.glaze.backend.dto.AnalyzeResponse;
import com.glaze.backend.dto.GenerateRecipesResponse;
import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.dto.RecipePreviewResponse;
import com.glaze.backend.service.GlazeAnalysisService;
import com.glaze.backend.service.GlazeRecipeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final GlazeRecipeService glazeRecipeService;
    private final GlazeAnalysisService analysisService;

    public RecipeController(GlazeRecipeService glazeRecipeService, GlazeAnalysisService analysisService) {
        this.glazeRecipeService = glazeRecipeService;
        this.analysisService = analysisService;
    }

    @PostMapping("/generate")
    public ResponseEntity<GenerateRecipesResponse> generate(@Valid @RequestBody GlazeRequest request) {
        var response = new GenerateRecipesResponse(glazeRecipeService.generateRecipes(request));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/preview")
    public ResponseEntity<RecipePreviewResponse> preview(@Valid @RequestBody GlazeRequest request) {
        return ResponseEntity.ok(glazeRecipeService.previewRecipe(request));
    }

    @PostMapping("/analyze")
    public ResponseEntity<AnalyzeResponse> analyze(@Valid @RequestBody AnalyzeRequest request) {
        return ResponseEntity.ok(analysisService.analyze(request));
    }
}