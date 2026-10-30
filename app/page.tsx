import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cah Kalcer Run | Your AI Running Coach",
  description: "Track your runs, understand your progress, and get a practical next-run suggestion with Cah Kalcer Run.",
};

function Brand() {
  return <Link className="site-brand" href="/" aria-label="Cah Kalcer Run home">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><path d="M4 18c3.3 0 5.1-1.8 6-5.2l1.3-4.2 2.8 2.7c2.1 2.1 4.5 2.9 8.6 3.1v5H4v-1.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m12 9 1.6-2.8 2.4 2.1M5 22h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></span>
    <span>Cah Kalcer <strong>Run</strong></span>
  </Link>;
}

function FeatureIcon({ name }: { name: "log" | "strava" | "progress" | "coach" }) {
  const common = { width: 25, height: 25, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const content = {
    log: <><path d="M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2Z"/><path d="M8 2v4m8-4v4M4 9h16m-12 4h8m-8 4h5"/></>,
    strava: <><path d="m11 3 5.4 9.5h-3.5L11 8.7l-1.9 3.8H5.6L11 3Z"/><path d="m16 12.5 3.3 5.8h-3.5l-1.5-2.7"/></>,
    progress: <><path d="M4 19.5h16M6.5 16v-5m5.5 5V6m5.5 10V9"/><path d="m5 7 5-3 4 2 5-3"/></>,
    coach: <><circle cx="12" cy="5" r="2.3"/><path d="m9.6 9.1 3.5 1.1 2.2 3.1 3.4.4M10 9l-2.1 4.1-3 2.4m7.8-5.3-1.2 4.7-3.1 4m4.4-4 3.7 3.5"/></>,
  }[name];
  return <svg {...common}>{content}</svg>;
}

const featureItems = [
  { id: "01", icon: "log" as const, title: "Manual run log", text: "Add a date, distance, duration, and an optional note. Cah Kalcer Run calculates your pace." },
  { id: "02", icon: "strava" as const, title: "Strava import", text: "Connect your account and sync running activities when you choose." },
  { id: "03", icon: "progress" as const, title: "Running summary", text: "Review total distance, run count, average pace, and your longest run." },
  { id: "04", icon: "coach" as const, title: "Next-run suggestion", text: "Ask Gemini for a personal suggestion, with a rule-based recommendation available in the dashboard." },
];

export default function LandingPage() {
  return <div className="landing-page">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <Brand />
        <nav className="landing-nav" aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a></nav>
        <div className="landing-actions"><Link className="login-link" href="/login">Login</Link><Link className="button button-primary landing-cta" href="/register">Create your running log</Link></div>
        <details className="landing-menu"><summary aria-label="Open menu"><span>Menu</span><i aria-hidden="true"><b/><b/><b/></i></summary><nav aria-label="Mobile navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/login">Login</Link><Link className="menu-cta" href="/register">Create your running log</Link></nav></details>
      </div>
    </header>

    <main id="main-content">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-container hero-layout"><div className="hero-copy">
          <p className="hero-kicker"><span className="route-knot" aria-hidden="true"/> A running log for the miles you make</p>
          <h1 id="hero-title">Run smarter.<br/><em>One run at a time.</em></h1>
          <p className="hero-lead">Cah Kalcer Run helps beginner runners keep a clear record, follow their progress, and choose a practical next session.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/register">Create your running log</Link><Link className="text-link" href="/login">I already have an account <span aria-hidden="true">-&gt;</span></Link></div>
          <p className="hero-note">Log runs by hand or bring in your Strava history.</p>
        </div><div className="route-illustration" aria-hidden="true"><div className="route-illustration-label">A PATH THAT IS YOURS</div>
          <svg className="route-drawing" viewBox="0 0 540 390" fill="none"><path className="route-shadow" d="M31 297c63-20 83-102 153-91 54 9 40 84 104 75 65-9 44-122 125-126 43-2 73 22 105 4"/><path className="route-stroke" d="M31 297c63-20 83-102 153-91 54 9 40 84 104 75 65-9 44-122 125-126 43-2 73 22 105 4"/><circle cx="31" cy="297" r="9" fill="#C66B3D"/><circle cx="518" cy="159" r="11" fill="#F7F8F4" stroke="#365C45" strokeWidth="4"/><path d="M78 304h54M413 130h40" stroke="#A9BAA9" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 7"/><path d="M104 281c15-16 31-23 48-23m207-45c10-13 19-18 31-21" stroke="#A9BAA9" strokeWidth="2" strokeLinecap="round"/><path d="m178 112 7-14 7 14m154 207 7-14 7 14" stroke="#C66B3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="185" cy="98" r="3" fill="#C66B3D"/><circle cx="346" cy="305" r="3" fill="#C66B3D"/></svg>
          <div className="route-caption"><span className="route-caption-mark" aria-hidden="true">R</span><span>Start where you are.<br/>Build at your pace.</span></div>
        </div></div>
        <div className="landing-container hero-baseline"><span>YOUR ACTIVITY, KEPT CLEAR</span><span>Manual log <i/> Strava sync <i/> Personal suggestions</span></div>
      </section>

      <section className="value-section" aria-labelledby="value-title"><div className="landing-container value-layout"><div className="value-heading"><p className="section-kicker">A clearer way to keep going</p><h2 id="value-title">You do not need a training plan to understand your next run.</h2></div><div className="value-copy"><p>Keep the details that matter in one place. Cah Kalcer Run turns your recent activity into simple context, so the next suggestion is easier to follow.</p><Link className="text-link" href="/register">Start with your first run <span aria-hidden="true">-&gt;</span></Link></div></div><div className="landing-container value-rail"><span>Track your runs</span><span className="rail-connector" aria-hidden="true"/><span>Understand your progress</span><span className="rail-connector" aria-hidden="true"/><span>Choose a next step</span></div></section>

      <section className="features-section" id="features" aria-labelledby="features-title"><div className="landing-container features-layout"><div className="features-intro"><p className="section-kicker">The essentials, in one place</p><h2 id="features-title">A running companion that keeps things simple.</h2><p>Use the parts that fit your routine. Add runs manually, or sync with Strava when you want to bring over your activity.</p></div><div className="feature-list">{featureItems.map((item)=><article className="feature-row" key={item.id}><span className="feature-index">{item.id}</span><span className="feature-icon"><FeatureIcon name={item.icon}/></span><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></div></section>

      <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-title"><div className="landing-container workflow-heading"><div><p className="section-kicker">A practical routine</p><h2 id="workflow-title">From your run to a useful next step.</h2></div><p>Start with the activity you have. The dashboard keeps the rest easy to read.</p></div><div className="landing-container workflow-track"><article><span className="workflow-stop">01</span><div><h3>Record</h3><p>Add a run yourself or sync activities from Strava.</p></div></article><span className="workflow-line" aria-hidden="true"/><article><span className="workflow-stop">02</span><div><h3>Review</h3><p>See distance, pace, and recent activity together.</p></div></article><span className="workflow-line" aria-hidden="true"/><article><span className="workflow-stop workflow-stop-end">03</span><div><h3>Choose what is next</h3><p>Use your running history to get a simple session suggestion.</p></div></article></div></section>

      <section className="coach-section" aria-labelledby="coach-title"><div className="landing-container coach-layout"><div className="coach-copy"><p className="section-kicker">Personal, not complicated</p><h2 id="coach-title">Your running data.<br/><em>A little more useful.</em></h2><p>When you ask, Gemini uses your recent running history to suggest a manageable next session. The dashboard also keeps a rule-based suggestion available if AI cannot respond.</p><p className="coach-note">Suggestions support your own judgment. They are not medical advice.</p></div><div className="coach-example" aria-label="Illustration showing how an activity informs a next-run suggestion"><div className="example-heading"><span>HOW A SUGGESTION TAKES SHAPE</span><span className="example-route-mark" aria-hidden="true"><FeatureIcon name="coach"/></span></div><div className="example-flow"><div><span className="example-label">YOUR RECENT RUNS</span><strong>Distance</strong><strong>Duration</strong><strong>Pace</strong></div><span className="example-arrow" aria-hidden="true">-&gt;</span><div className="example-result"><span className="example-label">NEXT RUN IDEA</span><strong>Easy run</strong><p>A comfortable effort, based on your activity.</p></div></div><p className="example-footnote">Illustration only. Your suggestion uses your own running history.</p></div></div></section>

      <section className="strava-section" aria-labelledby="strava-title"><div className="landing-container strava-layout"><div className="strava-sign" aria-hidden="true"><FeatureIcon name="strava"/></div><div><p className="section-kicker">Already using Strava?</p><h2 id="strava-title">Bring your runs into your log.</h2><p>Connect Strava after you create an account. You choose when to sync, and imported activities stay in your Cah Kalcer Run history if you disconnect later.</p></div><Link className="button button-light" href="/register">Connect your runs</Link></div></section>

      <section className="beginner-section" aria-labelledby="beginner-title"><div className="landing-container beginner-layout"><div><p className="section-kicker">A good place to begin</p><h2 id="beginner-title">Made for the runner you are today.</h2><p>You can start without knowing complex training terms. Cah Kalcer Run focuses on distance, pace, consistency, and a clear next session.</p></div><p className="beginner-quote">Small steps count.<span>Keep the routine manageable and build from there.</span></p></div></section>

      <section className="final-cta" aria-labelledby="final-title"><div className="landing-container final-cta-layout"><div><p className="section-kicker">Ready when you are</p><h2 id="final-title">Make space for your next run.</h2><p>Create a running log and start with the activity you have.</p></div><div className="final-actions"><Link className="button button-light" href="/register">Create your running log</Link><Link className="final-login" href="/login">Login</Link></div></div></section>
    </main>

    <footer className="landing-footer"><div className="landing-container footer-main"><div><Brand/><p>Run smarter, one run at a time.</p></div><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/login">Login</Link><Link href="/register">Create your running log</Link></nav></div><div className="landing-container footer-bottom"><span>Copyright 2026 Cah Kalcer Run</span><span>Your running log, at your pace.</span></div></footer>
  </div>;
}
