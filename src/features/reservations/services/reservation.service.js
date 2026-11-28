import { prisma } from "@/infrastructure/database/prisma";
import {
  BOOKING_BUFFER_MINUTES,
  PURPOSE_TO_ROOM_TYPE,
} from "../config";
import {
  validateCreateReservation,
  validateParticipants,
  validateDuration,
} from "../validators/reservation.validator";
import {
  findRoomById,
  findConflictingReservations,
  createReservation as createReservationRecord,
  findReservationById,
  findReservationsByUserId,
  findAllReservations,
  updateReservationStatus,
} from "../repositories/reservation.repository";
import { hasOverlap } from "@/features/availability/utils/overlap";
import {
  calculateReservationCost,
  enrichReservationWithCost,
} from "./pricing.service";

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function createReservation({ userId, payload }) {
  // 1. Validate payload
  const { error, value } = validateCreateReservation(payload);

  if (error) {
    throw createError(error, 400);
  }

  const { roomId, purpose, participants, startAt, endAt } = value;

  // 2. Perform room verification and conflict check in a transaction
  return prisma.$transaction(async (tx) => {
    // Check room existence and status
    const room = await findRoomById(roomId, tx);

    if (!room) {
      throw createError("Room not found.", 404);
    }

    if (!room.isActive) {
      throw createError("This room is currently inactive.", 400);
    }

    
    // Check capacity (S2-T12)
    const capacityCheck = validateParticipants(participants, room.capacity);
    if (!capacityCheck.valid) {
      throw createError(capacityCheck.message, 400);
    }
        // Check duration (S2-T13) — sécurité supplémentaire
    const durationCheck = validateDuration(startAt, endAt);
    if (!durationCheck.valid) {
      throw createError(durationCheck.message, 400);
    }
	
    // Check purpose compatibility with room type
    const expectedRoomType = PURPOSE_TO_ROOM_TYPE[purpose];
    if (expectedRoomType && room.roomType !== expectedRoomType) {
      throw createError(
        `Room type (${room.roomType}) is not compatible with the selected purpose (${purpose}). Expected: ${expectedRoomType}.`,
        400
      );
    }

    // Check time conflicts (anti-collision)
    const bufferMs = BOOKING_BUFFER_MINUTES * 60 * 1000;
    const windowStart = new Date(startAt.getTime() - bufferMs);
    const windowEnd = new Date(endAt.getTime() + bufferMs);

    const existingReservations = await findConflictingReservations(tx, {
      roomId,
      windowStart,
      windowEnd,
    });

    const isConflicting = existingReservations.some((existing) =>
      hasOverlap(
        { start: existing.startAt, end: existing.endAt },
        { start: startAt, end: endAt },
        BOOKING_BUFFER_MINUTES
      )
    );

     if (isConflicting) {
      const err = createError(
        "Ce créneau chevauche une réservation existante (temps de battement inclus).",
        409
      );
      err.code = "CONFLICT";
      throw err;
    }

    // Calculate reservation cost automatically (US-08)
    const cost = calculateReservationCost({
      room,
      startAt,
      endAt,
      purpose,
      participants,
      pricingMode: payload.pricingMode,
    });

    // Create reservation with PENDING_PAYMENT status and computed total amount
    const created = await createReservationRecord(tx, {
      userId,
      roomId,
      purpose,
      participants,
      startAt,
      endAt,
      status: "PENDING_PAYMENT",
      totalAmount: cost.amount,
    });

    return enrichReservationWithCost({
      ...created,
      room: created.room || room,
      startAt: created.startAt || startAt,
      endAt: created.endAt || endAt,
      totalAmount: created.totalAmount ?? cost.amount,
      cost,
    });
  });
}

export async function getReservationsForUser(userId, role) {
  const reservations =
    role === "GERANT"
      ? await findAllReservations()
      : await findReservationsByUserId(userId);

  return reservations.map(enrichReservationWithCost);
}

export async function getReservation(id, { userId, role }) {
  const reservation = await findReservationById(id);

  if (!reservation) {
    throw createError("Reservation not found.", 404);
  }

  if (reservation.userId !== userId && role !== "GERANT") {
    throw createError(
      "You do not have permission to view this reservation.",
      403
    );
  }

  return enrichReservationWithCost(reservation);
}

export async function cancelReservation(id, { userId, role }) {
  const reservation = await findReservationById(id);

  if (!reservation) {
    throw createError("Reservation not found.", 404);
  }

  if (reservation.userId !== userId && role !== "GERANT") {
    throw createError(
      "You do not have permission to cancel this reservation.",
      403
    );
  }

  if (reservation.status === "CANCELLED") {
    throw createError("This reservation is already cancelled.", 400);
  }

  const updated = await updateReservationStatus(id, "CANCELLED");
  return enrichReservationWithCost(updated);
}
