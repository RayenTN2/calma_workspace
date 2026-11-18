jest.mock("@/features/rooms/repositories/room.repository", () => ({
  createRoom: jest.fn(),
  updateRoom: jest.fn(),
  deactivateRoom: jest.fn(),
}));

const repository = require("@/features/rooms/repositories/room.repository");
const {
  createRoom,
  editRoom,
  deactivateRoom,
} = require("./room.service");

describe("room service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("crée une salle avec une capacité valide", async () => {
    const room = {
      name: "Salle test",
      capacity: 8,
      roomType: "MEETING",
    };

    repository.createRoom.mockResolvedValue(room);

    await expect(createRoom(room)).resolves.toEqual(room);
    expect(repository.createRoom).toHaveBeenCalledWith({
      ...room,
      customRoomType: null,
    });
  });

  test.each([0, -1])(
    "refuse la capacité %s à la création",
    async (capacity) => {
      await expect(
        createRoom({
          name: "Salle test",
          capacity,
          roomType: "MEETING",
        })
      ).rejects.toMatchObject({ status: 400 });

      expect(repository.createRoom).not.toHaveBeenCalled();
    }
  );

  test.each([0, -1])(
    "refuse la capacité %s à la modification",
    async (capacity) => {
      await expect(
        editRoom("room-test-id", { capacity })
      ).rejects.toMatchObject({ status: 400 });

      expect(repository.updateRoom).not.toHaveBeenCalled();
    }
  );

  test("modifie une salle avec une capacité valide", async () => {
    const updatedRoom = {
      id: "room-test-id",
      name: "Salle modifiée",
      capacity: 12,
      roomType: "MEETING",
      customRoomType: null,
    };
    repository.updateRoom.mockResolvedValue(updatedRoom);

    await expect(
      editRoom("room-test-id", { name: "Salle modifiée", capacity: 12 })
    ).resolves.toEqual(updatedRoom);
    expect(repository.updateRoom).toHaveBeenCalledWith("room-test-id", {
      name: "Salle modifiée",
      capacity: 12,
    });
  });

  test("désactive une salle", async () => {
    repository.deactivateRoom.mockResolvedValue({
      id: "room-test-id",
      isActive: false,
    });

    await expect(
      deactivateRoom("room-test-id")
    ).resolves.toMatchObject({
      isActive: false,
    });

    expect(repository.deactivateRoom).toHaveBeenCalledWith("room-test-id");
  });
});
