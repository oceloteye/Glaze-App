# Copilot instructions for Glaze Lab

Glaze Lab is a ceramic glaze recipe generator: a Spring Boot API in `backend/` and a React + Vite + TypeScript client in `frontend/`. It is licensed under AGPL-3.0-or-later; keep that in mind when suggesting third-party code.

## Working in this repo

- Backend: Java 25, Spring Boot, Maven wrapper. Run tests with `./mvnw test` from `backend/` (`.\mvnw.cmd test` on Windows). DTOs are records; services use constructor injection.
- Frontend: run `npx tsc -b`, `npx eslint src` and `npx vitest run` from `frontend/` before finishing a change. Pure logic belongs in `src/lib` with a `*.test.ts` beside it.
- The Vite dev server proxies `/api` to `http://localhost:8080`; the backend only allows CORS from `http://localhost:5173` unless `CORS_ALLOWED_ORIGINS` is set.
- Never commit scratch output (`*-out.txt`, `*.log`) or local tool state (`.azure/`, `.continue/`).

## Domain rules

- Glaze chemistry lives in `backend/src/main/java/com/glaze/backend/service/recipe/`: `MaterialCatalog` (oxide analyses), `HueFamilyRoutes` (colourant systems per hue family × saturation × depth × atmosphere), `RecipeModifier` (finish, melt, opacity, food-safe limits). Changes there need a cited source and a test.
- Food-safe mode caps colourants and reports what it cut in `RecipeSuggestion.foodSafeLimits`; the UI shows it as a badge. Do not re-derive those limits in the frontend.
- All predictions are heuristics. Do not describe output as tested, verified or safe; the README and `NOTICE` carry the disclaimer.
- Keep the public API documented in the README "Backend API" section when request or response shapes change.
