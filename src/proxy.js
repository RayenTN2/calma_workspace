// Proxy Next.js 16 (anciennement middleware) : protection des routes (US-02, S1-T10).
// Vérifie la présence d'un jeton d'accès valide avant d'afficher une page réservée.
// Le contrôle du rôle se fait ensuite dans la page, en base (requireRole), car le
// jeton ne contient que l'identifiant de l'utilisateur.
import { NextResponse } from "next/server";

import { verifyAccessToken } from "@/features/auth/utils/jwt";
import { buildLoginUrl, getRequiredRoles } from "@/features/auth/roles";

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (!getRequiredRoles(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  let reason;

  if (accessToken) {
    try {
      await verifyAccessToken(accessToken);
      return NextResponse.next();
    } catch {
      reason = "expired";
    }
  }

  const loginUrl = new URL(
    buildLoginUrl({ next: `${pathname}${search}`, reason }),
    request.url,
  );
  const response = NextResponse.redirect(loginUrl);
  if (reason) {
    // Jeton invalide ou expiré : on le supprime pour ne plus le renvoyer.
    response.cookies.delete("accessToken");
  }
  return response;
}

export const config = {
  // Doit rester synchronisé avec PROTECTED_ROUTES (valeurs statiques exigées par Next.js).
  matcher: [
    "/gerant/:path*",
    "/agent-paiement/:path*",
    "/agent-suivi/:path*",
    "/reservations/:path*",
  ],
};
