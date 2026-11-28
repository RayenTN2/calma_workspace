/**
 * Configuration de la tarification pour Calma Workspace (US-08).
 *
 * Règles métier :
 * - Calcul : (Durée en heures × Tarif/h) ou Tarif/journée.
 * - Prise en compte de la typologie de la salle (individuelle vs groupe).
 */

export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || process.env.CURRENCY || "DT";

export const ROOM_TYPOLOGY = Object.freeze({
  INDIVIDUAL: "INDIVIDUAL",
  GROUP: "GROUP",
});

export const PRICING_MODES = Object.freeze({
  HOURLY: "HOURLY",
  DAILY: "DAILY",
  AUTO: "AUTO",
});

/**
 * Grille tarifaire par défaut (en dinars tunisiens - DT), configurable via variables d'environnement.
 */
export const PRICING_RATES = Object.freeze({
  [ROOM_TYPOLOGY.INDIVIDUAL]: Object.freeze({
    hourlyRate: Number(process.env.PRICING_HOURLY_INDIVIDUAL ?? 10),
    dailyRate: Number(process.env.PRICING_DAILY_INDIVIDUAL ?? 50),
  }),
  [ROOM_TYPOLOGY.GROUP]: Object.freeze({
    hourlyRate: Number(process.env.PRICING_HOURLY_GROUP ?? 25),
    dailyRate: Number(process.env.PRICING_DAILY_GROUP ?? 120),
  }),
});

/**
 * Seuil en heures à partir duquel un tarif journalier s'applique automatiquement en mode AUTO.
 */
export const FULL_DAY_HOURS_THRESHOLD = 5;

/**
 * Correspondance RoomType Prisma -> Typologie de tarification
 */
export const ROOM_TYPE_TO_TYPOLOGY = Object.freeze({
  INDIVIDUAL: ROOM_TYPOLOGY.INDIVIDUAL,
  MEETING: ROOM_TYPOLOGY.GROUP,
  TRAINING: ROOM_TYPOLOGY.GROUP,
  OTHER: ROOM_TYPOLOGY.GROUP,
});

/**
 * Correspondance ReservationPurpose -> Typologie de tarification
 */
export const PURPOSE_TO_TYPOLOGY = Object.freeze({
  PERSONAL_REVISION: ROOM_TYPOLOGY.INDIVIDUAL,
  PERSONAL_TASK: ROOM_TYPOLOGY.INDIVIDUAL,
  MEETING: ROOM_TYPOLOGY.GROUP,
  GROUP_TRAINING: ROOM_TYPOLOGY.GROUP,
});
