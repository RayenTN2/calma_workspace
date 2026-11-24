
import { verifyAccessToken } from "./jwt";

export async function getAuthenticatedUser(request) {
  // 1. Read access token from HttpOnly cookie or Authorization header
  let accessToken = request?.cookies?.get?.("accessToken")?.value;

  if (!accessToken && request?.headers) {
    const authHeader = typeof request.headers.get === "function"
      ? request.headers.get("authorization")
      : request.headers["authorization"] || request.headers["Authorization"];

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.slice(7).trim();
    }
  }

  // 2. No token means unauthenticated
  if (!accessToken) {
    return null;
  }

  try {
    // 3. Verify JWT signature and expiration
    const payload = await verifyAccessToken(accessToken);

    // 4. Make sure the token contains a user ID
    if (!payload.sub) {
      return null;
    }

    // 5. Return authenticated user's ID
    return {
      userId: payload.sub,
    };

  } catch {
    // Invalid, expired, or incorrectly signed token
    return null;
  }
}
