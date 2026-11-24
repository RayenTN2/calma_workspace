import UserReservations from "@/components/reservations/UserReservations";
import SessionGuard from "@/components/auth/SessionGuard";
import { requireRole } from "@/features/auth/utils/session";
import { ALL_ROLES } from "@/features/auth/roles";

export const metadata = {
  title: "Mes réservations | Calma Workspace",
};

export default async function ReservationsPage() {
  const user = await requireRole(ALL_ROLES, { from: "/reservations" });

  return (
    <>
      <UserReservations
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }}
      />
      <SessionGuard />
    </>
  );
}
