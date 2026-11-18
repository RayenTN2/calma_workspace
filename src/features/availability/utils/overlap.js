const MINUTE_MS = 60 * 1000;

function toTimestamp(value, label) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  if (Number.isNaN(time)) {
    throw new Error(`Invalid date: ${label}`);
  }

  return time;
}

function toRange(range, label) {
  const start = toTimestamp(range?.start, `${label}.start`);
  const end = toTimestamp(range?.end, `${label}.end`);

  if (end <= start) {
    throw new Error(`${label}: end must be after start`);
  }

  return { start, end };
}

/**
 * Règle de chevauchement partagée (recherche de disponibilité et réservation).
 * Deux créneaux sont en conflit si :
 *   existant.début < demandé.fin + battement
 *   ET existant.fin + battement > demandé.début
 * Un créneau qui commence exactement quand l'autre se termine n'est pas en conflit.
 */
export function hasOverlap(existing, requested, bufferMinutes = 0) {
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) {
    throw new Error("bufferMinutes must be a number greater than or equal to 0");
  }

  const a = toRange(existing, "existing");
  const b = toRange(requested, "requested");
  const buffer = bufferMinutes * MINUTE_MS;

  return a.start < b.end + buffer && a.end + buffer > b.start;
}
