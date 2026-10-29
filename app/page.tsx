"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatDuration, formatPace, getRecommendation, sortRunsNewestFirst } from "@/lib/running";
import type { ExperienceLevel, RunActivity } from "@/types/running";

const ACTIVITY_KEY = "runningActivities";
const PROFILE_KEY = "runnerProfile";

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
  return <article className="summary-card">
    <div className="summary-top"><span>{label}</span><span className="summary-icon"><Icon name={icon}/></span></div>
    <div className="summary-value">{value}<span>{unit}</span></div>
    <p>{foot}</p>
  </article>;
}

export default function Dashboard() {
  const [runs, setRuns] = useState<RunActivity[]>([]);
  const [level, setLevel] = useState<ExperienceLevel>("Beginner");
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(localDateValue());
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Read browser storage after mount so server and browser render the same initial page.
  useEffect(() => {
    try {
      const savedRuns = localStorage.getItem(ACTIVITY_KEY);
      const savedLevel = localStorage.getItem(PROFILE_KEY);
      if (savedRuns) {
        const parsed: unknown = JSON.parse(savedRuns);
        if (Array.isArray(parsed)) setRuns(parsed as RunActivity[]);
      }
      if (savedLevel === "Beginner" || savedLevel === "Intermediate") setLevel(savedLevel);
    } catch {
      // A malformed or unavailable saved value should not prevent the dashboard from opening.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(runs));
  }, [runs, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem(PROFILE_KEY, level);
  }, [level, ready]);

  const sortedRuns = useMemo(() => sortRunsNewestFirst(runs), [runs]);
  const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
  const totalDuration = runs.reduce((sum, run) => sum + run.duration, 0);
  const averagePace = totalDistance > 0 ? totalDuration / totalDistance : 0;
  const longest = runs.reduce((max, run) => Math.max(max, run.distance), 0);
  const recommendation = getRecommendation(sortedRuns[0], level);

  function addRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const km = Number(distance);
    const totalSeconds = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
    if (!date) return setError("Please choose a date for this run.");
    if (!Number.isFinite(km) || km <= 0) return setError("Distance must be greater than 0.");
    if (![hours, minutes, seconds].every((part) => /^\d*$/.test(part))) return setError("Enter a valid duration.");
    if (Number(minutes || 0) > 59 || Number(seconds || 0) > 59) return setError("Minutes and seconds must be less than 60.");
    if (totalSeconds <= 0) return setError("Duration must be greater than 0.");

    const newRun: RunActivity = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      date, distance: km, duration: totalSeconds, pace: totalSeconds / km,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    setRuns((current) => [...current, newRun]);
    setDistance(""); setHours("0"); setMinutes(""); setSeconds(""); setNotes("");
    setDate(localDateValue()); setSaved(true);
  }

  function deleteRun(id: string) {
    if (!window.confirm("Delete this running activity? This action cannot be undone.")) return;
    setRuns((current) => current.filter((run) => run.id !== id));
  }

  return <main className="page-shell">
    <header className="topbar">
      <a href="#home" className="brand" aria-label="Cah Kalcer Coach home"><span className="brand-mark"><Icon name="shoe"/></span><span>Cah Kalcer<span className="brand-muted"> Coach</span></span></a>
      <nav className="nav-links" aria-label="Main navigation"><a className="nav-active" href="#home">Dashboard</a><a href="#activities">Activities</a></nav>
      <div className="top-profile"><span className="avatar">{level === "Beginner" ? "B" : "I"}</span><span>{level} runner</span></div>
    </header>

    <section id="home" className="welcome-row">
      <div><p className="eyebrow">YOUR RUNNING SPACE</p><h1>Small steps. <span>Stronger strides.</span></h1><p className="welcome-copy">A little progress, one run at a time. Keep showing up for yourself.</p></div>
      <div className="today-chip"><span className="today-dot"/> YOUR PERSONAL RUN LOG</div>
    </section>

    <section className="summary-grid" aria-label="Running statistics">
      <SummaryCard label="Total distance" value={ready ? totalDistance.toFixed(1) : "0.0"} unit="km" icon="distance" foot="Across all your runs"/>
      <SummaryCard label="Total runs" value={ready ? String(runs.length) : "0"} unit="" icon="runs" foot="Every run counts"/>
      <SummaryCard label="Average pace" value={ready && averagePace ? formatPace(averagePace) : "—"} unit={averagePace ? "/km" : ""} icon="pace" foot="Based on total distance"/>
      <SummaryCard label="Longest run" value={ready && longest ? longest.toFixed(1) : "—"} unit={longest ? "km" : ""} icon="longest" foot="Your personal best"/>
    </section>

    <section className="dashboard-grid">
      <div className="left-column">
        <section className="panel recommendation-panel" aria-labelledby="recommendation-heading">
          <div className="panel-heading"><div><p className="eyebrow">A GOOD NEXT STEP</p><h2 id="recommendation-heading">Recommended next run</h2></div><span className="recommendation-icon"><Icon name="spark"/></span></div>
          <div className="recommendation-main"><div className="run-type">{recommendation.title}</div><div className="recommendation-distance">{recommendation.distance}<span> km</span></div><p>{recommendation.detail}</p></div>
          <div className="why-box"><span className="why-icon">✳</span><div><strong>Why this recommendation?</strong><p>{recommendation.reason}</p></div></div>
        </section>

        <section id="activities" className="panel activities-panel" aria-labelledby="activities-heading">
          <div className="panel-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2 id="activities-heading">Recent activities</h2></div><a className="text-link" href="#activity-form">Add a run <span>↗</span></a></div>
          {!ready || sortedRuns.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="shoe"/></span><strong>No running activity yet.</strong><p>Start by adding your first run. Every journey begins somewhere.</p><a className="button button-secondary" href="#activity-form">Add your first run <span>＋</span></a></div> : <div className="activity-list">
            {sortedRuns.map((run) => <article className="activity-row" key={run.id}><span className="activity-shoe"><Icon name="shoe"/></span><div className="activity-details"><strong>{run.notes || "Morning run"}</strong><span><Icon name="calendar"/> {prettyDate(run.date)}</span></div><div className="activity-metric"><strong>{run.distance.toFixed(1)} <small>km</small></strong><span>Distance</span></div><div className="activity-metric"><strong>{formatDuration(run.duration)}</strong><span>Duration</span></div><div className="activity-metric"><strong>{formatPace(run.pace)} <small>/km</small></strong><span>Average pace</span></div><button className="delete-button" type="button" onClick={() => deleteRun(run.id)} aria-label={`Delete run on ${prettyDate(run.date)}`} title="Delete activity"><Icon name="trash"/></button></article>)}
          </div>}
        </section>
      </div>

      <aside className="right-column">
        <section className="panel form-panel" id="activity-form" aria-labelledby="form-heading">
          <div className="panel-heading"><div><p className="eyebrow">LOG YOUR MILES</p><h2 id="form-heading">Add a run</h2></div><span className="form-icon">＋</span></div>
          <form onSubmit={addRun} noValidate>
            <label className="field-label" htmlFor="run-date">Date</label><div className="input-wrap"><span className="input-icon"><Icon name="calendar"/></span><input id="run-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></div>
            <label className="field-label" htmlFor="distance">Distance</label><div className="input-wrap"><input id="distance" type="number" min="0.01" step="0.01" placeholder="e.g. 3.5" value={distance} onChange={(event) => setDistance(event.target.value)} required/><span className="input-suffix">km</span></div>
            <label className="field-label">Duration</label><div className="duration-inputs"><label><input aria-label="Duration hours" type="number" min="0" placeholder="0" value={hours} onChange={(event) => setHours(event.target.value)} /><span>hours</span></label><label><input aria-label="Duration minutes" type="number" min="0" max="59" placeholder="00" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><span>min</span></label><label><input aria-label="Duration seconds" type="number" min="0" max="59" placeholder="00" value={seconds} onChange={(event) => setSeconds(event.target.value)} /><span>sec</span></label></div>
            {distance && Number(distance) > 0 && (Number(hours || 0) + Number(minutes || 0) + Number(seconds || 0)) > 0 && <div className="pace-preview"><Icon name="clock"/><span>Calculated pace</span><strong>{formatPace((Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0)) / Number(distance))} /km</strong></div>}
            <label className="field-label" htmlFor="notes">Notes <span className="optional">Optional</span></label><textarea id="notes" rows={2} maxLength={120} placeholder="How did it feel?" value={notes} onChange={(event) => setNotes(event.target.value)}/>
            {error && <p className="form-message form-error" role="alert">{error}</p>}{saved && <p className="form-message form-success" role="status">Run saved. Nice work showing up!</p>}
            <button className="button button-primary submit-button" type="submit">Save activity <span>↗</span></button>
          </form>
        </section>

        <section className="panel profile-panel" aria-labelledby="profile-heading">
          <div className="profile-heading"><span className="profile-avatar"><Icon name="runs"/></span><div><p className="eyebrow">YOUR STARTING POINT</p><h2 id="profile-heading">Runner profile</h2></div></div>
          <label className="field-label" htmlFor="experience-level">Experience level</label><select id="experience-level" value={level} onChange={(event) => setLevel(event.target.value as ExperienceLevel)}><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option></select>
          <p className="profile-note">Your level helps tailor the distance in your next run suggestion.</p>
        </section>
        <p className="local-note"><span>⌑</span> Your runs are saved on this device only.</p>
      </aside>
    </section>
    <footer className="footer"><span>CAH KALCER COACH</span><span>Made for the joy of getting out there.</span></footer>
  </main>;
}
