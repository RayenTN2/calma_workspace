
import { findRefreshTokenWithUser } from "../repositories/auth.repository";

import { generateAccessToken } from "../utils/jwt";

import { hashRefreshToken } from "../utils/refresh-token";

export async function refreshService(refreshToken) {
  // 1. Check that the refresh token exists
  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  // 2. Hash the received refresh token
  const tokenHash = hashRefreshToken(refreshToken);

  // 3. Search for this token in PostgreSQL
  const storedToken = await findRefreshTokenWithUser(tokenHash);

  // 4. Check that the token exists
  if (!storedToken) {
    throw new Error("Invalid refresh token.");
  }

  // 5. Check whether it has been revoked
  if (storedToken.revokedAt !== null) {
    throw new Error("Invalid refresh token.");
  }

  // 6. Check whether it has expired
  if (storedToken.expiresAt <= new Date()) {
    throw new Error("Invalid refresh token.");
  }

  // 7. Check that the user is still verified
  if (!storedToken.user.emailVerified) {
    throw new Error("Invalid refresh token.");
  }

  // 8. Generate a new access token
  const newAccessToken = await generateAccessToken(
    storedToken.userId
  );

  // 9. Return only the new access token
  return {
    accessToken: newAccessToken,
  };
}
