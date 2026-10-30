"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isLegacyRun } from "@/lib/activities";
import { formatDuration, formatPace, getRecommendation, sortRunsNewestFirst } from "@/lib/running";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ExperienceLevel, RunActivity } from "@/types/running";
import type { AiRecommendation } from "@/types/recommendation";

type StravaStatus = { connected: boolean; athleteId: string | null; lastSyncedAt: string | null };

const ACTIVITY_KEY = "runningActivities";
const PROFILE_KEY = "runnerProfile";

async function readActivities(): Promise<RunActivity[]> {
  const response = await fetch("/api/activities");
  const payload: unknown = await response.json();
  if (!response.ok || !payload || typeof payload !== "object" || !("activities" in payload) || !Array.isArray(payload.activities)) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Unable to load running activities. Please try again.";
    throw new Error(message);
  }
  return payload.activities as RunActivity[];
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
  } catch {
    // Use the simple fallback message when the server response is not JSON.
  }
  return fallback;
}

function localDateValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function prettyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function isAiRecommendation(value: unknown): value is AiRecommendation {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.title === "string" &&
    typeof item.distance === "string" &&
    ["Easy", "Moderate", "Recovery"].includes(String(item.intensity)) &&
    typeof item.reason === "string" &&
    Array.isArray(item.tips) && item.tips.length >= 2 && item.tips.every((tip) => typeof tip === "string");
}

function Icon({ name }: { name: "distance" | "runs" | "pace" | "longest" | "calendar" | "clock" | "trash" | "shoe" | "spark" }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<typeof name, React.ReactNode> = {
    distance: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></>,
    runs: <><path d="M5 19h14M7 16l3-8 4 4 3-7"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="5" r="1"/></>,
    pace: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></>,
    longest: <><path d="M3 12h18M3 12l4-4m-4 4 4 4m14-4-4-4m4 4-4 4"/><path d="M12 3v3m0 12v3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"/></>,
    shoe: <><path d="M3 15c2.7 0 4-1.5 5-4l2 1c1.4 2.2 4.6 3.2 8.5 3.5 1.4.1 2.5 1.2 2.5 2.5V20H3v-5Z"/><path d="m9 12 2-2m1 4 2-2"/></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1 2.5 2 1-2 1-1 2.5-1-2.5-2-1 2-1 1-2.5Z"/></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function SummaryCard({ label, value, unit, icon, foot }: { label: string; value: string; unit: string; icon: "distance" | "runs" | "pace" | "longest"; foot: string }) {
  return <article className="stat-item">
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}<span>{unit}</span></p>
    <p className="stat-foot">{foot}</p>
  </article>;
}

export default function Dashboard() {
  const [runs, setRuns] = useState<RunActivity[]>([]);
  const [level, setLevel] = useState<ExperienceLevel>("Beginner");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [legacyRuns, setLegacyRuns] = useState<RunActivity[] | null>(null);
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const [migrationMessage, setMigrationMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [stravaStatus, setStravaStatus] = useState<StravaStatus>({ connected: false, athleteId: null, lastSyncedAt: null });
  const [isLoadingStrava, setIsLoadingStrava] = useState(true);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);
  const [isDisconnectingStrava, setIsDisconnectingStrava] = useState(false);
  const [stravaMessage, setStravaMessage] = useState("");
  const [stravaError, setStravaError] = useState("");
  const [authError, setAuthError] = useState("");
  const [date, setDate] = useState(localDateValue());
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [aiError, setAiError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // localStorage is read only for profile preferences and one-time V2 data migration.
  useEffect(() => {
    try {
      const savedRuns = localStorage.getItem(ACTIVITY_KEY);
      const savedLevel = localStorage.getItem(PROFILE_KEY);
      if (savedRuns) {
        const parsed: unknown = JSON.parse(savedRuns);
        if (Array.isArray(parsed)) {
          const validRuns = parsed.filter(isLegacyRun);
          if (validRuns.length) setLegacyRuns(validRuns);
        }
      }
      if (savedLevel === "Beginner" || savedLevel === "Intermediate") setLevel(savedLevel);
    } catch {
      // Ignore malformed old data and continue loading from the database.
    }

    setProfileLoaded(true);
    readActivities()
      .then((items) => { setRuns(items); setActivityError(""); })
      .catch(() => setActivityError("Unable to load running activities. Please try again."))
      .finally(() => setIsLoadingRuns(false));

    fetch("/api/auth/me").then((response) => response.json()).then((payload) => {
      if (payload?.user?.email) setUserEmail(payload.user.email);
    }).catch(() => {});
    fetch("/api/strava/status").then((response) => {
      if (!response.ok) throw new Error("Strava status unavailable");
      return response.json();
    }).then((payload) => {
      if (payload?.connection) setStravaStatus(payload.connection);
    }).catch(() => setStravaError("Unable to load Strava connection status."))
      .finally(() => setIsLoadingStrava(false));

    const stravaResult = new URLSearchParams(window.location.search).get("strava");
    if (stravaResult === "connected") setStravaMessage("Strava connected successfully.");
    if (stravaResult === "cancelled") setStravaError("Strava connection was cancelled.");
    if (stravaResult === "connect_failed") setStravaError("Unable to connect to Strava. Please try again.");
    if (stravaResult === "connect_config_missing" || stravaResult === "strava_credentials_missing") setStravaError("Strava is not configured. Check STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REDIRECT_URI in .env.local, then restart the server.");
    if (stravaResult === "state_invalid") setStravaError("Strava security check failed. Start again from the same address (localhost or 127.0.0.1) and allow cookies.");
    if (stravaResult === "authorization_code_missing") setStravaError("Strava did not return an authorization code. Check the Strava app callback settings and try again.");
    if (stravaResult === "token_exchange_failed") setStravaError("Strava rejected the authorization. Check that the client ID and secret match the same Strava app and that its callback domain is localhost.");
    if (stravaResult === "token_response_invalid") setStravaError("Strava returned an incomplete authorization response. Review the requested permissions and reconnect.");
    if (stravaResult === "connection_storage_failed") setStravaError("Strava authorized successfully, but Supabase could not save the connection. Check the V4 SQL migration and server-only Supabase service key.");
    if (stravaResult === "token_encryption_config_error") setStravaError("Strava authorized successfully, but token encryption configuration is invalid. Check STRAVA_TOKEN_ENCRYPTION_KEY in .env.local.");
    if (stravaResult === "scope_insufficient") setStravaError("Strava did not grant activity read access. Please reconnect and approve the requested permission.");
    if (stravaResult) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (profileLoaded) localStorage.setItem(PROFILE_KEY, level);
  }, [level, profileLoaded]);

  const sortedRuns = useMemo(() => sortRunsNewestFirst(runs), [runs]);
  const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
  const totalDuration = runs.reduce((sum, run) => sum + run.duration, 0);
  const averagePace = totalDistance > 0 ? totalDuration / totalDistance : 0;
  const longest = runs.reduce((max, run) => Math.max(max, run.distance), 0);
  const recommendation = getRecommendation(sortedRuns[0], level);

  async function refreshRuns() {
    try {
      const items = await readActivities();
      setRuns(items);
      setActivityError("");
      return items;
    } catch (refreshError) {
      setActivityError("Unable to load running activities. Please try again.");
      throw refreshError;
    }
  }

  async function addRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaveError("");
    setSaved(false);
    const km = Number(Number(distance).toFixed(2));
    const totalSeconds = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
    if (!date) return setError("Please choose a date for this run.");
    if (!Number.isFinite(km) || km <= 0) return setError("Distance must be greater than 0.");
    if (![hours, minutes, seconds].every((part) => /^\d*$/.test(part))) return setError("Enter a valid duration.");
    if (Number(minutes || 0) > 59 || Number(seconds || 0) > 59) return setError("Minutes and seconds must be less than 60.");
    if (totalSeconds <= 0) return setError("Duration must be greater than 0.");

    setSaving(true);
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, distance: km, duration: totalSeconds, notes: notes.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Unable to save this activity. Please try again."));

      setAiRecommendation(null);
      setAiError("");
      setDistance(""); setHours("0"); setMinutes(""); setSeconds(""); setNotes("");
      setDate(localDateValue()); setSaved(true);
      try { await refreshRuns(); } catch { /* The save succeeded; show the separate load error. */ }
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Unable to save this activity. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRun(id: string) {
    if (!window.confirm("Delete this running activity? This action cannot be undone.")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      const response = await fetch(`/api/activities/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "Unable to delete this activity. Please try again."));
      setAiRecommendation(null);
      setAiError("");
      try { await refreshRuns(); } catch { /* The deletion succeeded; show the separate load error. */ }
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : "Unable to delete this activity. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function importLegacyRuns() {
    if (!legacyRuns?.length) return;
    setImporting(true);
    setMigrationError("");
    try {
      const response = await fetch("/api/activities/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities: legacyRuns }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Unable to import old activities. Your browser copy has been kept safe."));
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("verified" in payload) || payload.verified !== true || !("importedCount" in payload) || payload.importedCount !== legacyRuns.length) {
        throw new Error("The imported activities could not be verified. Your browser copy has been kept safe.");
      }
      const refreshed = await readActivities();
      setRuns(refreshed);
      setActivityError("");
      localStorage.removeItem(ACTIVITY_KEY);
      setLegacyRuns(null);
      setMigrationDismissed(true);
      setMigrationMessage(`${legacyRuns.length} previous ${legacyRuns.length === 1 ? "run was" : "runs were"} imported successfully.`);
    } catch (requestError) {
      setMigrationError(requestError instanceof Error ? requestError.message : "Unable to import old activities. Your browser copy has been kept safe.");
    } finally {
      setImporting(false);
    }
  }

  async function generateAiRecommendation() {
    if (runs.length === 0) {
      setAiError("Add a run to get a suggestion based on your own history.");
      return;
    }

    setIsGenerating(true);
    setAiRecommendation(null);
    setAiError("");
    try {
      const response = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceLevel: level.toLowerCase() }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || !("recommendation" in payload)) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Unable to generate an AI recommendation. Please try again.";
        throw new Error(message);
      }

      const result: unknown = payload.recommendation;
      if (!isAiRecommendation(result)) {
        throw new Error("Gemini returned an invalid recommendation. Your rule-based suggestion is still available.");
      }
      setAiRecommendation(result);
    } catch (requestError) {
      setAiError(requestError instanceof Error ? requestError.message : "Unable to generate an AI recommendation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function refreshStravaStatus() {
    const response = await fetch("/api/strava/status");
    const payload = await response.json();
    if (!response.ok) throw new Error("Unable to load Strava connection status.");
    setStravaStatus(payload.connection ?? { connected: false, athleteId: null, lastSyncedAt: null });
  }

  async function syncStravaActivities() {
    setIsSyncingStrava(true);
    setStravaError("");
    setStravaMessage("");
    try {
      const response = await fetch("/api/strava/sync", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to retrieve activities from Strava. Please try again later.");
      await refreshRuns();
      await refreshStravaStatus();
      setStravaMessage(payload.newActivities > 0
        ? `Strava sync complete. ${payload.newActivities} new ${payload.newActivities === 1 ? "activity" : "activities"} imported. ${payload.alreadySynced} already synced.`
        : "Your Strava activities are already up to date.");
    } catch (syncError) {
      setStravaError(syncError instanceof Error ? syncError.message : "Unable to retrieve activities from Strava. Please try again later.");
      if (syncError instanceof Error && syncError.message.toLowerCase().includes("reconnect")) {
        setStravaStatus({ connected: false, athleteId: null, lastSyncedAt: null });
      }
    } finally {
      setIsSyncingStrava(false);
    }
  }

  async function disconnectStrava() {
    if (!window.confirm("Disconnect Strava? Activities already imported will remain in your history.")) return;
    setIsDisconnectingStrava(true);
    setStravaError("");
    setStravaMessage("");
    try {
      const response = await fetch("/api/strava/disconnect", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to disconnect Strava. Please try again.");
      setStravaStatus({ connected: false, athleteId: null, lastSyncedAt: null });
      setStravaMessage("Strava disconnected. Imported activities remain in your history.");
    } catch (disconnectError) {
      setStravaError(disconnectError instanceof Error ? disconnectError.message : "Unable to disconnect Strava. Please try again.");
    } finally {
      setIsDisconnectingStrava(false);
    }
  }

  async function logout() {
    setAuthError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.assign("/login");
    } catch {
      setAuthError("Unable to log out. Please try again.");
    }
  }

  return <main className="page-shell">
    <a className="skip-link" href="#home">Skip to dashboard content</a>
    <header className="topbar">
      <a href="/" className="brand" aria-label="Cah Kalcer Run home"><span className="brand-mark"><Icon name="shoe"/></span><span>Cah Kalcer<span className="brand-muted"> Run</span></span></a>
      <nav className="nav-links" aria-label="Main navigation"><a className="nav-active" href="#home">Overview</a><a href="#activities">Activities</a><a href="#coach">AI coach</a></nav>
      <div className="top-profile"><span className="profile-level">{level} runner</span><span>{userEmail}</span><button className="logout-button" type="button" onClick={logout}>Log out</button></div>
    </header>

    <section id="home" className="welcome-row">
      <div><p className="eyebrow">YOUR RUNNING LOG</p><h1>Welcome back{userEmail && <span>, {userEmail.split("@")[0]}</span>}.</h1><p className="welcome-copy">Review your activity and choose a comfortable next step.</p></div>
      <a className="today-chip" href="#activity-form">Log a run <span aria-hidden="true">+</span></a>
    </section>

    <section className="summary-grid" aria-label="Running statistics" aria-live="polite">
      <SummaryCard label="Total distance" value={isLoadingRuns ? "..." : totalDistance.toFixed(1)} unit={isLoadingRuns ? "" : "km"} icon="distance" foot="Across logged runs"/>
      <SummaryCard label="Total runs" value={isLoadingRuns ? "..." : String(runs.length)} unit="" icon="runs" foot="In your running log"/>
      <SummaryCard label="Average pace" value={isLoadingRuns ? "..." : averagePace ? formatPace(averagePace) : "Not available"} unit={!isLoadingRuns && averagePace ? "/km" : ""} icon="pace" foot="Weighted by distance"/>
      <SummaryCard label="Longest run" value={isLoadingRuns ? "..." : longest ? longest.toFixed(1) : "Not available"} unit={!isLoadingRuns && longest ? "km" : ""} icon="longest" foot="From your activity history"/>
    </section>

    {legacyRuns && !migrationDismissed && <section className="migration-notice" aria-labelledby="migration-heading">
      <span className="migration-icon"><Icon name="runs"/></span>
      <div className="migration-copy"><h2 id="migration-heading">We found {legacyRuns.length} saved {legacyRuns.length === 1 ? "run" : "runs"} from your previous version</h2><p>Import them into the Supabase database? Your browser copy will only be removed after the import is verified.</p>{migrationError && <p className="migration-error" role="alert">{migrationError}</p>}</div>
      <div className="migration-actions"><button className="button button-primary" type="button" onClick={importLegacyRuns} disabled={importing || isLoadingRuns}>{importing ? "Importing…" : "Import activities"}</button><button className="migration-dismiss" type="button" onClick={() => setMigrationDismissed(true)} disabled={importing}>Not now</button></div>
    </section>}
    {migrationMessage && <p className="migration-success" role="status">{migrationMessage}</p>}

    <section className="dashboard-grid">
      <div className="left-column" role="region" aria-label="Your running progress">
        <section className="panel recommendation-panel" id="coach" aria-labelledby="recommendation-heading">
          <div className="panel-heading"><div><p className="eyebrow">A GOOD NEXT STEP</p><h2 id="recommendation-heading">Your next run</h2></div><span className="recommendation-icon"><Icon name="spark"/></span></div>
          <div className="analysis-box"><strong>Training analysis <span>Rule based</span></strong><p>Your recent activity suggests a {recommendation.title.toLowerCase()} of {recommendation.distance} km. {recommendation.detail}</p></div>
          <div className="ai-result-heading"><span className="ai-spark">✳</span><strong>AI recommendation</strong>{aiRecommendation && <span className="ai-badge">Gemini</span>}</div>
          <div className="recommendation-main"><div className="run-type">{aiRecommendation?.title ?? recommendation.title}</div><div className="recommendation-distance">{aiRecommendation?.distance ?? `${recommendation.distance} km`}</div><div className="intensity-row"><span>Intensity</span><strong>{aiRecommendation?.intensity ?? (recommendation.title === "Recovery Run" ? "Recovery" : "Easy")}</strong></div><p>{aiRecommendation?.reason ?? recommendation.reason}</p></div>
          <div className="ai-tips"><strong>Tips</strong><ul>{(aiRecommendation?.tips ?? ["Keep the effort comfortable", "Focus on steady, relaxed pacing", "Stop if you experience unusual pain"]).map((tip, index) => <li key={`${index}-${tip}`}>{tip}</li>)}</ul></div>
          {aiError && <p className="ai-message" role="alert">{aiError} Your rule-based recommendation is shown above.</p>}
          {!runs.length && <p className="ai-message">Add a run to get a suggestion based on your own history.</p>}
          <button className="button button-primary ai-button" type="button" onClick={generateAiRecommendation} disabled={isGenerating || !runs.length}>
            {isGenerating ? <><span className="spinner"/> Generating your recommendation...</> : <>Generate AI Recommendation <span>↗</span></>}
          </button>
        </section>

        <section id="activities" className="panel activities-panel" aria-labelledby="activities-heading">
          <div className="panel-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2 id="activities-heading">Recent activities</h2></div><a className="text-link" href="#activity-form">Add a run <span>↗</span></a></div>
          {activityError && <div className="database-error" role="alert"><span>{activityError}</span><button type="button" onClick={() => { setIsLoadingRuns(true); refreshRuns().catch(() => {}).finally(() => setIsLoadingRuns(false)); }}>Try again</button></div>}
          {deleteError && <p className="database-error-text" role="alert">{deleteError}</p>}
          {isLoadingRuns ? <div className="empty-state"><strong>Loading your runs...</strong></div> : activityError && runs.length === 0 ? <div className="empty-state"><strong>Activities are temporarily unavailable.</strong><p>Try loading your running history again.</p></div> : sortedRuns.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="shoe"/></span><strong>No running activities yet.</strong><p>Add your first run to start tracking your progress.</p><a className="button button-secondary" href="#activity-form">Add your first run <span>＋</span></a></div> : <div className="activity-list">
            {sortedRuns.map((run) => <article className="activity-row" key={run.id}><span className="activity-shoe"><Icon name="shoe"/></span><div className="activity-details"><strong>{run.notes || "Run"}</strong><span><Icon name="calendar"/> {prettyDate(run.date)} <span className={`source-badge ${run.source === "strava" ? "source-strava" : ""}`}>{run.source === "strava" ? "Strava" : "Manual"}</span></span>{deletingId === run.id && <span className="delete-status" role="status">Deleting…</span>}</div><div className="activity-metric"><strong>{run.distance.toFixed(1)} <small>km</small></strong><span>Distance</span></div><div className="activity-metric"><strong>{formatDuration(run.duration)}</strong><span>Duration</span></div><div className="activity-metric"><strong>{formatPace(run.pace)} <small>/km</small></strong><span>Average pace</span></div><button className="delete-button" type="button" onClick={() => deleteRun(run.id)} disabled={deletingId === run.id} aria-label={deletingId === run.id ? "Deleting activity" : `Delete run on ${prettyDate(run.date)}`} title={deletingId === run.id ? "Deleting..." : "Delete activity"}>{deletingId === run.id ? "…" : <Icon name="trash"/>}</button></article>)}
          </div>}
        </section>
      </div>

      <aside className="right-column" aria-label="Run logging and connections">
        <section className="panel form-panel" id="activity-form" aria-labelledby="form-heading">
          <div className="panel-heading"><div><p className="eyebrow">LOG YOUR MILES</p><h2 id="form-heading">Add a run</h2></div><span className="form-icon">＋</span></div>
          <form onSubmit={addRun} noValidate>
            <label className="field-label" htmlFor="run-date">Date</label><div className="input-wrap"><span className="input-icon"><Icon name="calendar"/></span><input id="run-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></div>
            <label className="field-label" htmlFor="distance">Distance</label><div className="input-wrap"><input id="distance" type="number" min="0.01" step="0.01" placeholder="e.g. 3.5" value={distance} onChange={(event) => setDistance(event.target.value)} required/><span className="input-suffix">km</span></div>
            <label className="field-label">Duration</label><div className="duration-inputs"><label><input aria-label="Duration hours" type="number" min="0" placeholder="0" value={hours} onChange={(event) => setHours(event.target.value)} /><span>hours</span></label><label><input aria-label="Duration minutes" type="number" min="0" max="59" placeholder="00" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><span>min</span></label><label><input aria-label="Duration seconds" type="number" min="0" max="59" placeholder="00" value={seconds} onChange={(event) => setSeconds(event.target.value)} /><span>sec</span></label></div>
            {distance && Number(distance) >= 0.01 && (Number(hours || 0) + Number(minutes || 0) + Number(seconds || 0)) > 0 && <div className="pace-preview"><Icon name="clock"/><span>Calculated pace</span><strong>{formatPace((Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0)) / Number(Number(distance).toFixed(2)))} /km</strong></div>}
            <label className="field-label" htmlFor="notes">Notes <span className="optional">Optional</span></label><textarea id="notes" rows={2} maxLength={120} placeholder="How did it feel?" value={notes} onChange={(event) => setNotes(event.target.value)}/>
            {error && <p className="form-message form-error" role="alert">{error}</p>}{saveError && <p className="form-message form-error" role="alert">{saveError}</p>}{saved && <p className="form-message form-success" role="status">Run saved. Your activity is in your log.</p>}
            <button className="button button-primary submit-button" type="submit" disabled={saving || isLoadingRuns}>{saving ? "Saving…" : <>Save activity <span>↗</span></>}</button>
          </form>
        </section>

        <section className="panel strava-panel" aria-labelledby="strava-heading">
          <div className="panel-heading"><div><p className="eyebrow">ACTIVITY IMPORT</p><h2 id="strava-heading">Strava</h2></div><span className={`strava-status-dot ${stravaStatus.connected ? "is-connected" : ""}`}/></div>
          {isLoadingStrava ? <p className="strava-copy">Checking connection…</p> : stravaStatus.connected ? <>
            <p className="strava-connection"><span className="connected-check">✓</span> Connected {stravaStatus.athleteId && <span className="athlete-id">Athlete {stravaStatus.athleteId}</span>}</p>
            <p className="strava-copy">Last synced: {stravaStatus.lastSyncedAt ? new Date(stravaStatus.lastSyncedAt).toLocaleString() : "Not synced yet"}</p>
            <div className="strava-actions"><button className="button button-primary" type="button" onClick={syncStravaActivities} disabled={isSyncingStrava || isDisconnectingStrava}>{isSyncingStrava ? "Syncing activities…" : "Sync activities"}</button><button className="strava-secondary-button" type="button" onClick={disconnectStrava} disabled={isSyncingStrava || isDisconnectingStrava}>{isDisconnectingStrava ? "Disconnecting…" : "Disconnect"}</button></div>
          </> : <>
            <p className="strava-copy">Import your running activities automatically from your Strava account.</p>
            <a className="button button-primary strava-connect" href="/api/strava/connect">Connect Strava</a>
          </>}
          {stravaError && <p className="strava-error" role="alert">{stravaError}</p>}
          {stravaMessage && <p className="strava-message" role="status">{stravaMessage}</p>}
        </section>

        <section className="panel profile-panel" aria-labelledby="profile-heading">
          <div className="profile-heading"><span className="profile-avatar"><Icon name="runs"/></span><div><p className="eyebrow">YOUR STARTING POINT</p><h2 id="profile-heading">Runner profile</h2></div></div>
          <label className="field-label" htmlFor="experience-level">Experience level</label><select id="experience-level" value={level} onChange={(event) => { setLevel(event.target.value as ExperienceLevel); setAiRecommendation(null); setAiError(""); }}><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option></select>
          <p className="profile-note">Your level helps tailor the distance in your next run suggestion.</p>
        </section>
        <p className="local-note"><span>⌑</span> Your activities are saved in the Supabase database.</p>
      </aside>
    </section>
    {authError && <p className="auth-error" role="alert">{authError}</p>}
    <footer className="footer"><span>CAH KALCER RUN</span><span>Made for the joy of getting out there.</span></footer>
  </main>;
}
