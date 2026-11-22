// Garde d'autorisation pour les Route Handlers (US-02, S1-T10).
// S'appuie sur authorizeRoles et renvoie directement la réponse 401/403 à retourner.
import { NextResponse } from "next/server";

import { authorizeRoles } from "./authorization";

export const AUTH_ERROR_MESSAGES = Object.freeze({
  401: "Vous devez vous connecter pour accéder à cette ressource.",
  403: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource.",
});

/**
 * Usage dans une route :
 *   const auth = await requireApiRoles(request, ["GERANT"]);
 *   if (auth.response) return auth.response;
 *   // auth.user est l'utilisateur autorisé
 * @param {Request} request
 * @param {string[]} allowedRoles
 */
export async function requireApiRoles(request, allowedRoles) {
  const result = await authorizeRoles(request, allowedRoles);

  if (result.authorized) {
    return { user: result.user, response: null };
  }

  const status = result.status === 403 ? 403 : 401;
  return {
    user: null,
    response: NextResponse.json(
      { message: AUTH_ERROR_MESSAGES[status] },
      { status },
    ),
  };
}
