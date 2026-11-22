import RoomsDashboard from "@/components/gerant/RoomsDashboard";
import { requireRole } from "@/features/auth/utils/session";
import { ROLES } from "@/features/auth/roles";

export const metadata = {
  title: "Gestion des salles | Calma Workspace",
};

export default async function RoomsPage() {
  // Anonyme → /login ; autre rôle → /acces-refuse (voir src/features/auth/utils/session.js).
  const user = await requireRole([ROLES.GERANT], { from: "/gerant/salles" });

  return <RoomsDashboard user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }} />;
}
