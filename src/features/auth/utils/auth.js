
import { verifyAccessToken } from "./jwt";

export async function getAuthenticatedUser(request) {
  // 1. Read access token from HttpOnly cookie
  const accessToken = request.cookies.get("accessToken")?.value;

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
