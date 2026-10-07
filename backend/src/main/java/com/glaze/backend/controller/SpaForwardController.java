package com.glaze.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the bundled single-page app for client-side routes (e.g. /generator) so deep links
 * and refreshes don't 404. Paths with a file extension, /api/** and the Vite /assets/** bundle
 * are left alone so they resolve as real resources (or 404) instead of index.html.
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/{path:^(?!api$|assets$)[^\\.]*}", "/{path:^(?!api$|assets$)[^\\.]*}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
