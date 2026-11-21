/** @jest-environment node */

// Contrôles côté serveur des pages protégées : session, expiration et rôle.

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url) => {
    // Comme Next.js, redirect() interrompt le rendu en levant une erreur.
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
jest.mock("./jwt", () => ({ verifyAccessToken: jest.fn() }));
jest.mock("../repositories/auth.repository", () => ({ findUserById: jest.fn() }));
// cache() de React ne mémorise qu'à l'intérieur d'une requête serveur : neutralisé ici.
jest.mock("react", () => ({ ...jest.requireActual("react"), cache: (fn) => fn }));

const { cookies } = require("next/headers");
const { redirect } = require("next/navigation");
const { verifyAccessToken } = require("./jwt");
const { findUserById } = require("../repositories/auth.repository");
const { getCurrentUser, requireRole, requireUser } = require("./session");

const manager = { id: "u-1", role: "GERANT", emailVerified: true, firstName: "Sami" };

function withCookie(token) {
  cookies.mockResolvedValue({
    get: (name) => (name === "accessToken" && token ? { value: token } : undefined),
  });
}

async function redirectTarget(promise) {
  try {
    await promise;
  } catch (error) {
    return error.url;
  }
  throw new Error("redirect() attendu");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getCurrentUser", () => {
  test("renvoie null sans cookie de session", async () => {
    withCookie(null);
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  test("renvoie null pour un jeton expiré ou falsifié", async () => {
    withCookie("expired-token");
    verifyAccessToken.mockRejectedValue(new Error("JWTExpired"));
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUserById).not.toHaveBeenCalled();
  });

  test("renvoie null si le compte n'est pas vérifié ou n'existe plus", async () => {
    withCookie("token");
    verifyAccessToken.mockResolvedValue({ sub: "u-1" });

    findUserById.mockResolvedValue({ ...manager, emailVerified: false });
    await expect(getCurrentUser()).resolves.toBeNull();

    findUserById.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  test("renvoie l'utilisateur pour une session valide", async () => {
    withCookie("token");
    verifyAccessToken.mockResolvedValue({ sub: "u-1" });
    findUserById.mockResolvedValue(manager);

    await expect(getCurrentUser()).resolves.toEqual(manager);
    expect(verifyAccessToken).toHaveBeenCalledWith("token");
    expect(findUserById).toHaveBeenCalledWith("u-1");
  });
});

describe("requireUser", () => {
  test("redirige un anonyme vers la connexion en gardant la page demandée", async () => {
    withCookie(null);
    await expect(redirectTarget(requireUser({ from: "/reservations" }))).resolves.toBe(
      "/login?next=%2Freservations",
    );
  });

  test("redirige vers la connexion quand la session a expiré", async () => {
    withCookie("expired-token");
    verifyAccessToken.mockRejectedValue(new Error("JWTExpired"));
    await expect(redirectTarget(requireUser())).resolves.toBe("/login");
  });
});

describe("requireRole", () => {
  test("laisse passer le bon rôle", async () => {
    withCookie("token");
    verifyAccessToken.mockResolvedValue({ sub: "u-1" });
    findUserById.mockResolvedValue(manager);

    await expect(requireRole(["GERANT"])).resolves.toEqual(manager);
    expect(redirect).not.toHaveBeenCalled();
  });

  test("un client ne peut pas ouvrir l'espace gérant", async () => {
    withCookie("token");
    verifyAccessToken.mockResolvedValue({ sub: "u-2" });
    findUserById.mockResolvedValue({ ...manager, id: "u-2", role: "USER" });

    await expect(redirectTarget(requireRole(["GERANT"]))).resolves.toBe("/acces-refuse");
  });

  test("un agent de paiement ne peut pas ouvrir l'espace de l'agent de suivi", async () => {
    withCookie("token");
    verifyAccessToken.mockResolvedValue({ sub: "u-3" });
    findUserById.mockResolvedValue({ ...manager, id: "u-3", role: "AGENT_PAIEMENT" });

    await expect(redirectTarget(requireRole(["AGENT_SUIVI"]))).resolves.toBe("/acces-refuse");
  });

  test("un anonyme est envoyé à la connexion, pas à « Accès refusé »", async () => {
    withCookie(null);
    await expect(
      redirectTarget(requireRole(["GERANT"], { from: "/gerant/salles" })),
    ).resolves.toBe("/login?next=%2Fgerant%2Fsalles");
  });
});
