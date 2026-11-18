import { CENTER_UTC_OFFSET, PURPOSE_TO_ROOM_TYPE } from "../config";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Vérifie que le jour existe vraiment (refuse par exemple le 30 février).
function isRealDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function toDateTime(date, time) {
  return new Date(`${date}T${time}:00${CENTER_UTC_OFFSET}`);
}

function parseEquipment(raw) {
  if (raw === undefined || raw === null) {
    return [];
  }

  const items = Array.isArray(raw) ? raw : [raw];

  return items
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((name) => name.trim())
    .filter(Boolean);
}

// Retourne { error, value } : error est un message (ou null) et value
// contient les paramètres convertis lorsque la saisie est valide.
export function validateAvailabilityQuery(query) {
  const { date, startTime, endTime, participants, purpose, equipment } =
    query ?? {};

  if (
    typeof date !== "string" ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    participants === undefined ||
    participants === null ||
    participants === ""
  ) {
    return {
      error: "Date, start time, end time and participants are required.",
      value: null,
    };
  }

  if (!DATE_PATTERN.test(date) || !isRealDate(date)) {
    return { error: "Invalid date. Expected format: YYYY-MM-DD.", value: null };
  }

  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return { error: "Invalid time. Expected format: HH:mm.", value: null };
  }

  const start = toDateTime(date, startTime);
  const end = toDateTime(date, endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid date.", value: null };
  }

  if (end <= start) {
    return { error: "End time must be after start time.", value: null };
  }

  if (!/^\d+$/.test(String(participants)) || Number(participants) < 1) {
    return {
      error: "Participants must be a positive whole number.",
      value: null,
    };
  }

  if (purpose !== undefined && purpose !== null && purpose !== "") {
    if (!Object.hasOwn(PURPOSE_TO_ROOM_TYPE, purpose)) {
      return { error: "Invalid reservation purpose.", value: null };
    }
  }

  return {
    error: null,
    value: {
      start,
      end,
      participants: Number(participants),
      purpose: purpose || null,
      equipment: parseEquipment(equipment),
    },
  };
}
