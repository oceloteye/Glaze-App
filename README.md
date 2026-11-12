# Glaze Lab

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/oceloteye/Glaze-App/actions/workflows/ci.yml/badge.svg)](https://github.com/oceloteye/Glaze-App/actions/workflows/ci.yml)

Full-stack web app of ceramic glaze tools. The **Recipe Generator** drafts candidate glaze recipes from user-selected parameters, and the **Recipe Builder** lets you assemble a recipe from raw materials with sliders and see the predicted result, chemistry and safety notes update live.

> **Safety notice.** Every recipe, colour prediction, UMF value and "food-safe" indication produced by this software is a calculated starting point, not a tested result. Glazes must be fired on test tiles in your own kiln, and anything intended for food or drink surfaces must be leach-tested before use. Many glaze materials are hazardous to handle — read the supplier safety data sheets and use dust and skin protection. See [NOTICE](NOTICE).

## Tech Stack

- Backend: Java Spring Boot (Maven)
- Frontend: React + Vite + TypeScript

## Project Structure

- `backend/`: Spring Boot API
- `frontend/`: React web client

## Features

- Parameter form for:
  - Colour palette: pick a hue family (celadon, tenmoku, cobalt blue, chrome-tin wine, …) and tune it with **saturation** (muted → pure) and **depth** (light → deep) sliders; a swatch shows the colour the chemistry is predicted to give. Families that need an inclusion stain (bright red, orange, yellow, magenta) are shown greyed out until stain support lands
  - Firing temperature (°C / cone)
  - Surface finish (Matte / Satin / Glossy)
  - Melt / stability (Stiff / Balanced / Fluid)
  - Opacity (Translucent / Semi-opaque / Opaque)
  - Feldspar source, color character, kiln atmosphere, food-safe mode
  - Optional colour/texture effect (Speckled, Crystalline, Variegated, Flame) with intensity and secondary colour
- API endpoint to generate recipe candidates
- Ingredient percentages normalized to 100%
- Rationale, UMF analysis and firing schedules for each generated recipe
- Food-safe mode caps leach-prone colourants and flags each ingredient it reduced on the recipe card
- Recipe Builder: pick from 38 catalogued materials, set amounts in parts with sliders or number inputs (auto-normalised to 100%), choose cone and atmosphere, and get a live predicted tile, property meters (melt, gloss, opacity, durability, thermal expansion), the unity molecular formula and grouped notes covering melt/maturity, glaze fit, application defects, food safety and handling/toxicity
- Responsive UI for desktop and mobile
- Pages: Home (`/`), Recipe Generator (`/generator`) and Recipe Builder (`/builder`), with client-side routing; the backend forwards unknown non-API paths to `index.html` so deep links work

## Backend API

Endpoints:

- `POST /api/recipes/generate` — draft recipes from target parameters
- `POST /api/recipes/preview` — the lead recipe's ingredients and colour route for the same parameters (used for the live swatch)
- `GET /api/materials` — the material catalogue used by the Recipe Builder
- `POST /api/recipes/analyze` — analyse a user-built recipe
- `GET /api/health` — liveness check

### `POST /api/recipes/generate`

Sample request body (`opacity`, `intensity`, `secondaryColor`, `feldsparSubstitute`, `colorCharacter`, `atmosphere`, `foodSafe`, `hueFamily`, `saturation` and `depth` are optional):

```json
{
  "color": "#7f9e87",
  "hueFamily": "green",
  "saturation": 40,
  "depth": 50,
  "firingTempC": 1222,
  "surfaceFinish": "Satin",
  "stability": "Low",
  "opacity": "Opaque",
  "effects": ["Variegated"],
  "intensity": 50,
  "atmosphere": "Oxidation",
  "foodSafe": true
}
```

`stability` accepts `High` / `Medium` / `Low` (shown in the UI as Stiff / Balanced / Fluid). When `hueFamily` is present it selects the colourant system directly and `saturation` / `depth` (0–100, default 50) position the colour within that family; otherwise the colourant system is inferred from the hex `color`.

Sample response shape:

```json
{
  "recipes": [
    {
      "name": "Satin Cone 6-7 — Balanced",
      "firingRange": "Mid–high fire (cone 6–7)",
      "ingredients": {
        "Potash Feldspar": 28.4,
        "Silica": 22.1,
        "Zircopax": 3.9
      },
      "rationale": "High-fire Potash Feldspar base — silica and kaolin provide the glass network. Balanced flux-silica-alumina ratio for reliable results across a range of kilns. Fluid melt target: Lithium Carbonate and Wollastonite raise flux activity so the glaze moves and pools. Zircopax and Tin Oxide opacify the glaze to a dense, covering surface.",
      "umf": { "...": "unity molecular formula analysis" },
      "firingSchedules": [{ "...": "segments for very short / short / standard / slow schedules" }],
      "foodSafeLimits": { "Copper Carbonate": 0.45 }
    }
  ]
}
```

`foodSafeLimits` lists colourants that food-safe mode scaled back, mapped to the fraction of the requested dose that was kept. It is empty when `foodSafe` is false or nothing was reduced.

### `POST /api/recipes/preview`

Takes the same body as `/generate` and returns only the lead recipe's normalised ingredients plus the colour route that produced them:

```json
{
  "ingredients": { "Potash Feldspar": 30.1, "Silica": 24.0, "Cobalt Carbonate": 0.6 },
  "route": { "name": "Cobalt", "summary": "...", "signature": ["Cobalt Carbonate"] }
}
```

### `GET /api/materials`

Returns the material catalogue as a list of `{ name, category, role, description, analysis, hazard, foodSafety, maxParts }` objects, where `analysis` is the oxide weight-fraction analysis used for UMF calculations.

### `POST /api/recipes/analyze`

Sample request body (`parts` are relative amounts and are normalised to 100%; `atmosphere` is optional, `oxidation` or `reduction`):

```json
{
  "parts": { "Potash Feldspar": 40, "Whiting": 20, "EPK Kaolin": 15, "Silica": 25 },
  "firingTempC": 1222,
  "atmosphere": "oxidation"
}
```

Sample response shape:

```json
{
  "normalizedRecipe": { "Potash Feldspar": 40.0, "Whiting": 20.0, "EPK Kaolin": 15.0, "Silica": 25.0 },
  "totalParts": 100.0,
  "cone": "Cone 6",
  "umf": { "...": "unity molecular formula analysis" },
  "properties": {
    "melt": 0.62, "meltLabel": "Balanced",
    "gloss": 0.75, "surface": "Glossy",
    "opacity": 0.11, "opacityLabel": "Translucent",
    "durability": 0.94, "durabilityLabel": "Hard & durable",
    "expansion": 63.7, "expansionLabel": "Moderate (fits most stoneware)"
  },
  "warnings": [
    { "severity": "info", "category": "fit", "title": "Expansion looks workable", "message": "..." },
    { "severity": "info", "category": "toxicity", "title": "Dust precautions", "message": "..." }
  ]
}
```

`severity` is `info` / `caution` / `danger`; `category` is `maturity`, `fit`, `application`, `food-safety` or `toxicity`.

## Run Locally

Open two terminals from the workspace root.

### 1) Start backend

```powershell
Set-Location .\backend
.\mvnw.cmd spring-boot:run
```

Backend runs at `http://localhost:8080`.

### 2) Start frontend

```powershell
Set-Location .\frontend
npm.cmd install
npm.cmd run dev
```

Frontend runs at `http://localhost:5173`.

## Build Checks

Backend:

```powershell
Set-Location .\backend
.\mvnw.cmd test
```

Frontend:

```powershell
Set-Location .\frontend
npm.cmd run build
npx.cmd vitest run
```

The same checks run on every pull request via `.github/workflows/ci.yml`.

## Deploy

### Single container

The root `Dockerfile` builds the React app and bundles it into the Spring Boot jar, so one container serves both the UI at `/` and the API at `/api/*`. Same origin means no CORS or cross-service networking is needed.

Build and run locally with Docker:

```powershell
docker build -t glaze-app .
docker run --rm -p 8080:8080 glaze-app
```

Open `http://localhost:8080`. The app honours a `PORT` environment variable (defaults to 8080) and exposes `GET /api/health` for liveness checks.

### Google Cloud Run — connected GitHub repo (primary)

Cloud Run builds and deploys the root `Dockerfile` on every push to `main` via a Cloud Build trigger. No GitHub secrets or workflow configuration are needed.

1. In the Cloud Run console choose **Create service → Continuously deploy from a repository**, then **Set up with Cloud Build**.
2. Authenticate GitHub, install the Cloud Build GitHub app on this repo and select it.
3. Branch `^main$`, build type **Dockerfile**, source location `/Dockerfile`.
4. Service settings: allow unauthenticated invocations; container port `8080`; memory `512 MiB`; 1 vCPU with **CPU boost** enabled; min instances `0`, max instances `2`; environment variable `JAVA_OPTS` = `-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1`.
5. Create. The first build takes several minutes (Maven and npm dependencies are downloaded in Cloud Build); subsequent pushes redeploy automatically.

Cloud Run's always-free tier covers low tester traffic; keep min instances at `0` (a warm instance is billable) and set a billing budget alert. Cold starts take a few seconds.

### Google Cloud Run — GitHub Actions (manual fallback)

`.github/workflows/deploy-cloud-run.yml` is `workflow_dispatch`-only so it never races the repo connection above. When run it executes backend tests and frontend checks, builds the image, pushes it to Artifact Registry and deploys it to Cloud Run with the same settings. Authentication uses Workload Identity Federation, so no service-account keys are stored in GitHub.

One-time setup (replace `PROJECT_ID`, `GITHUB_OWNER/REPO`; region defaults to `us-central1`):

```powershell
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com

# Image repository
gcloud artifacts repositories create glaze --repository-format=docker --location=us-central1

# Deployer service account
gcloud iam service-accounts create github-deployer
$SA = "github-deployer@PROJECT_ID.iam.gserviceaccount.com"
foreach ($role in "roles/run.admin", "roles/artifactregistry.writer", "roles/iam.serviceAccountUser") {
  gcloud projects add-iam-policy-binding PROJECT_ID --member "serviceAccount:$SA" --role $role
}

# Workload Identity Federation for GitHub Actions
gcloud iam workload-identity-pools create github --location global
gcloud iam workload-identity-pools providers create-oidc github `
  --location global --workload-identity-pool github `
  --issuer-uri "https://token.actions.githubusercontent.com" `
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" `
  --attribute-condition "assertion.repository == 'GITHUB_OWNER/REPO'"
$PROJECT_NUMBER = gcloud projects describe PROJECT_ID --format "value(projectNumber)"
gcloud iam service-accounts add-iam-policy-binding $SA `
  --role roles/iam.workloadIdentityUser `
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/GITHUB_OWNER/REPO"
```

Then in the GitHub repo (**Settings → Secrets and variables → Actions**):

| Kind | Name | Value |
|---|---|---|
| Variable | `GCP_PROJECT_ID` | `PROJECT_ID` |
| Variable | `GCP_REGION` | `us-central1` (optional) |
| Secret | `GCP_SERVICE_ACCOUNT` | `github-deployer@PROJECT_ID.iam.gserviceaccount.com` |
| Secret | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github` |

Run the workflow from the **Actions** tab; the service URL appears in the job summary.

### Render (alternative)

`render.yaml` defines a free-plan Docker web service using the same `Dockerfile`.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint**, connect the repo, and accept the detected `render.yaml`.
3. Render builds the image and serves the app at `https://<service-name>.onrender.com`. Pushes to `main` redeploy automatically.

Free-tier caveats: the service spins down after ~15 minutes without traffic and takes up to a minute to wake on the next request (Render shows a loading page meanwhile); the instance has 0.1 CPU / 512 MB RAM — the default `JAVA_OPTS` in `render.yaml` keep the JVM comfortably inside that limit.

### Separate containers

`backend/Dockerfile` and `frontend/Dockerfile` (nginx proxying `/api/` to `BACKEND_HOST:8080`) remain for hosts where two services can talk over a private network. Set `CORS_ALLOWED_ORIGINS` on the backend if the frontend is served from a different origin without a proxy.

## Contributing

Bug reports, test-tile results and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for reporting vulnerabilities. This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

Copyright (C) 2025 Glaze Lab contributors.

Glaze Lab is open source under the [Apache License, Version 2.0](LICENSE). You may use, modify, distribute and host it, including in commercial and closed products, provided you keep the license and the attribution in [NOTICE](NOTICE). Material data and glaze chemistry heuristics in this repository are provided without warranty of any kind — see [NOTICE](NOTICE).

## Notes

- Generated recipes are exploratory and should be validated with test tiles and kiln-specific adjustments before production use.
