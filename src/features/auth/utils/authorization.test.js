/** @jest-environment node */

jest.mock("./auth", () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock("@/features/auth/repositories/auth.repository", () => ({
  findUserById: jest.fn(),
}));

const { getAuthenticatedUser } = require("./auth");
const { findUserById } = require("@/features/auth/repositories/auth.repository");
const { authorizeRoles } = require("./authorization");

describe("authorizeRoles", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns 401 when there is no authenticated session", async () => {
    getAuthenticatedUser.mockResolvedValue(null);

    await expect(authorizeRoles({}, ["GERANT"])).resolves.toEqual({
      authorized: false,
      status: 401,
    });
    expect(findUserById).not.toHaveBeenCalled();
  });

  test("returns 401 when the account email is not verified", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "user-1" });
    findUserById.mockResolvedValue({ role: "GERANT", emailVerified: false });

    await expect(authorizeRoles({}, ["GERANT"])).resolves.toEqual({
      authorized: false,
      status: 401,
    });
  });

  test("returns 403 for an authenticated customer", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "user-1" });
    findUserById.mockResolvedValue({ role: "USER", emailVerified: true });

    await expect(authorizeRoles({}, ["GERANT"])).resolves.toEqual({
      authorized: false,
      status: 403,
    });
  });

  test("authorizes a verified GERANT", async () => {
    const user = { id: "manager-1", role: "GERANT", emailVerified: true };
    getAuthenticatedUser.mockResolvedValue({ userId: user.id });
    findUserById.mockResolvedValue(user);

    await expect(authorizeRoles({}, ["GERANT"])).resolves.toEqual({
      authorized: true,
      user,
    });
  });
});
