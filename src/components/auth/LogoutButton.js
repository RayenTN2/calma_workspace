"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { logout } from "@/features/auth/client/auth-client";
import { buildLoginUrl } from "@/features/auth/roles";

export const LOGOUT_FAILED_MESSAGE = "La déconnexion a échoué. Veuillez réessayer.";

/** Bouton de déconnexion réutilisable (US-02, S1-T08). */
export default function LogoutButton({ className, label = "Déconnexion" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setFailed(false);

    const ok = await logout();

    if (!ok) {
      // Les cookies n'ont pas été supprimés côté serveur : on reste sur la page
      // plutôt que de laisser croire à une déconnexion.
      setFailed(true);
      setPending(false);
      return;
    }

    router.replace(buildLoginUrl({ reason: "logout" }));
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={pending} className={className} aria-busy={pending}>
        <LogOut size={16} aria-hidden="true" /> {pending ? "Déconnexion…" : label}
      </button>
      {failed ? (
        <p role="alert" className="mt-2 text-xs text-[#a2473e]">
          {LOGOUT_FAILED_MESSAGE}
        </p>
      ) : null}
    </>
  );
}
