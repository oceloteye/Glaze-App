package com.glaze.backend.controller;

import com.glaze.backend.dto.GenerateRecipesResponse;
import com.glaze.backend.dto.GlazeRequest;
import com.glaze.backend.service.GlazeRecipeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final GlazeRecipeService glazeRecipeService;

    public RecipeController(GlazeRecipeService glazeRecipeService) {
        this.glazeRecipeService = glazeRecipeService;
    }

    @PostMapping("/generate")
    public ResponseEntity<GenerateRecipesResponse> generate(@Valid @RequestBody GlazeRequest request) {
        var response = new GenerateRecipesResponse(glazeRecipeService.generateRecipes(request));
        return ResponseEntity.ok(response);
    }
}