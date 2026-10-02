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

## Notes

- Generated recipes are exploratory and should be validated with test tiles and kiln-specific adjustments before production use.
