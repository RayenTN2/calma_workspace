/** @jest-environment node */

import { POST } from "./route";

jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {},
}));

jest.mock("@/features/reservations/repositories/reservation.repository", () => ({
  findRoomById: jest.fn(),
}));

const { findRoomById } = require("@/features/reservations/repositories/reservation.repository");

describe("Reservation Cost API route (US-08)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("calculates cost for individual room with hourly rate", async () => {
    findRoomById.mockResolvedValue({
      id: "room-1",
      name: "Bureau Privé",
      roomType: "INDIVIDUAL",
      capacity: 1,
    });

    const request = new Request("http://localhost:3000/api/reservations/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: "room-1",
        date: "2026-11-25",
        startTime: "10:00",
        endTime: "12:00",
        participants: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cost).toBeDefined();
    expect(data.cost.amount).toBe(20.0); // 2h * 10 DT/h
    expect(data.cost.currency).toBe("DT");
    expect(data.cost.typology).toBe("INDIVIDUAL");
    expect(data.cost.rateType).toBe("HOURLY");
  });

  test("calculates cost for group room with hourly rate", async () => {
    findRoomById.mockResolvedValue({
      id: "room-2",
      name: "Salle de réunion Atlas",
      roomType: "MEETING",
      capacity: 8,
    });

    const request = new Request("http://localhost:3000/api/reservations/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: "room-2",
        date: "2026-11-25",
        startTime: "14:00",
        endTime: "16:00",
        participants: 4,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cost.amount).toBe(50.0); // 2h * 25 DT/h
    expect(data.cost.typology).toBe("GROUP");
    expect(data.cost.formattedAmount).toBe("50.00 DT");
  });

  test("returns 400 when body is invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/reservations/cost", {
      method: "POST",
      body: "invalid-json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("returns 400 when end time is before start time", async () => {
    const request = new Request("http://localhost:3000/api/reservations/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomType: "INDIVIDUAL",
        date: "2026-11-25",
        startTime: "14:00",
        endTime: "12:00",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
