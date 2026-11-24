import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import { ALL_RESERVATION_ROLES } from "@/features/reservations/config";
import {
  getReservation,
  cancelReservation,
} from "@/features/reservations/services/reservation.service";

export async function GET(request, { params }) {
  try {
    const auth = await authorizeRoles(request, ALL_RESERVATION_ROLES);

    if (!auth.authorized) {
      return NextResponse.json(
        { message: "You must log in first." },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const reservation = await getReservation(id, {
      userId: auth.user.id,
      role: auth.user.role,
    });

    return NextResponse.json({ reservation }, { status: 200 });
  } catch (error) {
    if (error.status) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("Get reservation error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await authorizeRoles(request, ALL_RESERVATION_ROLES);

    if (!auth.authorized) {
      return NextResponse.json(
        { message: "You must log in first." },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const reservation = await cancelReservation(id, {
      userId: auth.user.id,
      role: auth.user.role,
    });

    return NextResponse.json(
      {
        message: "Reservation cancelled successfully.",
        reservation,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error.status) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("Cancel reservation error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
