/** @jest-environment node */

jest.mock("@/features/auth/utils/authorization", () => ({
  authorizeRoles: jest.fn(),
}));

jest.mock("@/features/reservations/services/reservation.service", () => ({
  createReservation: jest.fn(),
  getReservationsForUser: jest.fn(),
  getReservation: jest.fn(),
  cancelReservation: jest.fn(),
}));

const { authorizeRoles } = require("@/features/auth/utils/authorization");
const {
  createReservation,
  getReservationsForUser,
  getReservation,
  cancelReservation,
} = require("@/features/reservations/services/reservation.service");
const reservationsRoute = require("./route");
const reservationDetailRoute = require("./[id]/route");

const userId = "user-123";
const reservationId = "res-456";

function jsonRequest(body) {
  return {
    json: async () => body,
  };
}

describe("Reservations API routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("POST /api/reservations", () => {
    test("returns 401 when user is not authenticated", async () => {
      authorizeRoles.mockResolvedValue({ authorized: false, status: 401 });

      const response = await reservationsRoute.POST(
        jsonRequest({ roomId: "some-room" })
      );

      expect(response.status).toBe(401);
      expect((await response.json()).message).toBe("You must log in first.");
      expect(createReservation).not.toHaveBeenCalled();
    });

    test("returns 400 when body is not valid JSON", async () => {
      authorizeRoles.mockResolvedValue({
        authorized: true,
        user: { id: userId, role: "USER" },
      });

      const req = {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      };

      const response = await reservationsRoute.POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe("Invalid JSON body.");
    });

    test("creates reservation and returns 201", async () => {
      authorizeRoles.mockResolvedValue({
        authorized: true,
        user: { id: userId, role: "USER" },
      });

      const mockCreated = {
        id: reservationId,
        userId,
        roomId: "room-1",
        purpose: "MEETING",
        status: "PENDING_PAYMENT",
      };

      createReservation.mockResolvedValue(mockCreated);

      const payload = {
        roomId: "room-1",
        purpose: "MEETING",
        participants: 5,
        date: "2026-11-25",
        startTime: "10:00",
        endTime: "12:00",
      };

      const response = await reservationsRoute.POST(jsonRequest(payload));

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.message).toBe("Room reserved successfully.");
      expect(json.reservation).toEqual(mockCreated);
      expect(createReservation).toHaveBeenCalledWith({
        userId,
        payload,
      });
    });

    test("handles conflict error with 409", async () => {
      authorizeRoles.mockResolvedValue({
        authorized: true,
        user: { id: userId, role: "USER" },
      });

      const conflictErr = new Error(
        "This room is already booked for the selected time slot."
      );
      conflictErr.status = 409;
      createReservation.mockRejectedValue(conflictErr);

      const response = await reservationsRoute.POST(
        jsonRequest({ roomId: "room-1" })
      );

      expect(response.status).toBe(409);
      expect((await response.json()).message).toBe(
        "This room is already booked for the selected time slot."
      );
    });
  });

  describe("GET /api/reservations", () => {
    test("returns 200 with user reservations", async () => {
      authorizeRoles.mockResolvedValue({
        authorized: true,
        user: { id: userId, role: "USER" },
      });

      const mockReservations = [{ id: "r1" }, { id: "r2" }];
      getReservationsForUser.mockResolvedValue(mockReservations);

      const response = await reservationsRoute.GET({});

      expect(response.status).toBe(200);
      expect((await response.json()).reservations).toEqual(mockReservations);
      expect(getReservationsForUser).toHaveBeenCalledWith(userId, "USER");
    });
  });

  describe("GET /api/reservations/[id]", () => {
    test("returns 200 with reservation details", async () => {
      authorizeRoles.mockResolvedValue({
        authorized: true,
        user: { id: userId, role: "USER" },
      });

      const mockRes = { id: reservationId, userId };
      getReservation.mockResolvedValue(mockRes);

      const response = await reservationDetailRoute.GET(
        {},
        { params: Promise.resolve({ id: reservationId }) }
      );

      expect(response.status).toBe(200);
      expect((await response.json()).reservation).toEqual(mockRes);
      expect(getReservation).toHaveBeenCalledWith(reservationId, {
        userId,
        role: "USER",
      });
    });
  });

  describe("DELETE /api/reservations/[id]", () => {
    test("cancels reservation and returns 200", async () => {
      authorizeRoles.mockResolvedValue({
        authorized: true,
        user: { id: userId, role: "USER" },
      });

      const mockCancelled = { id: reservationId, status: "CANCELLED" };
      cancelReservation.mockResolvedValue(mockCancelled);

      const response = await reservationDetailRoute.DELETE(
        {},
        { params: Promise.resolve({ id: reservationId }) }
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toBe("Reservation cancelled successfully.");
      expect(json.reservation).toEqual(mockCancelled);
    });
  });
});
