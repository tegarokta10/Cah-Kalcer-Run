import type { Metadata } from "next";
import { RequestPasswordResetForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Reset your password | Cah Kalcer Run" };

export default function ForgotPasswordPage() {
  return <main className="auth-page">
    <section className="auth-card">
      <a href="/" className="brand auth-brand"><span className="brand-mark" aria-hidden="true">CK</span><span>Cah Kalcer<span className="brand-muted"> Run</span></span></a>
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Forgot your password?</h1>
      <RequestPasswordResetForm />
    </section>
  </main>;
}
