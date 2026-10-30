export type StravaActivity = {
  id: number | string;
  name?: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  elapsed_time?: number;
  start_date_local?: string;
  start_date?: string;
};

export type NormalizedStravaActivity = {
  user_id: string;
  date: string;
  distance: number;
  duration: number;
  pace: number;
  notes: string;
  source: "strava";
  external_id: string;
};

export function isRunningActivity(activity: StravaActivity) {
  return activity.type === "Run" || ["Run", "TrailRun", "VirtualRun"].includes(activity.sport_type ?? "");
}

export function normalizeStravaActivity(activity: StravaActivity, userId: string): NormalizedStravaActivity | null {
  if (!isRunningActivity(activity) || activity.id === undefined || activity.id === null) return null;
  if (typeof activity.distance !== "number" || !Number.isFinite(activity.distance) || activity.distance <= 0) return null;
  if (!Number.isInteger(activity.elapsed_time) || !activity.elapsed_time || activity.elapsed_time <= 0) return null;

  const startDate = activity.start_date_local ?? activity.start_date;
  const date = typeof startDate === "string" ? startDate.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const distanceKm = Number((activity.distance / 1000).toFixed(2));
  if (distanceKm < 0.01) return null;
  return {
    user_id: userId,
    date,
    distance: distanceKm,
    duration: activity.elapsed_time,
    pace: activity.elapsed_time / distanceKm,
    notes: typeof activity.name === "string" ? activity.name.slice(0, 120) : "Strava run",
    source: "strava",
    external_id: String(activity.id),
  };
}
