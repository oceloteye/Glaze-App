# Glaze App

Full-stack web app for generating candidate ceramic glaze recipes from user-selected parameters.

## Tech Stack

- Backend: Java Spring Boot (Maven)
- Frontend: React + Vite + TypeScript

## Project Structure

- `backend/`: Spring Boot API
- `frontend/`: React web client

## Features

- Parameter form for:
  - Color goal (hex) with live canvas preview of the fired glaze
  - Firing temperature (°C / cone)
  - Surface finish (Matte / Satin / Glossy)
  - Melt / stability (Stiff / Balanced / Fluid)
  - Opacity (Translucent / Semi-opaque / Opaque)
  - Feldspar source, color character, kiln atmosphere, food-safe mode
  - Optional colour/texture effect (Speckled, Crystalline, Variegated, Flame) with intensity and secondary colour
- API endpoint to generate recipe candidates
- Ingredient percentages normalized to 100%
- Rationale, UMF analysis and firing schedules for each generated recipe
- Responsive UI for desktop and mobile

## Backend API

Endpoint:

- `POST /api/recipes/generate`

Sample request body (`opacity`, `intensity`, `secondaryColor`, `feldsparSubstitute`, `colorCharacter`, `atmosphere` and `foodSafe` are optional):

```json
{
  "color": "#7f9e87",
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

`stability` accepts `High` / `Medium` / `Low` (shown in the UI as Stiff / Balanced / Fluid).

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
      "firingSchedules": [{ "...": "segments for very short / short / standard / slow schedules" }]
    }
  ]
}
```

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
```

## Deploy

### Single container

The root `Dockerfile` builds the React app and bundles it into the Spring Boot jar, so one container serves both the UI at `/` and the API at `/api/*`. Same origin means no CORS or cross-service networking is needed.

Build and run locally with Docker:

```powershell
docker build -t glaze-app .
docker run --rm -p 8080:8080 glaze-app
```

Open `http://localhost:8080`. The app honours a `PORT` environment variable (defaults to 8080) and exposes `GET /api/health` for liveness checks.

### Google Cloud Run via GitHub Actions (primary)

`.github/workflows/deploy-cloud-run.yml` runs backend tests and frontend checks on every push to `main`, then builds the image, pushes it to Artifact Registry and deploys it to Cloud Run (512 MiB, 1 vCPU, scale-to-zero, max 2 instances). Authentication uses Workload Identity Federation, so no service-account keys are stored in GitHub.

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

Push to `main` (or run the workflow manually) and the service URL appears in the job summary. Cloud Run's always-free tier covers low tester traffic; keep `--min-instances=0` (a warm instance is billable) and set a billing budget alert. Cold starts take a few seconds.

### Render (alternative)

`render.yaml` defines a free-plan Docker web service using the same `Dockerfile`.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint**, connect the repo, and accept the detected `render.yaml`.
3. Render builds the image and serves the app at `https://<service-name>.onrender.com`. Pushes to `main` redeploy automatically.

Free-tier caveats: the service spins down after ~15 minutes without traffic and takes up to a minute to wake on the next request (Render shows a loading page meanwhile); the instance has 0.1 CPU / 512 MB RAM — the default `JAVA_OPTS` in `render.yaml` keep the JVM comfortably inside that limit.

### Separate containers

`backend/Dockerfile` and `frontend/Dockerfile` (nginx proxying `/api/` to `BACKEND_HOST:8080`) remain for hosts where two services can talk over a private network. Set `CORS_ALLOWED_ORIGINS` on the backend if the frontend is served from a different origin without a proxy.

## Notes

- Generated recipes are exploratory and should be validated with test tiles and kiln-specific adjustments before production use.
