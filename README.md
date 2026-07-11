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
  - Color goal
  - Firing temperature (C)
  - Surface finish
  - Stability target
  - Optional effects
- API endpoint to generate recipe candidates
- Ingredient percentages normalized to 100%
- Rationale for each generated recipe
- Responsive UI for desktop and mobile

## Backend API

Endpoint:

- `POST /api/recipes/generate`

Sample request body:

```json
{
  "color": "Sage green",
  "firingTempC": 1220,
  "surfaceFinish": "Satin",
  "stability": "High",
  "effects": ["Variegated"]
}
```

Sample response shape:

```json
{
  "recipes": [
    {
      "name": "Balanced Gloss Base",
      "firingRange": "High fire (cone 8-10)",
      "ingredients": {
        "Feldspar": 29.76,
        "Silica": 21.22
      },
      "rationale": "Designed for Sage green tone at 1220C, satin finish, high stability target."
    }
  ]
}
```

## Run Locally

Open two terminals from the workspace root.

### 0) Configure Gemini API key (required for AI preview images)

Set the key in PowerShell before starting the backend.

Current terminal session only:

```powershell
$env:GEMINI_API_KEY="your_gemini_api_key_here"
```

Persist for future terminal sessions (open a new terminal after running this):

```powershell
setx GEMINI_API_KEY "your_gemini_api_key_here"
```

Optional check:

```powershell
if (Test-Path Env:GEMINI_API_KEY) { "GEMINI_API_KEY is set" } else { "GEMINI_API_KEY is NOT set" }
```

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

## Notes

- Generated recipes are exploratory and should be validated with test tiles and kiln-specific adjustments before production use.
