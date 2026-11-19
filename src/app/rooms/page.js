import AvailabilitySearch from "@/components/rooms/AvailabilitySearch";
import { cookies } from "next/headers";
import { findUserById } from "@/features/auth/repositories/auth.repository";
import { verifyAccessToken } from "@/features/auth/utils/jwt";

export default async function RoomsPage() {
  let user = null;
  const accessToken = (await cookies()).get("accessToken")?.value;

  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      if (payload?.sub) {
        const authenticatedUser = await findUserById(payload.sub);
        if (authenticatedUser?.emailVerified) {
          user = {
            firstName: authenticatedUser.firstName,
            lastName: authenticatedUser.lastName,
            role: authenticatedUser.role,
          };
        }
      }
    } catch {
      // La recherche reste accessible visuellement même sans session valide.
    }
  }

  return <AvailabilitySearch user={user} />;
}
