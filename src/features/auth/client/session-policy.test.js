/** @jest-environment node */
import { evaluateSession, SESSION_ACTIONS } from "./session-policy";

const MINUTE = 60 * 1000;
const base = {
  timeoutMs: 30 * MINUTE,
  warningMs: 1 * MINUTE,
  refreshIntervalMs: 10 * MINUTE,
};

describe("evaluateSession", () => {
  test("déconnecte après le délai d'inactivité", () => {
    const result = evaluateSession({ ...base, now: 30 * MINUTE, lastActivity: 0, lastRefresh: 0 });
    expect(result.action).toBe(SESSION_ACTIONS.LOGOUT);
  });

  test("déconnecte aussi au-delà du délai", () => {
    const result = evaluateSession({ ...base, now: 45 * MINUTE, lastActivity: 0, lastRefresh: 0 });
    expect(result.action).toBe(SESSION_ACTIONS.LOGOUT);
  });

  test("avertit pendant la dernière minute", () => {
    const result = evaluateSession({
      ...base,
      now: 29.5 * MINUTE,
      lastActivity: 0,
      lastRefresh: 0,
    });
    expect(result).toEqual({ action: SESSION_ACTIONS.WARN, remainingMs: 0.5 * MINUTE });
  });

  test("renouvelle le jeton d'un utilisateur actif", () => {
    const result = evaluateSession({
      ...base,
      now: 12 * MINUTE,
      lastActivity: 11 * MINUTE,
      lastRefresh: 1 * MINUTE,
    });
    expect(result.action).toBe(SESSION_ACTIONS.REFRESH);
  });

  test("ne renouvelle pas le jeton sans nouvelle activité", () => {
    const result = evaluateSession({
      ...base,
      now: 20 * MINUTE,
      lastActivity: 5 * MINUTE,
      lastRefresh: 6 * MINUTE,
    });
    expect(result.action).toBe(SESSION_ACTIONS.NONE);
  });

  test("ne fait rien pendant une utilisation normale", () => {
    const result = evaluateSession({
      ...base,
      now: 5 * MINUTE,
      lastActivity: 4 * MINUTE,
      lastRefresh: 0.5 * MINUTE,
    });
    expect(result).toEqual({ action: SESSION_ACTIONS.NONE, remainingMs: 29 * MINUTE });
  });
});
