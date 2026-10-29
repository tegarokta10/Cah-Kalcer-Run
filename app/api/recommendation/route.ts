import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { AiRecommendation, TrainingContext } from "@/types/recommendation";

export const runtime = "nodejs";

const recommendationSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "A simple run type, such as Easy Run or Recovery Run." },
    distance: { type: "string", description: "A conservative target distance range in km, such as 3–4 km." },
    intensity: { type: "string", enum: ["Easy", "Moderate", "Recovery"] },
    reason: { type: "string", description: "A brief explanation based on the provided running history." },
    tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
  },
  required: ["title", "distance", "intensity", "reason", "tips"],
  additionalProperties: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRecommendation(value: unknown, context: TrainingContext): AiRecommendation | null {
  if (!isRecord(value)) return null;
  const { title, distance, intensity, reason, tips } = value;
  const distanceRange = typeof distance === "string"
    ? distance.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*km$/i)
    : null;
  const lowerDistance = distanceRange ? Number(distanceRange[1]) : 0;
  const upperDistance = distanceRange ? Number(distanceRange[2]) : Number.POSITIVE_INFINITY;
  const lastDistance = context.recentRuns[0].distance;
  const safeDistanceLimit = Math.min(10, lastDistance + (context.experienceLevel === "beginner" ? 1.5 : 2));

  if (
    typeof title !== "string" || title.trim().length < 2 || title.length > 50 ||
    typeof distance !== "string" || distance.trim().length < 2 || distance.length > 30 ||
    !distanceRange || lowerDistance <= 0 || lowerDistance > upperDistance || upperDistance > safeDistanceLimit ||
    !["Easy", "Moderate", "Recovery"].includes(String(intensity)) ||
    typeof reason !== "string" || reason.trim().length < 10 || reason.length > 500 ||
    !Array.isArray(tips) || tips.length < 2 || tips.length > 4 ||
    tips.some((tip) => typeof tip !== "string" || tip.trim().length < 3 || tip.length > 140)
  ) return null;

  return {
    title: title.trim(),
    distance: distance.trim(),
    intensity: intensity as AiRecommendation["intensity"],
    reason: reason.trim(),
    tips: tips.map((tip: string) => tip.trim()),
  };
}

function parseContext(value: unknown): TrainingContext | null {
  if (!isRecord(value) || !Array.isArray(value.recentRuns)) return null;
  const { experienceLevel, totalRuns, totalDistance, averagePace, longestRun, recentRuns } = value;
  if (
    !["beginner", "intermediate"].includes(String(experienceLevel)) ||
    !Number.isInteger(totalRuns) || Number(totalRuns) < 1 || Number(totalRuns) > 100_000 ||
    typeof totalDistance !== "number" || !Number.isFinite(totalDistance) || totalDistance <= 0 || totalDistance > 1_000_000 ||
    typeof averagePace !== "string" || averagePace.length > 20 ||
    typeof longestRun !== "number" || !Number.isFinite(longestRun) || longestRun <= 0 || longestRun > 1_000 ||
    recentRuns.length === 0 || recentRuns.length > 10
  ) return null;

  const cleanRuns: TrainingContext["recentRuns"] = [];
  for (const run of recentRuns) {
    if (!isRecord(run) || typeof run.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(run.date) ||
        typeof run.distance !== "number" || !Number.isFinite(run.distance) || run.distance <= 0 || run.distance > 1_000 ||
        typeof run.durationMinutes !== "number" || !Number.isFinite(run.durationMinutes) || run.durationMinutes <= 0 || run.durationMinutes > 10_000 ||
        typeof run.pace !== "string" || run.pace.length > 20) return null;
    cleanRuns.push({ date: run.date, distance: run.distance, durationMinutes: run.durationMinutes, pace: run.pace });
  }

  return {
    experienceLevel: experienceLevel as TrainingContext["experienceLevel"],
    totalRuns: Number(totalRuns),
    totalDistance,
    averagePace,
    longestRun,
    recentRuns: cleanRuns,
  };
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI recommendation is not configured yet.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The recommendation request was invalid.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const context = isRecord(body) ? parseContext(body.context) : null;
  if (!context) {
    return NextResponse.json({ error: "Add at least one running activity before generating a recommendation.", code: "NO_RUNNING_DATA" }, { status: 400 });
  }

  const prompt = [
    "You are a general running recommendation assistant for recreational runners.",
    "Use only the supplied running context. Suggest one simple, conservative next workout that matches the runner's experience level and recent activity.",
    "Do not diagnose conditions, make medical claims, prescribe treatment, or recommend extreme effort or distance increases.",
    "Keep the explanation concise and practical. Include a tip to stop if unusual pain occurs.",
    "Return only the requested JSON structure.",
    `Training context: ${JSON.stringify(context)}`,
  ].join("\n\n");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: recommendationSchema,
      },
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text ?? "");
    } catch {
      return NextResponse.json({ error: "Gemini returned an invalid recommendation. Your rule-based suggestion is still available.", code: "INVALID_AI_RESPONSE" }, { status: 502 });
    }

    const recommendation = parseRecommendation(parsed, context);
    if (!recommendation) {
      return NextResponse.json({ error: "Gemini returned an invalid recommendation. Your rule-based suggestion is still available.", code: "INVALID_AI_RESPONSE" }, { status: 502 });
    }

    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json({ error: "Unable to generate an AI recommendation. Please try again.", code: "AI_UNAVAILABLE" }, { status: 502 });
  }
}
