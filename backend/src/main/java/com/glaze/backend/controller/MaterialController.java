package com.glaze.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.glaze.backend.dto.MaterialInfo;
import com.glaze.backend.service.GlazeAnalysisService;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final GlazeAnalysisService analysisService;

    public MaterialController(GlazeAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping
    public List<MaterialInfo> list() {
        return analysisService.materials();
    }
}
