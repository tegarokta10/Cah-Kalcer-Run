# AI Recommendation

## Flow

```text
Recent activities in localStorage
        ↓
Browser creates a small training context
        ↓
POST /api/recommendation
        ↓
Server validates context and calls Gemini
        ↓
Structured JSON is validated
        ↓
AI result is shown, or the V1 rule is kept as fallback
```

## Input

The browser sends a compact summary, not full stored objects or notes:

```json
{
  "experienceLevel": "beginner",
  "totalRuns": 5,
  "totalDistance": 16.4,
  "averagePace": "7:12/km",
  "longestRun": 4.2,
  "recentRuns": [
    { "date": "2026-10-29", "distance": 3.2, "durationMinutes": 22.5, "pace": "7:02/km" }
  ]
}
```

Only the ten most recent runs are included. Notes are excluded. The endpoint validates values and limits the context before using it in a prompt.

## Prompt and output

The system prompt asks Gemini to act as a general running recommendation assistant. It must consider the supplied level and history, keep suggestions simple and conservative, avoid diagnosis and medical claims, and include a reminder to stop if unusual pain occurs.

Structured JSON fields:

```json
{
  "title": "Easy Run",
  "distance": "3–4 km",
  "intensity": "Easy",
  "reason": "Your recent runs have been short and consistent, so an easy effort supports that habit.",
  "tips": ["Keep the effort comfortable", "Focus on steady pacing", "Stop if you experience unusual pain"]
}
```

The server validates the response shape, text lengths, allowed intensity values, and a conservative distance range. Invalid output becomes an API error instead of crashing the dashboard.

## Errors and fallback

- Missing `GEMINI_API_KEY`: the API returns `AI_NOT_CONFIGURED`.
- Empty activity history: the UI prevents a request and explains that a run is needed.
- Gemini/network failure: the API returns `AI_UNAVAILABLE`.
- Malformed or unsafe output: the API returns `INVALID_AI_RESPONSE`.
- For each error, the existing V1 rule-based suggestion remains visible in the card.

The API key is never returned to the browser, written to local storage, or logged. Put it in `.env.local`; do not commit that file.

## Safety limits

Suggestions are general educational guidance, not a diagnosis or medical recommendation. A schema and distance cap reduce extreme output, but they do not know a runner's health, fatigue, or injury history. The runner should adjust or skip a workout when needed.

## V3 data source

In V1/V2, the dashboard built this context from running activities in browser `localStorage`. In V3, it builds the same compact context from the current Supabase activity response. Only the most recent ten database records and the aggregate statistics are sent to `/api/recommendation`; activity notes are not included. The Gemini prompt and JSON response fields remain the V2 implementation.

In V4, the browser sends only the signed-in runner's experience level. The server verifies the Supabase user, reads that user's activity rows under RLS, and builds the training context on the server. The browser cannot submit another user's history as recommendation input.
