
import { randomBytes, createHash } from "crypto";

// Generate a random refresh token
export function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

// Hash the refresh token before storing it
export function hashRefreshToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}
