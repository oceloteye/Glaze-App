package com.glaze.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the bundled single-page app for client-side routes (e.g. /generator) so deep links
 * and refreshes don't 404. Paths with a file extension and /api/** are left alone.
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/{path:^(?!api$)[^\\.]*}", "/{path:^(?!api$)[^\\.]*}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
