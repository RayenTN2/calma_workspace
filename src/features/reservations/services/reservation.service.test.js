/** @jest-environment node */

jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock("../repositories/reservation.repository", () => ({
  findRoomById: jest.fn(),
  findConflictingReservations: jest.fn(),
  createReservation: jest.fn(),
  findReservationById: jest.fn(),
  findReservationsByUserId: jest.fn(),
  findAllReservations: jest.fn(),
  updateReservationStatus: jest.fn(),
}));

const { prisma } = require("@/infrastructure/database/prisma");
const {
  findRoomById,
  findConflictingReservations,
  createReservation: createReservationRecord,
  findReservationById,
  findReservationsByUserId,
  findAllReservations,
  updateReservationStatus,
} = require("../repositories/reservation.repository");
const {
  createReservation,
  getReservationsForUser,
  getReservation,
  cancelReservation,
} = require("./reservation.service");

describe("Reservation Service", () => {
  const roomId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("createReservation", () => {
    const validPayload = {
      roomId,
      purpose: "MEETING",
      participants: 6,
      date: "2026-11-25",
      startTime: "10:00",
      endTime: "12:00",
    };

    const mockRoom = {
      id: roomId,
      name: "Salle Atlas",
      capacity: 10,
      roomType: "MEETING",
      isActive: true,
    };

    test("creates a reservation successfully and blocks the slot", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue(mockRoom);
      findConflictingReservations.mockResolvedValue([]);
      createReservationRecord.mockResolvedValue({
        id: "res-1",
        userId,
        roomId,
        purpose: "MEETING",
        status: "PENDING_PAYMENT",
        startAt: new Date("2026-11-25T10:00:00+01:00"),
        endAt: new Date("2026-11-25T12:00:00+01:00"),
        participants: 6,
        room: mockRoom,
      });

      const result = await createReservation({
        userId,
        payload: validPayload,
      });

      expect(result.id).toBe("res-1");
      expect(result.status).toBe("PENDING_PAYMENT");
      expect(findRoomById).toHaveBeenCalledWith(roomId, prisma);
      expect(findConflictingReservations).toHaveBeenCalled();
      expect(createReservationRecord).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          userId,
          roomId,
          purpose: "MEETING",
          participants: 6,
          status: "PENDING_PAYMENT",
        })
      );
    });

    test("throws 404 when room does not exist", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue(null);

      await expect(
        createReservation({ userId, payload: validPayload })
      ).rejects.toMatchObject({
        message: "Room not found.",
        status: 404,
      });
      expect(createReservationRecord).not.toHaveBeenCalled();
    });

    test("throws 400 when room is inactive", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue({ ...mockRoom, isActive: false });

      await expect(
        createReservation({ userId, payload: validPayload })
      ).rejects.toMatchObject({
        message: "This room is currently inactive.",
        status: 400,
      });
    });

    test("throws 400 when participants exceed room capacity", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue({ ...mockRoom, capacity: 4 });

      await expect(
        createReservation({
          userId,
          payload: { ...validPayload, participants: 8 },
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining("Room capacity exceeded"),
        status: 400,
      });
    });

    test("throws 400 when room type does not match purpose", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue({ ...mockRoom, roomType: "INDIVIDUAL" });

      await expect(
        createReservation({
          userId,
          payload: { ...validPayload, purpose: "MEETING" },
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining("not compatible with the selected purpose"),
        status: 400,
      });
    });

    test("throws 409 conflict when room is already reserved for an overlapping slot", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue(mockRoom);
      findConflictingReservations.mockResolvedValue([
        {
          id: "existing-res",
          startAt: new Date("2026-11-25T11:00:00+01:00"),
          endAt: new Date("2026-11-25T13:00:00+01:00"),
          status: "PENDING_PAYMENT",
        },
      ]);

      await expect(
        createReservation({ userId, payload: validPayload })
      ).rejects.toMatchObject({
        message: "This room is already booked for the selected time slot.",
        status: 409,
      });

      expect(createReservationRecord).not.toHaveBeenCalled();
    });

    test("allows reservation that ends exactly when existing starts", async () => {
      prisma.$transaction.mockImplementation((callback) => callback(prisma));
      findRoomById.mockResolvedValue(mockRoom);
      // Existing reservation from 12:00 to 14:00; requested is 10:00 to 12:00
      findConflictingReservations.mockResolvedValue([
        {
          id: "existing-res",
          startAt: new Date("2026-11-25T12:00:00+01:00"),
          endAt: new Date("2026-11-25T14:00:00+01:00"),
          status: "CONFIRMED",
        },
      ]);
      createReservationRecord.mockResolvedValue({ id: "res-adjacent" });

      const res = await createReservation({ userId, payload: validPayload });
      expect(res.id).toBe("res-adjacent");
    });
  });

  describe("getReservationsForUser", () => {
    test("returns user reservations for customer", async () => {
      const mockList = [{ id: "r1", userId }];
      findReservationsByUserId.mockResolvedValue(mockList);

      const result = await getReservationsForUser(userId, "USER");
      expect(result).toBe(mockList);
      expect(findReservationsByUserId).toHaveBeenCalledWith(userId);
      expect(findAllReservations).not.toHaveBeenCalled();
    });

    test("returns all reservations for manager", async () => {
      const mockList = [{ id: "r1" }, { id: "r2" }];
      findAllReservations.mockResolvedValue(mockList);

      const result = await getReservationsForUser(userId, "GERANT");
      expect(result).toBe(mockList);
      expect(findAllReservations).toHaveBeenCalled();
    });
  });

  describe("getReservation", () => {
    test("returns reservation for owner", async () => {
      const mock = { id: "r1", userId };
      findReservationById.mockResolvedValue(mock);

      const result = await getReservation("r1", { userId, role: "USER" });
      expect(result).toBe(mock);
    });

    test("throws 403 when user is not owner and not GERANT", async () => {
      findReservationById.mockResolvedValue({ id: "r1", userId: "other-user" });

      await expect(
        getReservation("r1", { userId, role: "USER" })
      ).rejects.toMatchObject({
        status: 403,
      });
    });

    test("allows GERANT to view another user reservation", async () => {
      const mock = { id: "r1", userId: "other-user" };
      findReservationById.mockResolvedValue(mock);

      const result = await getReservation("r1", { userId, role: "GERANT" });
      expect(result).toBe(mock);
    });

    test("throws 404 when reservation not found", async () => {
      findReservationById.mockResolvedValue(null);

      await expect(
        getReservation("nonexistent", { userId, role: "USER" })
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("cancelReservation", () => {
    test("cancels reservation successfully", async () => {
      findReservationById.mockResolvedValue({
        id: "r1",
        userId,
        status: "PENDING_PAYMENT",
      });
      updateReservationStatus.mockResolvedValue({
        id: "r1",
        status: "CANCELLED",
      });

      const result = await cancelReservation("r1", { userId, role: "USER" });
      expect(result.status).toBe("CANCELLED");
      expect(updateReservationStatus).toHaveBeenCalledWith("r1", "CANCELLED");
    });

    test("throws 400 if already cancelled", async () => {
      findReservationById.mockResolvedValue({
        id: "r1",
        userId,
        status: "CANCELLED",
      });

      await expect(
        cancelReservation("r1", { userId, role: "USER" })
      ).rejects.toMatchObject({
        status: 400,
        message: "This reservation is already cancelled.",
      });
    });
  });
});
