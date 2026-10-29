import type { ExperienceLevel, RunActivity } from "@/types/running";

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "—";
  const rounded = Math.round(secondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function getRecommendation(
  lastRun: RunActivity | undefined,
  level: ExperienceLevel,
) {
  if (!lastRun) {
    return {
      title: "Easy Run",
      distance: level === "Beginner" ? "2–3" : "3–4",
      detail: "Start at a relaxed effort. You should be able to hold a conversation as you run.",
      reason: "Once you log a run, your next suggestion will adapt to your recent distance.",
      icon: "↗",
    };
  }

  if (lastRun.distance < 3) {
    return {
      title: "Easy Run",
      distance: level === "Beginner" ? "2.5–3" : "3–4",
      detail: "Keep your pace comfortable and build a steady running habit.",
      reason: `Your last run was ${lastRun.distance.toFixed(1)} km, so a small, comfortable step forward is a good fit.`,
      icon: "↗",
    };
  }

  if (lastRun.distance < 5) {
    return {
      title: "Easy Run",
      distance: level === "Beginner" ? "3–4" : "4–5",
      detail: "Keep the effort comfortable and focus on consistency, not speed.",
      reason: `Your last run was ${lastRun.distance.toFixed(1)} km. This suggestion keeps your next run in a manageable range.`,
      icon: "↗",
    };
  }

  return {
    title: "Recovery Run",
    distance: level === "Beginner" ? "3–4" : "3–5",
    detail: "Run gently and give your body room to recover from a longer effort.",
    reason: `Your last run was ${lastRun.distance.toFixed(1)} km, so this shorter run gives you a chance to recover.`,
    icon: "⤵",
  };
}

export function sortRunsNewestFirst(runs: RunActivity[]) {
  return [...runs].sort((a, b) => b.date.localeCompare(a.date));
}
