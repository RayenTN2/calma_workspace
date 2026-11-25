"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  UserPlus,
} from "lucide-react";

import {
  PROFILE_OPTIONS,
  REGISTER_MESSAGES,
  registerAccount,
  validateRegisterInput,
} from "@/features/auth/client/auth-client";

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileType, setProfileType] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);

  function clearFieldError(field) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) {
      setGeneralError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setGeneralError("");
    const formData = {
      firstName,
      lastName,
      email,
      phone,
      profileType,
      password,
    };

    const errors = validateRegisterInput(formData);
    if (errors) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const result = await registerAccount(formData);

    if (!result.ok) {
      setSubmitting(false);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      setGeneralError(result.message || REGISTER_MESSAGES.server);
      return;
    }

    setSubmitting(false);
    setRegisteredData({
      email: email.trim(),
      profileType,
    });
    setIsSuccess(true);
  }

  if (isSuccess && registeredData) {
    const selectedProfile = PROFILE_OPTIONS.find(
      (opt) => opt.value === registeredData.profileType
    );
    const profileLabel = selectedProfile ? selectedProfile.label : registeredData.profileType;

    return (
      <div data-testid="registration-confirmation" className="flex flex-col items-center py-2 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#edf4ef] text-[#2f6b53]">
          <CheckCircle2 size={36} aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight text-[#1f3128]">
          Vérifiez votre adresse e-mail
        </h2>

        <p className="mb-5 text-sm text-[#6b7a72]">
          Votre demande de création de compte pour le profil{" "}
          <strong className="font-semibold text-[#1f3128]">{profileLabel}</strong> a bien été enregistrée.
        </p>

        <div className="mb-6 w-full rounded-xl border border-[#dde4de] bg-[#edf4ef] p-4 text-left text-sm text-[#245641]">
          <p className="mb-1 font-semibold">Un code vous a été envoyé</p>
          <p className="text-xs leading-relaxed text-[#245641]/85">
            Saisissez le code reçu à l&apos;adresse{" "}
            <strong className="font-semibold">{registeredData.email}</strong>.
          </p>
        </div>

        <Link
          href={`/verify-email?email=${encodeURIComponent(registeredData.email)}`}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2f6b53] px-4 text-[15px] font-semibold text-white transition hover:bg-[#245641] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6b53]"
        >
          <span>Vérifier mon adresse e-mail</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-describedby="register-feedback">
      <div id="register-feedback" aria-live="polite">
        {generalError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#e6bfb5] bg-[#fff0ee] px-3.5 py-3 text-sm text-[#a2473e]">
            <AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" />
            <span>{generalError}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="firstName" className="text-sm font-semibold text-[#1f3128]">
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearFieldError("firstName");
            }}
            aria-invalid={Boolean(fieldErrors.firstName) || undefined}
            aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
            className="h-11 rounded-xl border border-[#dde4de] bg-white px-3.5 text-[15px] text-[#1f3128] outline-none transition placeholder:text-[#6b7a72] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
            placeholder="Jean"
          />
          {fieldErrors.firstName && (
            <span id="firstName-error" role="alert" className="mt-0.5 flex items-center gap-1 text-xs text-[#a2473e]">
              <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
              <span>{fieldErrors.firstName}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lastName" className="text-sm font-semibold text-[#1f3128]">
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearFieldError("lastName");
            }}
            aria-invalid={Boolean(fieldErrors.lastName) || undefined}
            aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
            className="h-11 rounded-xl border border-[#dde4de] bg-white px-3.5 text-[15px] text-[#1f3128] outline-none transition placeholder:text-[#6b7a72] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
            placeholder="Dupont"
          />
          {fieldErrors.lastName && (
            <span id="lastName-error" role="alert" className="mt-0.5 flex items-center gap-1 text-xs text-[#a2473e]">
              <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
              <span>{fieldErrors.lastName}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profileType" className="text-sm font-semibold text-[#1f3128]">
          Profil
        </label>
        <select
          id="profileType"
          name="profileType"
          required
          value={profileType}
          onChange={(e) => {
            setProfileType(e.target.value);
            clearFieldError("profileType");
          }}
          aria-invalid={Boolean(fieldErrors.profileType) || undefined}
          aria-describedby={fieldErrors.profileType ? "profileType-error" : undefined}
          className="h-11 rounded-xl border border-[#dde4de] bg-white px-3 text-[15px] text-[#1f3128] outline-none transition focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
        >
          <option value="">Sélectionnez un profil</option>
          {PROFILE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {fieldErrors.profileType && (
          <span id="profileType-error" role="alert" className="mt-0.5 flex items-center gap-1 text-xs text-[#a2473e]">
            <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
            <span>{fieldErrors.profileType}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-semibold text-[#1f3128]">
          Numéro de téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            clearFieldError("phone");
          }}
          aria-invalid={Boolean(fieldErrors.phone) || undefined}
          aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
          className="h-11 rounded-xl border border-[#dde4de] bg-white px-3.5 text-[15px] text-[#1f3128] outline-none transition placeholder:text-[#6b7a72] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
          placeholder="ex. 20 123 456 ou +216 20 123 456"
        />
        {fieldErrors.phone && (
          <span id="phone-error" role="alert" className="mt-0.5 flex items-center gap-1 text-xs text-[#a2473e]">
            <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
            <span>{fieldErrors.phone}</span>
          </span>
        )}
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
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          aria-invalid={Boolean(fieldErrors.email) || undefined}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className="h-11 rounded-xl border border-[#dde4de] bg-white px-3.5 text-[15px] text-[#1f3128] outline-none transition placeholder:text-[#6b7a72] focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
          placeholder="vous@exemple.com"
        />
        {fieldErrors.email && (
          <span id="email-error" role="alert" className="mt-0.5 flex items-center gap-1 text-xs text-[#a2473e]">
            <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
            <span>{fieldErrors.email}</span>
          </span>
        )}
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
            aria-invalid={Boolean(fieldErrors.password) || undefined}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            className="h-11 w-full rounded-xl border border-[#dde4de] bg-white pl-3.5 pr-11 text-[15px] text-[#1f3128] outline-none transition focus:border-[#2f6b53] focus:ring-2 focus:ring-[#2f6b53]/20"
            placeholder="8 caractères minimum"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#6b7a72] hover:text-[#1f3128] focus-visible:outline-2 focus-visible:outline-[#2f6b53]"
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {fieldErrors.password && (
          <span id="password-error" role="alert" className="mt-0.5 flex items-center gap-1 text-xs text-[#a2473e]">
            <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
            <span>{fieldErrors.password}</span>
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f6b53] px-4 text-[15px] font-semibold text-white transition hover:bg-[#245641] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6b53] disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus size={18} aria-hidden="true" />
        )}
        {submitting ? "Création du compte…" : "S'inscrire"}
      </button>

      <p className="mt-2 text-center text-sm text-[#6b7a72]">
        Vous avez déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-[#2f6b53] hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
