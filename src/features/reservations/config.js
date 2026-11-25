import {
  CENTER_UTC_OFFSET,
  BOOKING_BUFFER_MINUTES,
  BLOCKING_STATUSES,
  PURPOSE_TO_ROOM_TYPE,
} from "@/features/availability/config";

export {
  CENTER_UTC_OFFSET,
  BOOKING_BUFFER_MINUTES,
  BLOCKING_STATUSES,
  PURPOSE_TO_ROOM_TYPE,
  BOOKING_MAX_DURATION_MINUTES,   // ajout
  BOOKING_MIN_DURATION_MINUTES,
};

export const VALID_PURPOSES = Object.freeze(Object.keys(PURPOSE_TO_ROOM_TYPE));

export const RESERVATION_STATUSES = Object.freeze({
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
});

export const ALL_RESERVATION_ROLES = Object.freeze([
  "USER",
  "GERANT",
  "AGENT_SUIVI",
  "AGENT_PAIEMENT",
]);
// Décision n°3 et n°4 — valeurs provisoires à confirmer en réunion
export const BOOKING_MAX_DURATION_MINUTES = 240; // 4 h
export const BOOKING_MIN_DURATION_MINUTES = 30;  // 30 min
