export type TrainingContext = {
  experienceLevel: "beginner" | "intermediate";
  totalRuns: number;
  totalDistance: number;
  averagePace: string;
  longestRun: number;
  recentRuns: Array<{
    date: string;
    distance: number;
    durationMinutes: number;
    pace: string;
  }>;
};

export type AiRecommendation = {
  title: string;
  distance: string;
  intensity: "Easy" | "Moderate" | "Recovery";
  reason: string;
  tips: string[];
};
