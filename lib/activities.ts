import type { RunActivity } from "@/types/running";

export const ACTIVITY_COLUMNS = "id,date,distance,duration,pace,notes,created_at,source";

export function validateRunInput(value: unknown): {
  date: string;
  distance: number;
  duration: number;
  pace: number;
  notes?: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const { date, distance, duration, notes } = input;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) return null;
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0.01 || distance > 1000) return null;
  if (!Number.isInteger(duration) || Number(duration) <= 0 || Number(duration) > 864_000) return null;
  if (notes !== undefined && (typeof notes !== "string" || notes.length > 120)) return null;

  const storedDistance = Number(distance.toFixed(2));
  return {
    date,
    distance: storedDistance,
    duration: Number(duration),
    pace: Number(duration) / storedDistance,
    ...(typeof notes === "string" && notes.trim() ? { notes: notes.trim() } : {}),
  };
}

export function isLegacyRun(value: unknown): value is RunActivity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const run = value as Record<string, unknown>;
  return typeof run.id === "string" && run.id.length > 0 &&
    validateRunInput(run) !== null &&
    typeof run.pace === "number" && Number.isFinite(run.pace) && run.pace > 0;
}
