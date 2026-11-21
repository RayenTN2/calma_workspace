import SessionGuard from "@/components/auth/SessionGuard";
import { requireRole } from "@/features/auth/utils/session";
import { ROLES } from "@/features/auth/roles";

// Tout l'espace /gerant est réservé au rôle GERANT et soumis à la
// déconnexion automatique après inactivité.
export default async function GerantLayout({ children }) {
  await requireRole([ROLES.GERANT], { from: "/gerant/salles" });

  return (
    <>
      {children}
      <SessionGuard />
    </>
  );
}
