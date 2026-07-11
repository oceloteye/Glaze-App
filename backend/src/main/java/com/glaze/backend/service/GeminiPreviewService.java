package com.glaze.backend.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.glaze.backend.dto.GeminiPreviewRequest;
import com.glaze.backend.dto.GeminiPreviewResponse;

@Service
public class GeminiPreviewService {

    private static final String PROVIDER = "Google Gemini";
    private static final Pattern INLINE_IMAGE_PATTERN = Pattern.compile(
            "\\\"inlineData\\\"\\s*:\\s*\\{[^}]*?\\\"data\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"",
            Pattern.DOTALL
    );
    private static final Pattern TEXT_PATTERN = Pattern.compile("\\\"text\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");

    private final HttpClient httpClient;
    private final ConcurrentHashMap<String, CachedPreview> cache = new ConcurrentHashMap<>();

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash-preview-image-generation}")
    private String model;

    @Value("${gemini.cache-ttl-seconds:300}")
    private long cacheTtlSeconds;

    public GeminiPreviewService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public GeminiPreviewResponse generatePreview(GeminiPreviewRequest request) {
        String cacheKey = buildCacheKey(request);
        CachedPreview cached = cache.get(cacheKey);
        Instant now = Instant.now();
        if (cached != null && cached.expiresAt().isAfter(now)) {
            return withCachedSuffix(cached.response());
        }

        String prompt = buildPrompt(request);

        if (apiKey == null || apiKey.isBlank()) {
                GeminiPreviewResponse generated = new GeminiPreviewResponse(
                    PROVIDER,
                    null,
                    prompt,
                    "Gemini API key is not configured on the backend. Set gemini.api-key or GEMINI_API_KEY."
            );
                cache.put(cacheKey, new CachedPreview(generated, now.plusSeconds(Math.max(10, cacheTtlSeconds))));
                return generated;
        }

        try {
            String payload = buildPayload(prompt);

            String endpoint = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                    URLEncoder.encode(model, StandardCharsets.UTF_8),
                    URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
            );

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(40))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                GeminiPreviewResponse failed = new GeminiPreviewResponse(
                        PROVIDER,
                        null,
                        prompt,
                        "Gemini request failed with status " + response.statusCode() + "."
                );
                cache.put(cacheKey, new CachedPreview(failed, now.plusSeconds(Math.max(10, cacheTtlSeconds))));
                return failed;
            }

            String imageData = findInlineImageData(response.body());
            if (imageData != null && !imageData.isBlank()) {
                GeminiPreviewResponse success = new GeminiPreviewResponse(
                        PROVIDER,
                        "data:image/png;base64," + imageData,
                        prompt,
                        "Gemini image generated successfully."
                );
                cache.put(cacheKey, new CachedPreview(success, now.plusSeconds(Math.max(10, cacheTtlSeconds))));
                return success;
            }

                String textMessage = findTextResponse(response.body());
            GeminiPreviewResponse noImage = new GeminiPreviewResponse(
                    PROVIDER,
                    null,
                    prompt,
                    textMessage != null && !textMessage.isBlank()
                            ? textMessage
                            : "Gemini returned no image for this request."
            );
            cache.put(cacheKey, new CachedPreview(noImage, now.plusSeconds(Math.max(10, cacheTtlSeconds))));
            return noImage;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            GeminiPreviewResponse errored = new GeminiPreviewResponse(
                    PROVIDER,
                    null,
                    prompt,
                    "Gemini preview failed: " + ex.getMessage()
            );
            cache.put(cacheKey, new CachedPreview(errored, now.plusSeconds(Math.max(10, cacheTtlSeconds))));
            return errored;
        }
    }

    private GeminiPreviewResponse withCachedSuffix(GeminiPreviewResponse response) {
        String message = response.message() == null || response.message().isBlank()
                ? "Served from cache."
                : response.message() + " (cached)";
        return new GeminiPreviewResponse(response.provider(), response.imageDataUrl(), response.prompt(), message);
    }

    private String buildCacheKey(GeminiPreviewRequest request) {
        return String.join("|",
                normalize(request.baseColorHex()),
                normalize(request.secondaryColorHex()),
                normalize(request.surfaceFinish()),
                normalize(request.effect()),
                normalize(request.clayBody()),
                normalize(request.lighting()),
                normalize(request.selectedRecipeName()),
                normalize(request.selectedRecipeFiringRange()),
                normalize(request.selectedRecipeRationale()),
                normalize(formatIngredientsForPrompt(request.selectedRecipeIngredients())),
                normalize(request.confidence()),
                normalize(model)
        );
    }

    private String normalize(String value) {
        return Objects.toString(value, "").trim().toLowerCase(Locale.ROOT);
    }

    private record CachedPreview(GeminiPreviewResponse response, Instant expiresAt) {
    }

    private String buildPayload(String prompt) {
        String escapedPrompt = escapeJson(prompt);
        return "{" +
                "\"contents\":[{\"parts\":[{\"text\":\"" + escapedPrompt + "\"}]}]," +
                "\"generationConfig\":{\"responseModalities\":[\"IMAGE\",\"TEXT\"]}" +
                "}";
    }

    private String findInlineImageData(String body) {
        Matcher matcher = INLINE_IMAGE_PATTERN.matcher(body);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group(1);
    }

    private String findTextResponse(String body) {
        Matcher matcher = TEXT_PATTERN.matcher(body);
        if (!matcher.find()) {
            return null;
        }
        return unescapeJson(matcher.group(1));
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String unescapeJson(String value) {
        return value
                .replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\t", "\t")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    private String buildPrompt(GeminiPreviewRequest request) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Create a realistic close-up image of a ceramic glaze test tile. ");
        prompt.append("Primary glaze color: ").append(request.baseColorHex()).append(". ");
        if (request.secondaryColorHex() != null && !request.secondaryColorHex().isBlank()) {
            prompt.append("Secondary glaze color accents: ").append(request.secondaryColorHex()).append(". ");
        }
        prompt.append("Surface finish: ").append(request.surfaceFinish()).append(". ");
        prompt.append("Effect style: ").append(request.effect()).append(". ");
        prompt.append("Clay body: ").append(request.clayBody()).append(". ");
        prompt.append("Lighting condition: ").append(request.lighting()).append(". ");
        if (request.selectedRecipeName() != null && !request.selectedRecipeName().isBlank()) {
            prompt.append("Selected recipe name: ").append(request.selectedRecipeName()).append(". ");
        }
        if (request.selectedRecipeFiringRange() != null && !request.selectedRecipeFiringRange().isBlank()) {
            prompt.append("Recipe firing range: ").append(request.selectedRecipeFiringRange()).append(". ");
        }
        String ingredientsSummary = formatIngredientsForPrompt(request.selectedRecipeIngredients());
        if (!ingredientsSummary.isBlank()) {
            prompt.append("Use this selected recipe ingredient composition (percent by weight) as primary guidance: ")
                    .append(ingredientsSummary)
                    .append(". ");
        }
        if (request.selectedRecipeRationale() != null && !request.selectedRecipeRationale().isBlank()) {
            prompt.append("Recipe rationale: ").append(request.selectedRecipeRationale()).append(". ");
        }
        if (request.confidence() != null && !request.confidence().isBlank()) {
            prompt.append("Prediction confidence hint: ").append(request.confidence()).append(". ");
        }
        prompt.append("Single tile only, neutral background, photorealistic, no text overlay.");
        return prompt.toString();
    }

    private String formatIngredientsForPrompt(Map<String, Double> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return "";
        }

        return ingredients.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(12)
                .map(entry -> entry.getKey() + " " + String.format(Locale.ROOT, "%.2f", entry.getValue()) + "%")
                .collect(Collectors.joining(", "));
    }
}
