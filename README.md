# SetRadar

![SetRadar screenshot](<Snimka zaslona 2026-09-09 213512.png>)

SetRadar helps production teams discover, compare, and organize real-world filming locations.

## Features

- Location scouting from a city and a natural-language production brief
- AI-assisted request validation before research begins
- Location candidates with descriptions, images, sources, coordinates, and practical notes
- City Lookalike research for finding places with a similar visual character
- Films-in-city research and historical suitability checks
- Projects with saved locations, scenes, schedules, and production notes
- MongoDB-backed authentication and user data
- Weather forecasts and historical weather data for scheduled scenes
- Shootability scoring for planning, logistics, weather, and production constraints
- Saved locations and user travel preferences
- Responsive React interface with comparison and map views

## Technology

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JSON Web Tokens for authentication
- Helmet and CORS for HTTP security

### Research and data providers

- Google Gemini for request classification, research synthesis, and result verification
- Parallel for web research
- Open-Meteo for geocoding, forecasts, and historical weather
- Wikipedia and GIS sources for location context and coordinates
- Image search providers for location photography

## Project structure

```text
client/     React application
server/     Express APIs, MongoDB models, research services, and agents
public/     Static frontend assets
vite.config.ts
package.json
```

## Requirements

- Node.js 20 or newer
- A MongoDB database
- Gemini API access
- Parallel API access

## Setup

Install the frontend dependencies:

```bash
npm install
```

Install the backend dependencies:

```bash
cd server
npm install
cd ..
```

Create the backend environment file:

```bash
copy server\.env.example server\.env
```

Fill in `server/.env` with your MongoDB connection string and provider keys. Never commit this file.

## Development

Run the frontend, API, research server, and local JSON server together:

```bash
npm run dev
```

The default development services are:

- Frontend: http://localhost:8443
- Main API: http://localhost:3000
- Research agent server: http://localhost:4000
- JSON server: http://localhost:3001

Run only the frontend:

```bash
npm run dev:client
```

Run only the MongoDB API:

```bash
npm run dev:server
```

## Production build

```bash
npm run build
npm run preview
```

## API overview

The main API provides authentication, project, location, scene, production-note, and preference persistence under `/api`.

Research endpoints include:

- `POST /api/search-location`
- `POST /api/city-lookalike`
- `POST /api/films-in-city`
- `POST /api/history-check`
- `POST /api/agent/scout`

Health checks:

- `GET /api/health`
- `GET /api/agent/health`

## Security notes

- Keep all provider keys, MongoDB credentials, and JWT secrets in `server/.env`.
- Use a long, random `JWT_SECRET` outside local development.
- Restrict `CORS_ORIGINS` to trusted frontend origins in deployed environments.
- Do not expose provider keys through frontend environment variables.
- Rotate any credential that has been shared publicly or committed previously.
