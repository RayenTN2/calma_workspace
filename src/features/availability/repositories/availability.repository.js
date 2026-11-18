import { prisma } from "@/infrastructure/database/prisma";
import { BLOCKING_STATUSES } from "../config";

// Salles actives qui satisfont la capacité, le type et les équipements,
// avec leurs réservations bloquantes proches du créneau demandé.
// La décision finale de conflit est prise par la règle partagée (overlap.js).
export async function findCandidateRooms({
  minCapacity,
  roomType,
  equipmentNames,
  windowStart,
  windowEnd,
}) {
  return prisma.room.findMany({
    where: {
      isActive: true,
      capacity: { gte: minCapacity },
      ...(roomType ? { roomType } : {}),
      AND: equipmentNames.map((name) => ({
        equipment: { some: { equipment: { name } } },
      })),
    },
    include: {
      equipment: { include: { equipment: true } },
      reservations: {
        where: {
          status: { in: BLOCKING_STATUSES },
          startAt: { lt: windowEnd },
          endAt: { gt: windowStart },
        },
        select: { startAt: true, endAt: true },
      },
    },
    orderBy: { name: "asc" },
  });
}
