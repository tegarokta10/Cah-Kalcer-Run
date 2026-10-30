import type { Metadata } from "next";
import { SetNewPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = { title: "Choose a new password | Cah Kalcer Run" };

export default function ResetPasswordPage() {
  return <main className="auth-page">
    <section className="auth-card">
      <a href="/" className="brand auth-brand"><span className="brand-mark" aria-hidden="true">CK</span><span>Cah Kalcer<span className="brand-muted"> Run</span></span></a>
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Choose a new password</h1>
      <SetNewPasswordForm />
    </section>
  </main>;
}
