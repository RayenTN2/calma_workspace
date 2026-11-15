
import bcrypt from "bcryptjs";

import { findUserByEmail, createRefreshToken } from "../repositories/auth.repository";

import {
  generateAccessToken,
} from "../utils/jwt";

import {
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/refresh-token";

export async function loginService({ email, password }) {
  // 1. Validate input
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  // 2. Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // 3. Find user
  const user = await findUserByEmail(normalizedEmail);

  // 4. Check credentials
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const passwordIsValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordIsValid) {
    throw new Error("Invalid email or password.");
  }

  // 5. Check email verification
  if (!user.emailVerified) {
    throw new Error("Please verify your email before logging in.");
  }

  // 6. Generate access token
  const accessToken = await generateAccessToken(user.id);

  // 7. Generate refresh token
  const refreshToken = generateRefreshToken();

  // 8. Hash refresh token before database storage
  const tokenHash = hashRefreshToken(refreshToken);

  // 9. Set refresh token expiration (7 days)
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  // 10. Store refresh token hash
  await createRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // 11. Return tokens and safe user information
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileType: user.profileType,
    },
  };
}
