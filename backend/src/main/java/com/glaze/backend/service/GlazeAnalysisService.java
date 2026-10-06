package com.glaze.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.glaze.backend.dto.AnalyzeRequest;
import com.glaze.backend.dto.AnalyzeResponse;
import com.glaze.backend.dto.MaterialInfo;
import com.glaze.backend.service.recipe.GlazeAnalyzer;
import com.glaze.backend.service.recipe.MaterialCatalog;

@Service
public class GlazeAnalysisService {

    public List<MaterialInfo> materials() {
        return MaterialCatalog.all();
    }

    public AnalyzeResponse analyze(AnalyzeRequest request) {
        return GlazeAnalyzer.analyze(request.parts(), request.firingTempC(), request.atmosphere());
    }
}
