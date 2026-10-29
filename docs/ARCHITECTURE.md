# Architecture

```text
                         Browser
                   ┌───────┴────────┐
                   ↓                ↓
             Next.js UI        localStorage
                   │           runs + profile
                   ↓
          Training context builder
                   ↓
         POST /api/recommendation
                   ↓
          Validate request on server
                   ↓
          Google GenAI SDK (server)
                   ↓
        Validate structured response
              ┌────┴────┐
              ↓         ↓
         AI result   V1 rule fallback
              └────┬────┘
                   ↓
          Recommendation card
```

## Responsibilities

- **Dashboard (`app/page.tsx`)**: reads and updates runs/profile, calculates summary values, builds a compact context, and requests AI only after a button click.
- **Local storage**: persists `runningActivities` and `runnerProfile` in this browser. There is no account or remote database.
- **Training context**: includes experience level, aggregate totals, average pace, longest run, and up to ten recent runs. Notes are not sent.
- **API route (`app/api/recommendation/route.ts`)**: validates the request, reads server-only `GEMINI_API_KEY`, calls Gemini with a JSON schema, validates the response, and returns a safe error when needed.
- **Gemini**: generates a simple general recommendation from the provided context. It does not access local storage or call other tools.
- **Recommendation card**: presents the rule-based analysis at all times; a valid AI response can provide the main suggestion. Errors keep the V1 suggestion available.

## Environment

Set `GEMINI_API_KEY` in `.env.local`. Never prefix it with `NEXT_PUBLIC_`. `.env*` is ignored by Git; `.env.example` contains only a placeholder.
