/** @jest-environment node */

jest.mock("./authorization", () => ({ authorizeRoles: jest.fn() }));

const { authorizeRoles } = require("./authorization");
const { AUTH_ERROR_MESSAGES, requireApiRoles } = require("./api-guard");

describe("requireApiRoles", () => {
  beforeEach(() => jest.resetAllMocks());

  test("renvoie 401 pour un utilisateur non connecté", async () => {
    authorizeRoles.mockResolvedValue({ authorized: false, status: 401 });

    const { user, response } = await requireApiRoles({}, ["GERANT"]);

    expect(user).toBeNull();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: AUTH_ERROR_MESSAGES[401] });
  });

  test("renvoie 403 pour un rôle non autorisé", async () => {
    authorizeRoles.mockResolvedValue({ authorized: false, status: 403 });

    const { response } = await requireApiRoles({}, ["AGENT_PAIEMENT"]);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: AUTH_ERROR_MESSAGES[403] });
  });

  test("renvoie l'utilisateur autorisé sans réponse d'erreur", async () => {
    const agent = { id: "a-1", role: "AGENT_PAIEMENT" };
    authorizeRoles.mockResolvedValue({ authorized: true, user: agent });

    await expect(requireApiRoles({}, ["AGENT_PAIEMENT"])).resolves.toEqual({
      user: agent,
      response: null,
    });
    expect(authorizeRoles).toHaveBeenCalledWith({}, ["AGENT_PAIEMENT"]);
  });
});
