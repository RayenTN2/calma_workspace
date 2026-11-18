// Fuseau horaire du centre (Tunis, UTC+1 toute l'année, sans heure d'été).
export const CENTER_UTC_OFFSET = "+01:00";

// Temps de battement entre deux réservations, en minutes.
// Décision n°5 du backlog : valeur finale « À définir » (Sprint 2).
export const BOOKING_BUFFER_MINUTES = 0;

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
