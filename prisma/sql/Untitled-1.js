import { getAuthenticatedUser } from "./auth";
import { findUserById } from "../repositories/auth.repository";

export async function authorizeRoles(request, allowedRoles) {
  // 1. Check whether the user has a valid access token.
  const authenticated = await getAuthenticatedUser(request);

  if (!authenticated) {
    return {
      authorized: false,
      status: 401,
    };
  }

  // 2. Retrieve the user's current information from PostgreSQL.
  const user = await findUserById(authenticated.userId);

  if (!user || !user.emailVerified) {
    return {
      authorized: false,
      status: 401,
    };
  }

  // 3. Check whether the user's role is allowed.
  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      status: 403,
    };
  }

  // 4. The user is authenticated and authorized.
  return {
    authorized: true,
    user,
  };
}