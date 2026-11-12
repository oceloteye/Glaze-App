# Contributing to Glaze Lab

Thanks for your interest. Bug reports, kiln results from real test tiles, chemistry corrections and code are all welcome.

By contributing you agree that your contribution is licensed under the [Apache License 2.0](LICENSE), the same license as the project, and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug** — open an issue using the *Bug report* template. Include the request parameters (hue family, saturation, depth, cone, atmosphere, effects) so it can be reproduced.
- **Report a glaze result** — if you fired a generated recipe, the *Glaze result* template lets you tell us what actually came out of the kiln. Real test-tile data is the most valuable feedback this project can get.
- **Fix chemistry** — material analyses live in `backend/src/main/java/com/glaze/backend/service/recipe/MaterialCatalog.java`; colour routes live in `HueFamilyRoutes.java` beside it. Please cite a source (supplier data sheet, Digitalfire, Glazy, a published text) in the pull request.
- **Improve the code** — see the workflow below.

## Development setup

Prerequisites: JDK 25, Node.js LTS, npm. Maven is provided by the wrapper.

```powershell
# Backend (http://localhost:8080)
Set-Location .\backend
.\mvnw.cmd spring-boot:run

# Frontend (http://localhost:5173, proxies /api to the backend)
Set-Location .\frontend
npm.cmd install
npm.cmd run dev
```

Both commands are shown for PowerShell; on macOS/Linux use `./mvnw`, `npm install` and `npm run dev`.

## Checks to run before opening a pull request

```powershell
# Backend unit + controller tests
Set-Location .\backend
.\mvnw.cmd test

# Frontend typecheck, lint and tests
Set-Location .\frontend
npx.cmd tsc -b
npx.cmd eslint src
npx.cmd vitest run
```

The same checks run in CI (`.github/workflows/ci.yml`) on every pull request and must pass before merge.

## Pull request workflow

1. Fork the repository and create a branch from `main` (`feature/<topic>` or `fix/<topic>`).
2. Keep each pull request focused on one change. Add or update tests alongside the code: backend tests live in `backend/src/test/java`, frontend tests next to the module as `*.test.ts(x)`.
3. If you change the public API (`/api/recipes/*`, `/api/materials`) update the Backend API section of the README.
4. If you change glaze chemistry (material analyses, colourant doses, food-safe limits, firing schedules), explain the reasoning and source in the PR description. Expect a conversation — colour prediction is heuristic and we would rather be consistent than clever.
5. Fill in the pull request template and open the PR against `main`.

## Style

- Java: follow the existing Spring Boot conventions; records for DTOs, constructor injection, no field injection.
- TypeScript/React: the ESLint config is the source of truth. Prefer small components, hooks in `src/hooks`, pure logic in `src/lib` with tests.
- Commit messages: short imperative subject line (e.g. "Flag colourants reduced by food-safe mode"), body optional.

## Questions

Open a *Discussion* or an issue. There is no chat channel yet.
