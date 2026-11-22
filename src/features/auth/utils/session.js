// Utilitaires de session pour les Server Components et les layouts (US-02, S1-T10).
// Les Route Handlers utilisent plutôt authorizeRoles / requireApiRoles.
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { findUserById } from "../repositories/auth.repository";
import { verifyAccessToken } from "./jwt";
import { ACCESS_DENIED_PATH, buildLoginUrl } from "../roles";

/**
 * Utilisateur connecté (jeton valide, compte existant et email vérifié), sinon null.
 * Mis en cache pour la durée d'une requête : layout et page ne relisent pas la base deux fois.
 */
export const getCurrentUser = cache(async () => {
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) return null;

  let payload;
  try {
    payload = await verifyAccessToken(accessToken);
  } catch {
    // Jeton expiré, falsifié ou signé avec un autre secret.
    return null;
  }

  if (!payload?.sub) return null;

  const user = await findUserById(payload.sub);
  if (!user || !user.emailVerified) return null;

  return user;
});

/**
 * Exige un utilisateur connecté, sinon redirige vers la page de connexion.
 * @param {{ from?: string }} [options] chemin à rouvrir après connexion
 */
export async function requireUser({ from } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(buildLoginUrl({ next: from }));
  }
  return user;
}

/**
 * Exige un utilisateur connecté ayant l'un des rôles donnés.
 * Anonyme → page de connexion ; rôle insuffisant → page « Accès refusé ».
 * @param {string[]} allowedRoles
 * @param {{ from?: string }} [options]
 */
export async function requireRole(allowedRoles, { from } = {}) {
  const user = await requireUser({ from });
  if (!allowedRoles.includes(user.role)) {
    redirect(ACCESS_DENIED_PATH);
  }
  return user;
}
