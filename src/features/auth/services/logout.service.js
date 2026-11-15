
import {
  revokeRefreshToken,
} from "../repositories/auth.repository";

import {
  hashRefreshToken,
} from "../utils/refresh-token";

export async function logoutService(refreshToken) {
  // 1. If there is no refresh token, nothing to revoke
  if (!refreshToken) {
    return;
  }

  // 2. Hash the refresh token
  const tokenHash = hashRefreshToken(refreshToken);

  // 3. Revoke it in PostgreSQL
  await revokeRefreshToken(tokenHash);
}
