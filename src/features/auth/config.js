// Paramètres de session côté client (US-02, S1-T09).

const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;

function readMinutes(value, fallback) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback;
}

// Décision ouverte n°10 : délai d'inactivité avant déconnexion automatique.
// 30 minutes est une valeur provisoire, modifiable sans toucher au code via
// NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES dans .env.local.
export const IDLE_TIMEOUT_MS =
  readMinutes(
    process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES,
    DEFAULT_IDLE_TIMEOUT_MINUTES,
  ) *
  60 *
  1000;

// Avertissement affiché avant la déconnexion automatique.
export const IDLE_WARNING_MS = 60 * 1000;

// Le jeton d'accès expire après 15 minutes (S1-T07) : tant que l'utilisateur est
// actif, on le renouvelle toutes les 10 minutes via /api/auth/refresh.
export const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// Fréquence de vérification de l'inactivité (calcul trivial, et le compte à rebours
// de l'avertissement est ainsi mis à jour chaque seconde).
export const SESSION_CHECK_INTERVAL_MS = 1000;

// Clé partagée entre onglets : une activité dans un onglet garde les autres connectés,
// et une déconnexion dans un onglet déconnecte les autres.
export const ACTIVITY_STORAGE_KEY = "calma:lastActivity";
export const LOGOUT_STORAGE_KEY = "calma:logout";
