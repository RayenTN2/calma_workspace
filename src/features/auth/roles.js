// Rôles, pages d'accueil par rôle et règles des routes protégées (US-02, S1-T10).
// Fichier sans dépendance serveur : utilisable par le proxy, les pages et le client.

export const ROLES = Object.freeze({
  USER: "USER",
  GERANT: "GERANT",
  AGENT_PAIEMENT: "AGENT_PAIEMENT",
  AGENT_SUIVI: "AGENT_SUIVI",
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const LOGIN_PATH = "/login";
export const ACCESS_DENIED_PATH = "/acces-refuse";

// Page vers laquelle chaque rôle arrive après la connexion.
// Les espaces agents seront créés aux Sprints 3 (US-09, US-10).
const ROLE_HOME_PATHS = Object.freeze({
  [ROLES.USER]: "/rooms",
  [ROLES.GERANT]: "/gerant/salles",
  [ROLES.AGENT_PAIEMENT]: "/agent-paiement",
  [ROLES.AGENT_SUIVI]: "/agent-suivi",
});

export function getHomePathForRole(role) {
  return ROLE_HOME_PATHS[role] ?? "/rooms";
}

// Préfixes de pages réservées. `roles: ALL_ROLES` = tout utilisateur connecté.
// Le proxy vérifie la session ; chaque page revérifie le rôle en base (requireRole).
export const PROTECTED_ROUTES = Object.freeze([
  { prefix: "/gerant", roles: [ROLES.GERANT] },
  { prefix: "/agent-paiement", roles: [ROLES.AGENT_PAIEMENT] },
  { prefix: "/agent-suivi", roles: [ROLES.AGENT_SUIVI] },
  { prefix: "/reservations", roles: ALL_ROLES },
]);

/** Rôles autorisés pour un chemin, ou null si la page est publique. */
export function getRequiredRoles(pathname) {
  const rule = PROTECTED_ROUTES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return rule ? rule.roles : null;
}

/**
 * Chemin de redirection après connexion, limité au site lui-même
 * (évite les redirections ouvertes du type ?next=https://site-malveillant).
 */
export function sanitizeNextPath(value) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  // "//hote" et "/\hote" sont interprétés comme des URL externes par les navigateurs.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  if (value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`)) return null;
  return value;
}

/** URL de la page de connexion avec la page demandée et le motif éventuel. */
export function buildLoginUrl({ next, reason } = {}) {
  const params = new URLSearchParams();
  const safeNext = sanitizeNextPath(next);
  if (safeNext) params.set("next", safeNext);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH;
}
