/** @jest-environment node */
import { NextRequest } from "next/server";

// Contrat HTTP des routes de connexion, déconnexion et rafraîchissement (S1-T07)
// utilisé par la page de connexion et la déconnexion automatique (S1-T08, S1-T09).

jest.mock("@/features/auth/services/login.service", () => ({ loginService: jest.fn() }));
jest.mock("@/features/auth/services/logout.service", () => ({ logoutService: jest.fn() }));
jest.mock("@/features/auth/services/refresh.service", () => ({ refreshService: jest.fn() }));

const { loginService } = require("@/features/auth/services/login.service");
const { logoutService } = require("@/features/auth/services/logout.service");
const { refreshService } = require("@/features/auth/services/refresh.service");
const { POST: login } = require("./login/route");
const { POST: logout } = require("./logout/route");
const { POST: refresh } = require("./refresh/route");

function post(path, { body, cookie } = {}) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: "POST",
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

function cookieHeader(response) {
  return response.headers.getSetCookie().join("\n");
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe("POST /api/auth/login", () => {
  test("connexion réussie : cookies HttpOnly de session posés", async () => {
    loginService.mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      user: { id: "u-1", email: "client@calma.tn" },
    });

    const response = await login(post("/api/auth/login", {
      body: { email: "client@calma.tn", password: "MotDePasse123" },
    }));

    expect(response.status).toBe(200);
    const cookies = cookieHeader(response);
    expect(cookies).toMatch(/accessToken=access;.*HttpOnly/i);
    expect(cookies).toMatch(/refreshToken=refresh;.*Path=\/api\/auth/i);
    expect(cookies).toMatch(/SameSite=lax/i);
    // Le mot de passe et les jetons ne sont jamais renvoyés dans le corps.
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/MotDePasse123|access|refresh"/);
  });

  test("identifiants incorrects : 401 sans cookie", async () => {
    loginService.mockRejectedValue(new Error("Invalid email or password."));

    const response = await login(post("/api/auth/login", {
      body: { email: "client@calma.tn", password: "mauvais" },
    }));

    expect(response.status).toBe(401);
    expect(cookieHeader(response)).toBe("");
  });

  test("email non vérifié : 403", async () => {
    loginService.mockRejectedValue(new Error("Please verify your email before logging in."));

    const response = await login(post("/api/auth/login", {
      body: { email: "client@calma.tn", password: "MotDePasse123" },
    }));

    expect(response.status).toBe(403);
  });

  test("champs manquants : 400", async () => {
    loginService.mockRejectedValue(new Error("Email and password are required."));

    const response = await login(post("/api/auth/login", { body: {} }));

    expect(response.status).toBe(400);
  });

  test("corps JSON invalide : 400", async () => {
    const response = await login(post("/api/auth/login", { body: "{pas du json" }));

    expect(response.status).toBe(400);
    expect(loginService).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout", () => {
  test("révoque le jeton de rafraîchissement et supprime les deux cookies", async () => {
    logoutService.mockResolvedValue(undefined);

    const response = await logout(post("/api/auth/logout", {
      cookie: "accessToken=access; refreshToken=refresh",
    }));

    expect(response.status).toBe(200);
    expect(logoutService).toHaveBeenCalledWith("refresh");
    const cookies = cookieHeader(response);
    expect(cookies).toMatch(/accessToken=;.*Max-Age=0/i);
    expect(cookies).toMatch(/refreshToken=;.*Max-Age=0/i);
  });
});

describe("POST /api/auth/refresh (expiration de session)", () => {
  test("session valide : nouveau jeton d'accès", async () => {
    refreshService.mockResolvedValue({ accessToken: "new-access" });

    const response = await refresh(post("/api/auth/refresh", { cookie: "refreshToken=refresh" }));

    expect(response.status).toBe(200);
    expect(cookieHeader(response)).toMatch(/accessToken=new-access;/);
  });

  test("session expirée ou révoquée : 401 et cookies supprimés", async () => {
    refreshService.mockRejectedValue(new Error("Invalid refresh token."));

    const response = await refresh(post("/api/auth/refresh", { cookie: "refreshToken=old" }));

    expect(response.status).toBe(401);
    const cookies = cookieHeader(response);
    expect(cookies).toMatch(/accessToken=;.*Max-Age=0/i);
    expect(cookies).toMatch(/refreshToken=;.*Max-Age=0/i);
  });
});
