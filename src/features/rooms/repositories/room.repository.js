import { prisma } from "@/infrastructure/database/prisma";

export async function createRoom(data) {
  return prisma.room.create({ data });
}

export async function updateRoom(id, data) {
  return prisma.room.update({
    where: { id },
    data,
  });
}

export async function deactivateRoom(id) {
  return prisma.room.update({
    where: { id },
    data: { isActive: false },
  });
}
