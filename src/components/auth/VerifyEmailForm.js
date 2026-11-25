"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

export default function VerifyEmailForm({ initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.message || "Impossible de vérifier le code. Vérifiez votre saisie et réessayez.");
        return;
      }
      setVerified(true);
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (verified) {
    return (
      <div data-testid="email-verification-success" className="flex flex-col items-center py-2 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#edf4ef] text-[#2f6b53]">
          <CheckCircle2 size={36} aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Adresse e-mail vérifiée</h2>
        <p className="mb-6 text-sm text-[#6b7a72]">Votre compte est activé. Vous pouvez maintenant vous connecter.</p>
        <Link href="/login" className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2f6b53] px-4 text-[15px] font-semibold text-white transition hover:bg-[#245641] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6b53]">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-describedby="verification-feedback">
      <div id="verification-feedback" aria-live="polite">
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#e6bfb5] bg-[#fff0ee] px-3.5 py-3 text-sm text-[#a2473e]">
            <AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="verification-email" className="text-sm font-semibold text-[#1f3128]">Adresse e-mail</label>
        <input
          id="verification-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-xl border border-[#dde4de] bg-white px-3.5 text-[15px] text-[#1f3128] outline-none transition placeholder:text-[#6b7a72] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
          placeholder="vous@exemple.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="verification-code" className="text-sm font-semibold text-[#1f3128]">Code de vérification</label>
        <input
          id="verification-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 rounded-xl border border-[#dde4de] bg-white px-3.5 text-center text-xl font-semibold tracking-[0.45em] text-[#1f3128] outline-none transition placeholder:text-[#a5b0a8] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
          placeholder="000000"
          aria-describedby="verification-code-hint"
        />
        <p id="verification-code-hint" className="text-xs text-[#6b7a72]">Le code est valable pendant 10 minutes.</p>
      </div>

      <button
        type="submit"
        disabled={submitting || !email.trim() || code.length !== 6}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f6b53] px-4 text-[15px] font-semibold text-white transition hover:bg-[#245641] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6b53] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
        {submitting ? "Vérification…" : "Vérifier mon adresse e-mail"}
      </button>
    </form>
  );
}
