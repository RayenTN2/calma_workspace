import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { findRoomById } from "@/features/reservations/repositories/reservation.repository";
import { calculateReservationCost } from "@/features/reservations/services/pricing.service";
import { CENTER_UTC_OFFSET } from "@/features/reservations/config";

function toDateTime(date, time) {
  return new Date(`${date}T${time}:00${CENTER_UTC_OFFSET}`);
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Corps JSON invalide." },
        { status: 400 }
      );
    }

    const {
      roomId,
      roomType,
      purpose,
      participants,
      pricingMode,
      date,
      startTime,
      endTime,
      startAt: rawStartAt,
      endAt: rawEndAt,
    } = body || {};

    let startAt;
    let endAt;

    if (rawStartAt && rawEndAt) {
      startAt = new Date(rawStartAt);
      endAt = new Date(rawEndAt);
    } else if (date && startTime && endTime) {
      startAt = toDateTime(date, startTime);
      endAt = toDateTime(date, endTime);
    } else {
      return NextResponse.json(
        {
          message:
            "Le créneau est requis (date, startTime, endTime ou startAt, endAt).",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { message: "Dates ou horaires invalides." },
        { status: 400 }
      );
    }

    if (endAt <= startAt) {
      return NextResponse.json(
        { message: "L'heure de fin doit être postérieure à l'heure de début." },
        { status: 400 }
      );
    }

    let room = null;
    if (roomId) {
      try {
        room = await findRoomById(roomId, prisma);
      } catch {
        // Optionnel : si la base n'est pas accessible, on continue avec les autres paramètres
      }
    }

    const cost = calculateReservationCost({
      startAt,
      endAt,
      room,
      roomType: room?.roomType || roomType,
      purpose,
      participants: Number(participants) || 1,
      pricingMode,
    });

    return NextResponse.json({ cost }, { status: 200 });
  } catch (error) {
    console.error("Calculate reservation cost error:", error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
