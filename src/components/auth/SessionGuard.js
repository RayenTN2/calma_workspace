"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";

import {
  ACTIVITY_STORAGE_KEY,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  LOGOUT_STORAGE_KEY,
  SESSION_CHECK_INTERVAL_MS,
  TOKEN_REFRESH_INTERVAL_MS,
} from "@/features/auth/config";
import { evaluateSession, SESSION_ACTIONS } from "@/features/auth/client/session-policy";
import { logout, refreshSession } from "@/features/auth/client/auth-client";
import { buildLoginUrl } from "@/features/auth/roles";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "mousemove", "wheel", "touchstart", "scroll"];
const STORAGE_WRITE_THROTTLE_MS = 5000;

function readStoredActivity() {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeStoredActivity(value) {
  try {
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(value));
  } catch {
    // Stockage indisponible : l'inactivité reste suivie dans cet onglet.
  }
}

/**
 * Déconnexion automatique après inactivité (US-02, S1-T09).
 * À placer dans toute page ou layout réservé aux utilisateurs connectés.
 * - garde la session active tant que l'utilisateur interagit (renouvellement du jeton) ;
 * - avertit une minute avant la déconnexion ;
 * - déconnecte après le délai d'inactivité, dans tous les onglets ouverts.
 */
export default function SessionGuard({
  timeoutMs = IDLE_TIMEOUT_MS,
  warningMs = IDLE_WARNING_MS,
  refreshIntervalMs = TOKEN_REFRESH_INTERVAL_MS,
  checkIntervalMs = SESSION_CHECK_INTERVAL_MS,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [remainingMs, setRemainingMs] = useState(null);

  const lastActivityRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const lastStorageWriteRef = useRef(0);
  const busyRef = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    lastActivityRef.current = Math.max(now, readStoredActivity());
    // Âge du jeton inconnu au chargement : il sera renouvelé dès la première vérification.
    lastRefreshRef.current = 0;
    endedRef.current = false;
    writeStoredActivity(lastActivityRef.current);

    function endSession(reason) {
      if (endedRef.current) return;
      endedRef.current = true;
      router.replace(buildLoginUrl({ next: pathname, reason }));
      router.refresh();
    }

    function recordActivity() {
      const time = Date.now();
      lastActivityRef.current = time;
      if (time - lastStorageWriteRef.current >= STORAGE_WRITE_THROTTLE_MS) {
        lastStorageWriteRef.current = time;
        writeStoredActivity(time);
      }
    }

    async function check() {
      if (busyRef.current || endedRef.current) return;

      // Activité éventuelle dans un autre onglet.
      lastActivityRef.current = Math.max(lastActivityRef.current, readStoredActivity());

      const { action, remainingMs: left } = evaluateSession({
        now: Date.now(),
        lastActivity: lastActivityRef.current,
        lastRefresh: lastRefreshRef.current,
        timeoutMs,
        warningMs,
        refreshIntervalMs,
      });

      setRemainingMs(action === SESSION_ACTIONS.WARN ? left : null);

      if (action === SESSION_ACTIONS.LOGOUT) {
        busyRef.current = true;
        await logout();
        busyRef.current = false;
        endSession("idle");
        return;
      }

      if (action === SESSION_ACTIONS.REFRESH) {
        busyRef.current = true;
        const result = await refreshSession();
        busyRef.current = false;
        if (result === "ok") {
          lastRefreshRef.current = Date.now();
        } else if (result === "expired") {
          endSession("expired");
        }
        // "error" (réseau) : nouvelle tentative à la prochaine vérification.
      }
    }

    function handleStorage(event) {
      if (event.key === LOGOUT_STORAGE_KEY && event.newValue) {
        // Déconnexion effectuée dans un autre onglet.
        endSession("logout");
      }
    }

    function handleVisibility() {
      // Les minuteries sont ralenties en arrière-plan : on revérifie au retour.
      if (document.visibilityState === "visible") check();
    }

    ACTIVITY_EVENTS.forEach((type) =>
      window.addEventListener(type, recordActivity, { passive: true }),
    );
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(check, checkIntervalMs);

    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, recordActivity));
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [router, pathname, timeoutMs, warningMs, refreshIntervalMs, checkIntervalMs]);

  if (remainingMs === null) return null;

  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <div
      role="alertdialog"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-text"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[#e6dccb] bg-[#f8f2e8] p-4 text-[#1f3128] shadow-lg sm:left-auto sm:right-6 sm:mx-0"
    >
      <Clock3 size={20} className="mt-0.5 shrink-0 text-[#8f6a3a]" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-2">
        <p id="idle-warning-title" className="text-sm font-semibold">
          Êtes-vous toujours là ?
        </p>
        <p id="idle-warning-text" className="text-sm text-[#4a5b52]">
          Sans activité, vous serez déconnecté dans {seconds} seconde{seconds > 1 ? "s" : ""}.
        </p>
        <button
          type="button"
          onClick={() => {
            lastActivityRef.current = Date.now();
            writeStoredActivity(lastActivityRef.current);
            setRemainingMs(null);
          }}
          className="self-start rounded-lg bg-[#2f6b53] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#245641] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6b53]"
        >
          Rester connecté
        </button>
      </div>
    </div>
  );
}
