export type RunActivity = {
  id: string;
  source?: "manual" | "strava";
  date: string;
  distance: number;
  duration: number; // Total duration in seconds
  pace: number; // Seconds per kilometer
  notes?: string | null;
  created_at?: string;
};

export type ExperienceLevel = "Beginner" | "Intermediate";
