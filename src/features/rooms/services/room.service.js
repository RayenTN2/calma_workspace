import {
  createRoom as insertRoom,
  deactivateRoom as markRoomInactive,
  updateRoom as saveRoomChanges,
} from "@/features/rooms/repositories/room.repository";

const allowedRoomTypes = new Set(["INDIVIDUAL", "MEETING", "TRAINING"]);
const editableFields = ["name", "capacity", "roomType"];

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateRoomData(data, { partial = false } = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw validationError("Room data must be an object.");
  }

  if (!partial || Object.hasOwn(data, "name")) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      throw validationError("Room name is required.");
    }
    if (data.name.trim().length > 100) {
      throw validationError("Room name must not exceed 100 characters.");
    }
  }

  if (!partial || Object.hasOwn(data, "capacity")) {
    if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
      throw validationError("Room capacity must be a positive integer.");
    }
  }

  if (!partial || Object.hasOwn(data, "roomType")) {
    if (!allowedRoomTypes.has(data.roomType)) {
      throw validationError("Room type must be INDIVIDUAL, MEETING, or TRAINING.");
    }
  }

  const result = {};
  for (const field of editableFields) {
    if (Object.hasOwn(data, field)) {
      result[field] = field === "name" ? data[field].trim() : data[field];
    }
  }

  if (partial && Object.keys(result).length === 0) {
    throw validationError("Provide at least one room field to update.");
  }

  return result;
}

export async function createRoom(data) {
  return insertRoom(validateRoomData(data));
}

export async function editRoom(id, data) {
  if (typeof id !== "string" || !id.trim()) {
    throw validationError("Room ID is required.");
  }

  return saveRoomChanges(id, validateRoomData(data, { partial: true }));
}

export async function deactivateRoom(id) {
  if (typeof id !== "string" || !id.trim()) {
    throw validationError("Room ID is required.");
  }

  return markRoomInactive(id);
}
