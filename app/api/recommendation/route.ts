import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { formatPace } from "@/lib/running";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
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

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Please log in to request a recommendation.", code: "UNAUTHENTICATED" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI recommendation is not configured yet.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The recommendation request was invalid.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const experienceLevel = isRecord(body) ? body.experienceLevel : null;
  if (experienceLevel !== "beginner" && experienceLevel !== "intermediate") {
    return NextResponse.json({ error: "The runner profile is invalid. Please choose an experience level.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  let activityRows: Array<{ date: string; distance: number; duration: number; pace: number }> = [];
  try {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await auth.supabase
        .from("running_activities")
        .select("date,distance,duration,pace")
        .eq("user_id", auth.user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = (data ?? []) as typeof activityRows;
      activityRows = activityRows.concat(rows);
      if (rows.length < pageSize) break;
    }
  } catch {
    return NextResponse.json({ error: "Unable to load your running activities for a recommendation.", code: "DATABASE_UNAVAILABLE" }, { status: 503 });
  }

  if (activityRows.length === 0) {
    return NextResponse.json({ error: "Add at least one running activity before generating a recommendation.", code: "NO_RUNNING_DATA" }, { status: 400 });
  }

  const totalDistance = activityRows.reduce((sum, run) => sum + Number(run.distance), 0);
  const totalDuration = activityRows.reduce((sum, run) => sum + Number(run.duration), 0);
  const context: TrainingContext = {
    experienceLevel,
    totalRuns: activityRows.length,
    totalDistance: Number(totalDistance.toFixed(1)),
    averagePace: totalDistance > 0 ? `${formatPace(totalDuration / totalDistance)}/km` : "Not available",
    longestRun: Number(Math.max(...activityRows.map((run) => Number(run.distance))).toFixed(1)),
    recentRuns: activityRows.slice(0, 10).map((run) => ({
      date: run.date,
      distance: Number(run.distance),
      durationMinutes: Number((Number(run.duration) / 60).toFixed(1)),
      pace: `${formatPace(Number(run.pace))}/km`,
    })),
  };

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
