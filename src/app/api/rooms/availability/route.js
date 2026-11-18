import { NextResponse } from "next/server";

import { authorizeRoles } from "@/features/auth/utils/authorization";
import { searchAvailableRooms } from "@/features/availability/services/availability.service";

const ALL_ROLES = ["USER", "GERANT", "AGENT_SUIVI", "AGENT_PAIEMENT"];

export async function GET(request) {
  try {
    // 1. Any logged-in, verified user can search.
    const auth = await authorizeRoles(request, ALL_ROLES);

    if (!auth.authorized) {
      return NextResponse.json(
        { message: "You must log in first." },
        { status: auth.status }
      );
    }

    // 2. Read search filters from the query string.
    const { searchParams } = new URL(request.url);

    const rooms = await searchAvailableRooms({
      date: searchParams.get("date") ?? undefined,
      startTime: searchParams.get("startTime") ?? undefined,
      endTime: searchParams.get("endTime") ?? undefined,
      participants: searchParams.get("participants") ?? undefined,
      purpose: searchParams.get("purpose") ?? undefined,
      equipment: searchParams.getAll("equipment"),
    });

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    if (error.status) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("Availability search error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
