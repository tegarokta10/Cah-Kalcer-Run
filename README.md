# Cah Kalcer Coach

A simple running tracker and training companion for beginner runners. Running data stays in your browser, and V2 can generate a more personal recommendation through Gemini when you request one.

## Current Version

V2 — AI Recommendation

### V2 Features

- Running activity tracking
- Running statistics
- LocalStorage persistence
- Rule-based recommendation
- AI-powered recommendation
- Gemini API integration
- Responsive typography
- AI fallback mechanism

Additional V1 features include pace calculation, run history, activity deletion, and Beginner/Intermediate profiles.

## Run locally

You need Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To enable AI recommendations, copy `.env.example` to `.env.local`, set `GEMINI_API_KEY`, and restart the dev server. The key is used by the server only. The tracker and rule-based recommendation work without it.

## How to use

1. Add a run with its date, distance, and duration. Pace is calculated automatically.
2. Review your activity history and running statistics.
3. Choose Beginner or Intermediate in Runner Profile.
4. Select **Generate AI Recommendation** to request a Gemini suggestion. If Gemini is unavailable, the rule-based suggestion stays visible.
5. Delete an activity with its trash button and confirm the prompt.

Activities are stored in browser `localStorage` under `runningActivities`; your level uses `runnerProfile`. They remain on this browser and device. Clearing browser storage removes them.

## Verify the app

```bash
npm run build
```

For a manual check, add a run, refresh, confirm its pace and statistics, switch experience level, request an AI recommendation (with a valid API key), and delete the run. Without a key, confirm the missing-key message and rule-based fallback.

## Documentation

- [V2 Development](./docs/V2.md)
- [AI Recommendation](./docs/AI-RECOMMENDATION.md)
- [Architecture](./docs/ARCHITECTURE.md)

## Tech stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and custom dashboard styles
- Browser `localStorage`
- Official Google GenAI JavaScript SDK (`@google/genai`)

No Strava, OAuth, database, authentication, user accounts, or AI agent is used in V2.
