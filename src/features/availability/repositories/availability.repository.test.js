import { findCandidateRooms } from "./availability.repository";
import { prisma } from "@/infrastructure/database/prisma";

jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: { room: { findMany: jest.fn() } },
}));

const params = {
  minCapacity: 4,
  roomType: "MEETING",
  equipmentNames: ["Wifi"],
  windowStart: new Date("2026-11-20T09:00:00.000Z"),
  windowEnd: new Date("2026-11-20T11:00:00.000Z"),
};

beforeEach(() => {
  prisma.room.findMany.mockReset();
  prisma.room.findMany.mockResolvedValue([]);
});

describe("findCandidateRooms", () => {
  test("ne retourne que les salles actives (une salle désactivée est exclue)", async () => {
    await findCandidateRooms(params);

    const { where } = prisma.room.findMany.mock.calls[0][0];

    expect(where.isActive).toBe(true);
  });

  test("filtre sur la capacité minimale", async () => {
    await findCandidateRooms(params);

    const { where } = prisma.room.findMany.mock.calls[0][0];

    expect(where.capacity).toEqual({ gte: 4 });
  });

  test("filtre sur le type de salle quand il est fourni", async () => {
    await findCandidateRooms(params);

    expect(prisma.room.findMany.mock.calls[0][0].where.roomType).toBe("MEETING");
  });

  test("ne filtre pas sur le type de salle quand il est absent", async () => {
    await findCandidateRooms({ ...params, roomType: undefined });

    expect(prisma.room.findMany.mock.calls[0][0].where).not.toHaveProperty(
      "roomType"
    );
  });

  test("exige chaque équipement demandé", async () => {
    await findCandidateRooms({ ...params, equipmentNames: ["Wifi", "Tableau"] });

    const { where } = prisma.room.findMany.mock.calls[0][0];

    expect(where.AND).toHaveLength(2);
  });

  test("ignore les réservations annulées", async () => {
    await findCandidateRooms(params);

    const { include } = prisma.room.findMany.mock.calls[0][0];
    const statuses = include.reservations.where.status.in;

    expect(statuses).toEqual(["PENDING_PAYMENT", "CONFIRMED"]);
    expect(statuses).not.toContain("CANCELLED");
  });
});
