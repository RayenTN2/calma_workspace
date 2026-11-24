import { findCandidateRooms } from "../repositories/availability.repository";
import { validateAvailabilityQuery } from "../validators/availability.validator";
import { hasOverlap } from "../utils/overlap";
import { BOOKING_BUFFER_MINUTES, PURPOSE_TO_ROOM_TYPE } from "../config";

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function searchAvailableRooms(query) {
  // 1. Validate input.
  const { error, value } = validateAvailabilityQuery(query);

  if (error) {
    throw createError(error, 400);
  }

  const { start, end, participants, purpose, equipment } = value;
  const bufferMs = BOOKING_BUFFER_MINUTES * 60 * 1000;

  // 2. Load active rooms that fit capacity, type and equipment,
  //    with the reservations near the requested slot.
  const rooms = await findCandidateRooms({
    minCapacity: participants,
    roomType: purpose ? PURPOSE_TO_ROOM_TYPE[purpose] : undefined,
    equipmentNames: equipment,
    windowStart: new Date(start.getTime() - bufferMs),
    windowEnd: new Date(end.getTime() + bufferMs),
  });

  // 3. Keep only rooms without a conflicting reservation (shared rule).
  return rooms
    .filter(
      (room) =>
        !room.reservations.some((reservation) =>
          hasOverlap(
            { start: reservation.startAt, end: reservation.endAt },
            { start, end },
            BOOKING_BUFFER_MINUTES
          )
        )
    )
    .map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      roomType: room.roomType,
      equipment: room.equipment.map((link) => link.equipment.name),
    }));
}
