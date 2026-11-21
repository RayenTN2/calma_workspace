// Règle de décision de l'inactivité (US-02, S1-T09), sans effet de bord : testable seule.

export const SESSION_ACTIONS = Object.freeze({
  NONE: "none",
  WARN: "warn",
  REFRESH: "refresh",
  LOGOUT: "logout",
});

/**
 * Que faire maintenant, selon la dernière activité et le dernier renouvellement ?
 * - inactif depuis `timeoutMs` ou plus            → LOGOUT
 * - inactif depuis `timeoutMs - warningMs` ou plus → WARN (sans renouveler le jeton)
 * - actif et jeton renouvelé il y a `refreshIntervalMs` ou plus → REFRESH
 * - sinon                                          → NONE
 */
export function evaluateSession({
  now,
  lastActivity,
  lastRefresh,
  timeoutMs,
  warningMs,
  refreshIntervalMs,
}) {
  const idleFor = now - lastActivity;

  if (idleFor >= timeoutMs) {
    return { action: SESSION_ACTIONS.LOGOUT, remainingMs: 0 };
  }

  const remainingMs = timeoutMs - idleFor;

  if (remainingMs <= warningMs) {
    return { action: SESSION_ACTIONS.WARN, remainingMs };
  }

  // Seule une activité postérieure au dernier renouvellement justifie un nouveau jeton.
  if (now - lastRefresh >= refreshIntervalMs && lastActivity > lastRefresh) {
    return { action: SESSION_ACTIONS.REFRESH, remainingMs };
  }

  return { action: SESSION_ACTIONS.NONE, remainingMs };
}
