import {
  DEFAULT_CURRENCY,
  ROOM_TYPOLOGY,
  PRICING_MODES,
  PRICING_RATES,
  FULL_DAY_HOURS_THRESHOLD,
  ROOM_TYPE_TO_TYPOLOGY,
  PURPOSE_TO_TYPOLOGY,
} from "../pricing.config";

/**
 * Détermine la typologie d'une salle (INDIVIDUAL vs GROUP)
 * selon le type de salle, l'objet de réservation ou la capacité.
 */
export function resolveTypology({ room, roomType, purpose, participants } = {}) {
  // 1. Priorité au type explicite de la salle
  const directRoomType = room?.roomType || roomType;
  if (directRoomType && ROOM_TYPE_TO_TYPOLOGY[directRoomType]) {
    return ROOM_TYPE_TO_TYPOLOGY[directRoomType];
  }

  // 2. Déduction à partir de l'objet de réservation
  if (purpose && PURPOSE_TO_TYPOLOGY[purpose]) {
    return PURPOSE_TO_TYPOLOGY[purpose];
  }

  // 3. Déduction à partir du nombre de participants ou de la capacité
  const count = participants ?? room?.capacity;
  if (typeof count === "number" && count > 1) {
    return ROOM_TYPOLOGY.GROUP;
  }

  return ROOM_TYPOLOGY.INDIVIDUAL;
}

/**
 * Calcule la durée d'un créneau en minutes et en heures décimales.
 */
export function calculateDuration(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Dates invalides pour le calcul de la durée.");
  }

  if (end <= start) {
    throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
  }

  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const durationHours = Number((durationMinutes / 60).toFixed(2));

  return { durationMinutes, durationHours };
}

/**
 * Formate un montant avec sa devise (ex: "25.00 DT").
 */
export function formatAmount(amount, currency = DEFAULT_CURRENCY) {
  const numeric = typeof amount === "number" ? amount : Number(amount) || 0;
  return `${numeric.toFixed(2)} ${currency}`;
}

/**
 * Calcule automatiquement le coût d'une réservation (US-08).
 *
 * Critères d'acceptation :
 * - Calcul : (Durée en heures × Tarif/h) ou Tarif/journée.
 * - Prise en compte de la typologie de la salle (individuelle vs groupe).
 *
 * @param {Object} params
 * @param {Date|string} params.startAt - Date/heure de début
 * @param {Date|string} params.endAt - Date/heure de fin
 * @param {Object} [params.room] - Objet salle (contient roomType, capacity, customRates...)
 * @param {string} [params.roomType] - Type de salle (INDIVIDUAL, MEETING, TRAINING, OTHER)
 * @param {string} [params.purpose] - Usage de réservation
 * @param {number} [params.participants] - Nombre de participants
 * @param {string} [params.pricingMode] - "AUTO" | "HOURLY" | "DAILY"
 * @param {Object} [params.customRates] - Tarifs spécifiques optionnels { hourlyRate, dailyRate }
 * @param {string} [params.currency] - Devise (ex: "DT")
 *
 * @returns {Object} Résultat détaillé du calcul de coût
 */
export function calculateReservationCost({
  startAt,
  endAt,
  room,
  roomType,
  purpose,
  participants,
  pricingMode = PRICING_MODES.AUTO,
  customRates,
  currency = DEFAULT_CURRENCY,
} = {}) {
  const { durationMinutes, durationHours } = calculateDuration(startAt, endAt);
  const typology = resolveTypology({ room, roomType, purpose, participants });

  const baseRates = PRICING_RATES[typology] || PRICING_RATES[ROOM_TYPOLOGY.INDIVIDUAL];
  const hourlyRate = customRates?.hourlyRate ?? room?.hourlyRate ?? baseRates.hourlyRate;
  const dailyRate = customRates?.dailyRate ?? room?.dailyRate ?? baseRates.dailyRate;

  let amount;
  let rateType;
  let rateApplied;

  if (pricingMode === PRICING_MODES.DAILY) {
    rateType = PRICING_MODES.DAILY;
    rateApplied = dailyRate;
    amount = dailyRate;
  } else if (pricingMode === PRICING_MODES.HOURLY) {
    rateType = PRICING_MODES.HOURLY;
    rateApplied = hourlyRate;
    amount = Number((durationHours * hourlyRate).toFixed(2));
  } else {
    // Mode AUTO : compare le tarif horaire avec le tarif journalier (plafond avantageux)
    const computedHourly = Number((durationHours * hourlyRate).toFixed(2));
    const isFullDayOrExceeds =
      durationHours >= FULL_DAY_HOURS_THRESHOLD || computedHourly >= dailyRate;

    if (isFullDayOrExceeds) {
      rateType = PRICING_MODES.DAILY;
      rateApplied = dailyRate;
      amount = dailyRate;
    } else {
      rateType = PRICING_MODES.HOURLY;
      rateApplied = hourlyRate;
      amount = computedHourly;
    }
  }

  // Garantit un montant à deux décimales
  const finalAmount = Number(amount.toFixed(2));

  return {
    amount: finalAmount,
    currency,
    formattedAmount: formatAmount(finalAmount, currency),
    durationMinutes,
    durationHours,
    typology,
    rateType,
    hourlyRate,
    dailyRate,
    rateApplied,
    unit: rateType === PRICING_MODES.DAILY ? "jour" : "h",
  };
}

/**
 * Enrichit un objet réservation avec le calcul automatique de son coût.
 */
export function enrichReservationWithCost(reservation) {
  if (!reservation) return reservation;

  if (!reservation.startAt || !reservation.endAt) {
    if (reservation.totalAmount !== null && reservation.totalAmount !== undefined) {
      const totalAmount = Number(reservation.totalAmount);
      return {
        ...reservation,
        totalAmount,
        formattedTotalAmount: formatAmount(totalAmount),
      };
    }
    return reservation;
  }

  try {
    const cost = calculateReservationCost({
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      room: reservation.room,
      purpose: reservation.purpose,
      participants: reservation.participants,
    });

    const totalAmount =
      reservation.totalAmount !== null && reservation.totalAmount !== undefined
        ? Number(reservation.totalAmount)
        : cost.amount;

    return {
      ...reservation,
      totalAmount,
      formattedTotalAmount: formatAmount(totalAmount, cost.currency),
      cost,
    };
  } catch {
    return reservation;
  }
}
