import RoomsDashboard from "@/components/gerant/RoomsDashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserById } from "@/features/auth/repositories/auth.repository";
import { verifyAccessToken } from "@/features/auth/utils/jwt";

export const metadata = {
  title: "Gestion des salles | Calma Workspace",
};

export default async function RoomsPage() {
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) redirect("/");

  let payload;
  try {
    payload = await verifyAccessToken(accessToken);
  } catch {
    redirect("/");
  }

  const user = payload?.sub ? await findUserById(payload.sub) : null;
  if (!user || !user.emailVerified) redirect("/");
  if (user.role !== "GERANT") redirect("/");

  return <RoomsDashboard />;
}
