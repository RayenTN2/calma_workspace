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

function validatePatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Room data must be an object." };
  }

  const data = {};
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
      return { error: "Room name is required and must be at most 100 characters." };
    }
    data.name = body.name.trim();
  }
  if (Object.hasOwn(body, "capacity")) {
    if (!Number.isInteger(body.capacity) || body.capacity <= 0) {
      return { error: "Room capacity must be a positive integer." };
    }
    data.capacity = body.capacity;
  }
  if (Object.hasOwn(body, "roomType")) {
    if (!roomTypes.has(body.roomType)) {
      return { error: "Room type must be INDIVIDUAL, MEETING, TRAINING, or OTHER." };
    }
    data.roomType = body.roomType;
    if (body.roomType === "OTHER") {
      if (typeof body.customRoomType !== "string" || !body.customRoomType.trim() || body.customRoomType.trim().length > 100) {
        return { error: "Enter a custom room type of at most 100 characters." };
      }
      data.customRoomType = body.customRoomType.trim();
    } else {
      data.customRoomType = null;
    }
  } else if (Object.hasOwn(body, "customRoomType")) {
    if (typeof body.customRoomType !== "string" || !body.customRoomType.trim() || body.customRoomType.trim().length > 100) {
      return { error: "Custom room type must contain at most 100 characters." };
    }
    data.customRoomType = body.customRoomType.trim();
  }

  if (Object.hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") return { error: "Room status must be a boolean." };
    data.isActive = body.isActive;
  }

  let equipmentIds;
  if (Object.hasOwn(body, "equipmentIds")) {
    if (!Array.isArray(body.equipmentIds) || body.equipmentIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
      return { error: "Equipment IDs must be an array of valid UUIDs." };
    }
    equipmentIds = [...new Set(body.equipmentIds)];
  }
  if (Object.keys(data).length === 0 && equipmentIds === undefined) {
    return { error: "Provide at least one room field or equipment selection to update." };
  }
  return { data, equipmentIds };
}

export async function PATCH(request, { params }) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  const denied = denyIfUnauthorized(auth);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validatePatch(body);
  if (validated.error) return NextResponse.json({ message: validated.error }, { status: 400 });
  const { data, equipmentIds } = validated;

  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) return NextResponse.json({ message: "Invalid room ID." }, { status: 400 });

    const room = await prisma.$transaction(async (tx) => {
      const existing = await tx.room.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;

      if (equipmentIds !== undefined) {
        if (equipmentIds.length) {
          const matches = await tx.equipment.findMany({
            where: { id: { in: equipmentIds } },
            select: { id: true },
          });
          if (matches.length !== equipmentIds.length) {
            const error = new Error("One or more selected equipment items do not exist.");
            error.status = 400;
            throw error;
          }
        }
        await tx.roomEquipment.deleteMany({ where: { roomId: id } });
        if (equipmentIds.length) {
          await tx.roomEquipment.createMany({
            data: equipmentIds.map((equipmentId) => ({ roomId: id, equipmentId })),
          });
        }
      }

      if (Object.keys(data).length) await tx.room.update({ where: { id }, data });
      return tx.room.findUnique({
        where: { id },
        include: { equipment: { include: { equipment: true } } },
      });
    });

    if (!room) return NextResponse.json({ message: "Room not found." }, { status: 404 });
    return NextResponse.json({ room });
  } catch (error) {
    if (error.status === 400) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error.code === "P2002") return NextResponse.json({ message: "A room with this name already exists." }, { status: 409 });
    if (error.code === "P2022") {
      return NextResponse.json({ message: "The database schema is outdated. Apply the pending Prisma migration, then try again." }, { status: 503 });
    }
    if (error.code === "P1001") {
      return NextResponse.json({ message: "The database is unavailable. Start PostgreSQL and try again." }, { status: 503 });
    }
    return NextResponse.json({ message: "Unable to update the room." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  const denied = denyIfUnauthorized(auth);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) return NextResponse.json({ message: "Invalid room ID." }, { status: 400 });
    const room = await prisma.room.update({
      where: { id },
      data: { isActive: false },
      include: { equipment: { include: { equipment: true } } },
    });
    return NextResponse.json({ room });
  } catch (error) {
    if (error.code === "P2025") return NextResponse.json({ message: "Room not found." }, { status: 404 });
    return NextResponse.json({ message: "Unable to deactivate the room." }, { status: 500 });
  }
}
