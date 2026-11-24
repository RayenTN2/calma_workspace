import { CENTER_UTC_OFFSET, VALID_PURPOSES } from "../config";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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

export function validateCreateReservation(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Reservation payload must be an object.", value: null };
  }

  const { roomId, purpose, participants, date, startTime, endTime, startAt, endAt } =
    payload;

  // 1. Validate roomId
  if (typeof roomId !== "string" || !UUID_PATTERN.test(roomId)) {
    return { error: "A valid room ID (UUID) is required.", value: null };
  }

  // 2. Validate purpose (nature)
  if (!purpose || typeof purpose !== "string" || !VALID_PURPOSES.includes(purpose)) {
    return {
      error: `Invalid reservation purpose. Allowed values: ${VALID_PURPOSES.join(", ")}.`,
      value: null,
    };
  }

  // 3. Validate participants
  if (
    participants === undefined ||
    participants === null ||
    participants === "" ||
    !/^\d+$/.test(String(participants)) ||
    Number(participants) < 1
  ) {
    return {
      error: "Participants must be a positive whole number.",
      value: null,
    };
  }

  // 4. Validate time slot
  let start;
  let end;

  if (startAt && endAt) {
    start = new Date(startAt);
    end = new Date(endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { error: "Invalid date format for startAt or endAt.", value: null };
    }
  } else if (date && startTime && endTime) {
    if (
      typeof date !== "string" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return {
        error: "Date, startTime, and endTime must be strings.",
        value: null,
      };
    }

    if (!DATE_PATTERN.test(date) || !isRealDate(date)) {
      return { error: "Invalid date. Expected format: YYYY-MM-DD.", value: null };
    }

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return { error: "Invalid time. Expected format: HH:mm.", value: null };
    }

    start = toDateTime(date, startTime);
    end = toDateTime(date, endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { error: "Invalid date or time values.", value: null };
    }
  } else {
    return {
      error:
        "Time slot is required: provide either (date, startTime, endTime) or (startAt, endAt).",
      value: null,
    };
  }

  if (end <= start) {
    return { error: "End time must be after start time.", value: null };
  }

  return {
    error: null,
    value: {
      roomId,
      purpose,
      participants: Number(participants),
      startAt: start,
      endAt: end,
    },
  };
}
