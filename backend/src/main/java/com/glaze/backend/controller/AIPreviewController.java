package com.glaze.backend.controller;

import com.glaze.backend.dto.GeminiPreviewRequest;
import com.glaze.backend.dto.GeminiPreviewResponse;
import com.glaze.backend.service.GeminiPreviewService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AIPreviewController {

    private final GeminiPreviewService geminiPreviewService;
    private final ConcurrentHashMap<String, RateWindow> rateLimits = new ConcurrentHashMap<>();

    @Value("${gemini.rate-limit.window-seconds:60}")
    private long rateLimitWindowSeconds;

    @Value("${gemini.rate-limit.max-requests:10}")
    private int rateLimitMaxRequests;

    public AIPreviewController(GeminiPreviewService geminiPreviewService) {
        this.geminiPreviewService = geminiPreviewService;
    }

    @PostMapping("/preview")
    public ResponseEntity<GeminiPreviewResponse> generatePreview(
            @Valid @RequestBody GeminiPreviewRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientKey = resolveClientKey(servletRequest);
        if (!isAllowed(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new GeminiPreviewResponse(
                            "Google Gemini",
                            null,
                            null,
                            "Rate limit exceeded. Please wait and try again."
                    ));
        }

        return ResponseEntity.ok(geminiPreviewService.generatePreview(request));
    }

    private boolean isAllowed(String clientKey) {
        long nowEpoch = Instant.now().getEpochSecond();
        RateWindow window = rateLimits.computeIfAbsent(clientKey, ignored -> new RateWindow(nowEpoch, 0));
        synchronized (window) {
            if (nowEpoch - window.windowStartEpoch() >= Math.max(1, rateLimitWindowSeconds)) {
                window.reset(nowEpoch);
            }

            if (window.count() >= Math.max(1, rateLimitMaxRequests)) {
                return false;
            }

            window.increment();
            return true;
        }
    }

    private String resolveClientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            int comma = forwardedFor.indexOf(',');
            return comma > 0 ? forwardedFor.substring(0, comma).trim() : forwardedFor.trim();
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null || remoteAddr.isBlank() ? "unknown-client" : remoteAddr;
    }

    private static final class RateWindow {
        private long windowStartEpoch;
        private int count;

        private RateWindow(long windowStartEpoch, int count) {
            this.windowStartEpoch = windowStartEpoch;
            this.count = count;
        }

        private long windowStartEpoch() {
            return windowStartEpoch;
        }

        private int count() {
            return count;
        }

        private void reset(long newWindowStart) {
            this.windowStartEpoch = newWindowStart;
            this.count = 0;
        }

        private void increment() {
            this.count++;
        }
    }
}
