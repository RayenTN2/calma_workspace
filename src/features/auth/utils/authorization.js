import { getAuthenticatedUser } from "./auth";
import { findUserById } from "../repositories/auth.repository";

export async function authorizeRoles(request, allowedRoles) {
  const authenticated = await getAuthenticatedUser(request);

  if (!authenticated) {
    return {
      authorized: false,
      status: 401,
    };
  }

  const user = await findUserById(authenticated.userId);

  if (!user || !user.emailVerified) {
    return {
      authorized: false,
      status: 401,
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      status: 403,
    };
  }

  return {
    authorized: true,
    user,
  };
}