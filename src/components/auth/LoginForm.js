"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Info, LoaderCircle, LogIn } from "lucide-react";

import { login, validateLoginInput } from "@/features/auth/client/auth-client";
import { getHomePathForRole } from "@/features/auth/roles";

// Messages affichés selon le motif d'arrivée sur la page (?reason=...).
export const LOGIN_NOTICES = Object.freeze({
  logout: "Vous avez bien été déconnecté.",
  idle: "Vous avez été déconnecté après une période d'inactivité.",
  expired: "Votre session a expiré. Veuillez vous reconnecter.",
});

export default function LoginForm({ next = null, reason = null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notice = !error && reason ? LOGIN_NOTICES[reason] : null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await login({ email, password });

    if (!result.ok) {
      setError(result.message);
      setPassword("");
      setSubmitting(false);
      return;
    }

    router.replace(next ?? getHomePathForRole(result.user?.role));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-describedby="login-feedback">
      <div id="login-feedback" aria-live="polite">
        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#e6bfb5] bg-[#fff0ee] px-3.5 py-3 text-sm text-[#a2473e]">
            <AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : notice ? (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[#dde4de] bg-[#edf4ef] px-3.5 py-3 text-sm text-[#245641]">
            <Info size={18} className="mt-px shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-[#1f3128]">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          className="h-11 rounded-xl border border-[#dde4de] bg-white px-3.5 text-[15px] text-[#1f3128] outline-none transition placeholder:text-[#6b7a72] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
          placeholder="vous@exemple.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-[#1f3128]">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className="h-11 w-full rounded-xl border border-[#dde4de] bg-white pl-3.5 pr-11 text-[15px] text-[#1f3128] outline-none transition focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#6b7a72] hover:text-[#1f3128] focus-visible:outline-2 focus-visible:outline-[#2f6b53]"
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f6b53] px-4 text-[15px] font-semibold text-white transition hover:bg-[#245641] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6b53] disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <LogIn size={18} aria-hidden="true" />
        )}
        {submitting ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
