package com.glaze.backend.dto;

public record GeminiPreviewResponse(
        String provider,
        String imageDataUrl,
        String prompt,
        String message
) {
}
