/** @jest-environment node */
import { NextRequest } from "next/server";

jest.mock("@/features/auth/utils/jwt", () => ({ verifyAccessToken: jest.fn() }));

const { verifyAccessToken } = require("@/features/auth/utils/jwt");
const { proxy } = require("./proxy");

function request(path, accessToken) {
  const headers = accessToken ? { cookie: `accessToken=${accessToken}` } : {};
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

function isPassThrough(response) {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy (routes protégées)", () => {
  beforeEach(() => jest.resetAllMocks());

  test("redirige un visiteur anonyme vers la connexion avec la page demandée", async () => {
    const response = await proxy(request("/gerant/salles?vue=liste"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location"));
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/gerant/salles?vue=liste");
    expect(location.searchParams.get("reason")).toBeNull();
  });

  test("redirige une session expirée et supprime le cookie", async () => {
    verifyAccessToken.mockRejectedValue(new Error("JWTExpired"));

    const response = await proxy(request("/agent-suivi", "expired-token"));

    const location = new URL(response.headers.get("location"));
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("reason")).toBe("expired");
    expect(response.headers.get("set-cookie")).toMatch(/accessToken=;/);
  });

  test("laisse passer une session valide", async () => {
    verifyAccessToken.mockResolvedValue({ sub: "u-1" });

    const response = await proxy(request("/gerant/salles", "valid-token"));

    expect(isPassThrough(response)).toBe(true);
    expect(verifyAccessToken).toHaveBeenCalledWith("valid-token");
  });

  test("ne touche pas aux pages publiques", async () => {
    const response = await proxy(request("/rooms"));

    expect(isPassThrough(response)).toBe(true);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });
});
