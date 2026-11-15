import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";

export async function GET(request) {
  const result = await authorizeRoles(request, ["GERANT"]);

  if (!result.authorized) {
    if (result.status === 401) {
      return NextResponse.json(
        { message: "You must log in first." },
        { status: 401 }
      );
    }

    if (result.status === 403) {
      return NextResponse.json(
        { message: "You do not have permission to access this resource." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({
    message: "Welcome to the GERANT protected resource!",
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
    },
  });
}