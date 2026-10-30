"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isSignup = mode === "signup";

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "supabase_not_configured") {
      setError("Configure the Supabase URL and anon key in .env.local, then restart the app.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setMessage("Check your email to confirm your account, then log in.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to complete sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <a href="/" className="brand auth-brand"><span className="brand-mark" aria-hidden="true">CK</span><span>Cah Kalcer<span className="brand-muted"> Run</span></span></a>
      <p className="eyebrow">YOUR RUNNING SPACE</p>
      <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="auth-intro">{isSignup ? "Start tracking your progress and connecting your runs." : "Log in to see your activities and recommendations."}</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="auth-input" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="field-label" htmlFor="password">Password</label>
        <input className="auth-input" id="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
        {!isSignup && <Link className="auth-forgot-link" href="/forgot-password">Forgot password?</Link>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}</button>
      </form>
      <p className="auth-switch">{isSignup ? "Already have an account?" : "New to Cah Kalcer Run?"} <Link href={isSignup ? "/login" : "/register"}>{isSignup ? "Log in" : "Sign up"}</Link></p>
    </section>
  </main>;
}
