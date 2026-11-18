/** @jest-environment node */

jest.mock("@/features/auth/utils/authorization", () => ({
  authorizeRoles: jest.fn(),
}));

jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    room: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { authorizeRoles } = require("@/features/auth/utils/authorization");
const { prisma } = require("@/infrastructure/database/prisma");
const roomsRoute = require("./route");
const roomRoute = require("./[id]/route");

const roomId = "fc05dca0-14a9-46c6-a2d4-16c4b367aa8c";

function jsonRequest(body) {
  return { json: async () => body };
}

function makeRoomTransaction(room) {
  return {
    equipment: { findMany: jest.fn().mockResolvedValue([]) },
    room: {
      create: jest.fn().mockResolvedValue(room),
      findUnique: jest.fn().mockResolvedValue(room),
      update: jest.fn().mockResolvedValue(room),
    },
    roomEquipment: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe("manager room API routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    authorizeRoles.mockResolvedValue({ authorized: true, status: 200 });
  });

  test("creates a room and returns 201", async () => {
    const room = { id: roomId, name: "Salle API", capacity: 8, roomType: "MEETING" };
    const tx = makeRoomTransaction(room);
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    const response = await roomsRoute.POST(jsonRequest({
      name: room.name,
      capacity: room.capacity,
      roomType: room.roomType,
      equipmentIds: [],
    }));

    expect(response.status).toBe(201);
    expect((await response.json()).room).toEqual(room);
    expect(tx.room.create).toHaveBeenCalledWith({
      data: { name: room.name, capacity: room.capacity, roomType: room.roomType, customRoomType: null },
    });
  });

  test.each([0, -1])("rejects capacity %s on create with 400", async (capacity) => {
    const response = await roomsRoute.POST(jsonRequest({
      name: "Salle invalide",
      capacity,
      roomType: "MEETING",
    }));

    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("lists rooms for a GERANT", async () => {
    const rooms = [{ id: roomId, name: "Salle API", capacity: 8, isActive: true, equipment: [] }];
    prisma.room.findMany.mockResolvedValue(rooms);

    const response = await roomsRoute.GET({});

    expect(response.status).toBe(200);
    expect((await response.json()).rooms).toEqual(rooms);
    expect(authorizeRoles).toHaveBeenCalledWith({}, ["GERANT"]);
  });

  test("updates a room for a GERANT", async () => {
    const updatedRoom = { id: roomId, name: "Salle modifiée", capacity: 12, roomType: "MEETING", equipment: [] };
    const tx = makeRoomTransaction(updatedRoom);
    tx.room.findUnique
      .mockResolvedValueOnce({ id: roomId })
      .mockResolvedValueOnce(updatedRoom);
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    const response = await roomRoute.PATCH(
      jsonRequest({ name: "Salle modifiée", capacity: 12 }),
      { params: Promise.resolve({ id: roomId }) }
    );

    expect(response.status).toBe(200);
    expect((await response.json()).room).toEqual(updatedRoom);
    expect(tx.room.update).toHaveBeenCalledWith({
      where: { id: roomId },
      data: { name: "Salle modifiée", capacity: 12 },
    });
  });

  test.each([0, -1])("rejects capacity %s on update with 400", async (capacity) => {
    const response = await roomRoute.PATCH(
      jsonRequest({ capacity }),
      { params: Promise.resolve({ id: roomId }) }
    );

    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("deactivates a room for a GERANT", async () => {
    const room = { id: roomId, name: "Salle API", isActive: false, equipment: [] };
    prisma.room.update.mockResolvedValue(room);

    const response = await roomRoute.DELETE({}, { params: Promise.resolve({ id: roomId }) });

    expect(response.status).toBe(200);
    expect((await response.json()).room.isActive).toBe(false);
    expect(prisma.room.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: roomId },
      data: { isActive: false },
    }));
  });

  test.each([
    ["GET rooms", () => roomsRoute.GET({})],
    ["POST rooms", () => roomsRoute.POST(jsonRequest({ name: "Salle", capacity: 4, roomType: "MEETING" }))],
    ["PATCH room", () => roomRoute.PATCH(jsonRequest({ name: "Salle modifiée" }), { params: Promise.resolve({ id: roomId }) })],
    ["DELETE room", () => roomRoute.DELETE({}, { params: Promise.resolve({ id: roomId }) })],
  ])("denies a customer on %s with 403", async (_action, callRoute) => {
    authorizeRoles.mockResolvedValue({ authorized: false, status: 403 });

    const response = await callRoute();

    expect(response.status).toBe(403);
    expect((await response.json()).message).toBe("You do not have permission to access this resource.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.room.findMany).not.toHaveBeenCalled();
    expect(prisma.room.update).not.toHaveBeenCalled();
  });
});
