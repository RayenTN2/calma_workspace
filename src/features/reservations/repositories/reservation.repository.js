import { prisma } from "@/infrastructure/database/prisma";
import { BLOCKING_STATUSES } from "../config";

export async function findRoomById(roomId, client = prisma) {
  return client.room.findUnique({
    where: { id: roomId },
    include: {
      equipment: { include: { equipment: true } },
    },
  });
}

export async function findConflictingReservations(
  client,
  { roomId, windowStart, windowEnd, excludeReservationId }
) {
  return client.reservation.findMany({
    where: {
      roomId,
      status: { in: BLOCKING_STATUSES },
      startAt: { lt: windowEnd },
      endAt: { gt: windowStart },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });
}

export async function createReservation(client, data) {
  return client.reservation.create({
    data: {
      userId: data.userId,
      roomId: data.roomId,
      purpose: data.purpose,
      status: data.status || "PENDING_PAYMENT",
      startAt: data.startAt,
      endAt: data.endAt,
      participants: data.participants,
      ...(data.totalAmount !== undefined ? { totalAmount: data.totalAmount } : {}),
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          capacity: true,
          roomType: true,
          customRoomType: true,
        },
      },
    },
  });
}

export async function findReservationById(id, client = prisma) {
  return client.reservation.findUnique({
    where: { id },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          capacity: true,
          roomType: true,
          customRoomType: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export async function findReservationsByUserId(userId, client = prisma) {
  return client.reservation.findMany({
    where: { userId },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          capacity: true,
          roomType: true,
          customRoomType: true,
        },
      },
    },
    orderBy: { startAt: "desc" },
  });
}

export async function findAllReservations(client = prisma) {
  return client.reservation.findMany({
    include: {
      room: {
        select: {
          id: true,
          name: true,
          capacity: true,
          roomType: true,
          customRoomType: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { startAt: "desc" },
  });
}

export async function updateReservationStatus(id, status, client = prisma) {
  return client.reservation.update({
    where: { id },
    data: { status },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          capacity: true,
          roomType: true,
        },
      },
    },
  });
}
