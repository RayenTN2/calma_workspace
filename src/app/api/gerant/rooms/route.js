import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import { prisma } from "@/infrastructure/database/prisma";

const roomTypes = new Set(["INDIVIDUAL", "MEETING", "TRAINING", "OTHER"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function denyIfUnauthorized(auth) {
  if (auth.authorized) return null;
  const message = auth.status === 401
    ? "You must log in first."
    : "You do not have permission to access this resource.";
  return NextResponse.json({ message }, { status: auth.status });
}

function validateRoomPayload(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Room data must be an object." };
  }

  const data = {};
  if (!partial || Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
      return { error: "Room name is required and must be at most 100 characters." };
    }
    data.name = body.name.trim();
  }

  if (!partial || Object.hasOwn(body, "capacity")) {
    if (!Number.isInteger(body.capacity) || body.capacity <= 0) {
      return { error: "Room capacity must be a positive integer." };
    }
    data.capacity = body.capacity;
  }

  if (!partial || Object.hasOwn(body, "roomType")) {
    if (!roomTypes.has(body.roomType)) {
      return { error: "Room type must be INDIVIDUAL, MEETING, TRAINING, or OTHER." };
    }
    data.roomType = body.roomType;
  }

  if (body.roomType === "OTHER") {
    if (typeof body.customRoomType !== "string" || !body.customRoomType.trim() || body.customRoomType.trim().length > 100) {
      return { error: "Enter a custom room type of at most 100 characters." };
    }
    data.customRoomType = body.customRoomType.trim();
  } else if (Object.hasOwn(body, "roomType")) {
    data.customRoomType = null;
  }

  let equipmentIds;
  if (Object.hasOwn(body, "equipmentIds")) {
    if (!Array.isArray(body.equipmentIds) || body.equipmentIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
      return { error: "Equipment IDs must be an array of valid UUIDs." };
    }
    equipmentIds = [...new Set(body.equipmentIds)];
  }

  if (Object.hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") return { error: "Room status must be a boolean." };
    data.isActive = body.isActive;
  }

  if (partial && Object.keys(data).length === 0 && equipmentIds === undefined) {
    return { error: "Provide at least one room field or equipment selection to update." };
  }

  return { data, equipmentIds };
}

async function validateEquipmentIds(tx, equipmentIds) {
  if (equipmentIds === undefined || equipmentIds.length === 0) return null;
  const equipment = await tx.equipment.findMany({
    where: { id: { in: equipmentIds } },
    select: { id: true },
  });
  return equipment.length === equipmentIds.length ? null : "One or more selected equipment items do not exist.";
}

export async function GET(request) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  const denied = denyIfUnauthorized(auth);
  if (denied) return denied;

  try {
    const rooms = await prisma.room.findMany({
      include: { equipment: { include: { equipment: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ rooms });
  } catch {
    return NextResponse.json({ message: "Unable to load rooms." }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  const denied = denyIfUnauthorized(auth);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateRoomPayload(body);
  if (validated.error) return NextResponse.json({ message: validated.error }, { status: 400 });
  const { data, equipmentIds = [] } = validated;

  try {
    const room = await prisma.$transaction(async (tx) => {
      const equipmentError = await validateEquipmentIds(tx, equipmentIds);
      if (equipmentError) {
        const error = new Error(equipmentError);
        error.status = 400;
        throw error;
      }
      const created = await tx.room.create({ data });
      if (equipmentIds.length) {
        await tx.roomEquipment.createMany({
          data: equipmentIds.map((equipmentId) => ({ roomId: created.id, equipmentId })),
        });
      }
      return tx.room.findUnique({
        where: { id: created.id },
        include: { equipment: { include: { equipment: true } } },
      });
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error.status === 400) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error.code === "P2002") return NextResponse.json({ message: "A room with this name already exists." }, { status: 409 });
    return NextResponse.json({ message: "Unable to create the room." }, { status: 500 });
  }
}
