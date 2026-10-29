export type RunActivity = {
  id: string;
  date: string;
  distance: number;
  duration: number; // Total duration in seconds
  pace: number; // Seconds per kilometer
  notes?: string;
};

export type ExperienceLevel = "Beginner" | "Intermediate";
