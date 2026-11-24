/** @jest-environment node */
import {
  buildLoginUrl,
  getHomePathForRole,
  getRequiredRoles,
  ROLES,
  sanitizeNextPath,
} from "./roles";

describe("getHomePathForRole", () => {
  test.each([
    [ROLES.USER, "/rooms"],
    [ROLES.GERANT, "/gerant/salles"],
    [ROLES.AGENT_PAIEMENT, "/agent-paiement"],
    [ROLES.AGENT_SUIVI, "/agent-suivi"],
  ])("%s arrive sur %s", (role, path) => {
    expect(getHomePathForRole(role)).toBe(path);
  });

  test("un rôle inconnu arrive sur la recherche de salles", () => {
    expect(getHomePathForRole(undefined)).toBe("/rooms");
  });
});

describe("getRequiredRoles", () => {
  test("protège l'espace gérant et ses sous-pages", () => {
    expect(getRequiredRoles("/gerant")).toEqual([ROLES.GERANT]);
    expect(getRequiredRoles("/gerant/salles")).toEqual([ROLES.GERANT]);
  });

  test("protège les espaces agents", () => {
    expect(getRequiredRoles("/agent-paiement")).toEqual([ROLES.AGENT_PAIEMENT]);
    expect(getRequiredRoles("/agent-suivi/jour")).toEqual([ROLES.AGENT_SUIVI]);
  });

  test("les pages publiques ne sont pas protégées", () => {
    expect(getRequiredRoles("/")).toBeNull();
    expect(getRequiredRoles("/login")).toBeNull();
    expect(getRequiredRoles("/rooms")).toBeNull();
  });

  test("ne confond pas un préfixe avec un autre chemin", () => {
    expect(getRequiredRoles("/gerantx")).toBeNull();
  });
});

describe("sanitizeNextPath", () => {
  test("accepte un chemin interne", () => {
    expect(sanitizeNextPath("/gerant/salles?tab=1")).toBe("/gerant/salles?tab=1");
  });

  test.each([
    ["https://site-malveillant.com"],
    ["//site-malveillant.com"],
    ["/\\site-malveillant.com"],
    ["javascript:alert(1)"],
    ["salles"],
    ["/login"],
    ["/login?next=/x"],
    [undefined],
    [42],
  ])("refuse %p", (value) => {
    expect(sanitizeNextPath(value)).toBeNull();
  });
});

describe("buildLoginUrl", () => {
  test("sans paramètre", () => {
    expect(buildLoginUrl()).toBe("/login");
  });

  test("avec la page demandée et le motif", () => {
    expect(buildLoginUrl({ next: "/gerant/salles", reason: "idle" })).toBe(
      "/login?next=%2Fgerant%2Fsalles&reason=idle",
    );
  });

  test("ignore une page de destination externe", () => {
    expect(buildLoginUrl({ next: "https://evil.example" })).toBe("/login");
  });
});
