// Fuseau horaire du centre (Tunis, UTC+1 toute l'année, sans heure d'été).
export const CENTER_UTC_OFFSET = "+01:00";

// Temps de battement entre deux réservations, en minutes (nettoyage et préparation de la salle).
// Décision n°5 du backlog (Sprint 2) : 15 minutes par défaut, configurable via BOOKING_BUFFER_MINUTES.
const DEFAULT_BOOKING_BUFFER_MINUTES = 15;

function readMinutes(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : fallback;
}

export const BOOKING_BUFFER_MINUTES = readMinutes(
  process.env.BOOKING_BUFFER_MINUTES ?? process.env.NEXT_PUBLIC_BOOKING_BUFFER_MINUTES,
  DEFAULT_BOOKING_BUFFER_MINUTES
);

// Les réservations annulées ne bloquent pas une salle.
export const BLOCKING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED"];

// Correspondance objet de réservation -> type de salle.
// Hypothèse à faire valider par l'équipe (décision n°6 du backlog).
export const PURPOSE_TO_ROOM_TYPE = {
  PERSONAL_REVISION: "INDIVIDUAL",
  PERSONAL_TASK: "INDIVIDUAL",
  MEETING: "MEETING",
  GROUP_TRAINING: "TRAINING",
};
