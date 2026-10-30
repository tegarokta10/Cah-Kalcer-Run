"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RequestPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "invalid_reset_link") {
      setError("That reset link is invalid or has expired. Request a new one to continue.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/recovery-callback", window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setMessage("If an account exists for that email, a password reset link will arrive shortly. Check your inbox and spam folder.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a password reset. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <p className="auth-intro">Enter the email address on your account. We will send a link to choose a new password.</p>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="recovery-email">Email</label>
      <input className="auth-input" id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Sending link..." : "Send reset link"}</button>
    </form>
    <p className="auth-switch"><Link href="/login">Back to login</Link></p>
  </>;
}

export function SetNewPasswordForm() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      setSessionError(true);
      setSessionReady(true);
      return () => { active = false; };
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setSessionReady(true);
    }).catch(() => {
      if (!active) return;
      setHasSession(false);
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setHasSession(Boolean(session));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) return setError("Use at least 8 characters for your new password.");
    if (password !== confirmPassword) return setError("The passwords do not match.");

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. Taking you to your running log...");
      window.setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 900);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update your password. Request a new reset link and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionReady) return <p className="auth-intro" role="status">Checking your reset link...</p>;
  if (sessionError) return <p className="auth-error" role="alert">Supabase is not configured for this deployment. Please contact the site administrator.</p>;
  if (!hasSession) return <>
    <p className="auth-error" role="alert">This password reset link is invalid or has expired. Request a new one to continue.</p>
    <p className="auth-switch"><Link href="/forgot-password">Request another reset link</Link></p>
  </>;

  return <>
    <p className="auth-intro">Choose a new password for your account. Use at least 8 characters.</p>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="new-password">New password</label>
      <input className="auth-input" id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
      <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
      <input className="auth-input" id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Updating password..." : "Update password"}</button>
    </form>
  </>;
}
