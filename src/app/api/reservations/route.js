import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import { ALL_RESERVATION_ROLES } from "@/features/reservations/config";
import {
  createReservation,
  getReservationsForUser,
} from "@/features/reservations/services/reservation.service";

export async function POST(request) {
  try {
    // 1. Authorize verified logged-in user
    const auth = await authorizeRoles(request, ALL_RESERVATION_ROLES);

    if (!auth.authorized) {
      return NextResponse.json(
        { message: "You must log in first." },
        { status: auth.status }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    // 3. Create reservation and block the slot
    const reservation = await createReservation({
      userId: auth.user.id,
      payload: body,
    });

    return NextResponse.json(
      {
        message: "Room reserved successfully.",
        reservation,
      },
      { status: 201 }
    );
    } catch (error) {
    if (error.status) {
      const payload = { message: error.message };
      if (error.code) payload.error = error.code;
      return NextResponse.json(payload, { status: error.status });
    }

    console.error("Create reservation error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }

export async function GET(request) {
  try {
    // 1. Authorize verified logged-in user
    const auth = await authorizeRoles(request, ALL_RESERVATION_ROLES);

    if (!auth.authorized) {
      return NextResponse.json(
        { message: "You must log in first." },
        { status: auth.status }
      );
    }

    // 2. Fetch reservations
    const reservations = await getReservationsForUser(
      auth.user.id,
      auth.user.role
    );

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error("List reservations error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
