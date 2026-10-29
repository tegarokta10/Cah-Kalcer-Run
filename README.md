# Cah Kalcer Coach

A simple running tracker and training companion for beginner runners. V1 stores everything in your browser, so there is no account or server database to set up.

## Current Features

- Running activity tracking
- Pace calculation
- Running history
- Basic statistics
- Rule-based training recommendation
- Local storage
- Responsive dashboard
- Beginner and Intermediate runner profiles

## V1 Status

Completed:
- Running tracker
- Statistics
- Basic recommendation system

Next:
- AI recommendation
- Database
- Strava integration

## Run locally

You need Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. There are no environment variables or API keys to configure.

## How to use

1. Enter a date, distance, and duration, then save a run. Pace is calculated automatically.
2. Review your latest activities and summary statistics on the dashboard.
3. Choose Beginner or Intermediate in Runner Profile to adjust the recommendation distance.
4. Delete an activity with its trash button and confirm the prompt.

Activities are stored in `localStorage` under `runningActivities`, and your level is stored under `runnerProfile`. They stay in this browser on this device. Clearing browser storage removes them.

## Verify the app

```bash
npm run build
```

You can also check the main flow in the browser: add a run, refresh the page, check its calculated pace and updated statistics, switch experience level, then delete the run and confirm the empty state returns.

## Tech stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS (with a small custom stylesheet for the dashboard)
- Browser `localStorage`

No Strava, OAuth, external database, authentication, or AI API is used in V1.
