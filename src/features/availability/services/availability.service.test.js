import { searchAvailableRooms } from "./availability.service";
import { findCandidateRooms } from "../repositories/availability.repository";

jest.mock("../repositories/availability.repository", () => ({
  findCandidateRooms: jest.fn(),
}));

// Créneau demandé : 10:00-12:00 (heure du centre, UTC+1) = 09:00-11:00 UTC.
const query = {
  date: "2026-11-20",
  startTime: "10:00",
  endTime: "12:00",
  participants: "4",
};

const utc = (time) => new Date(`2026-11-20T${time}:00.000Z`);

function room(overrides = {}) {
  return {
    id: "room-1",
    name: "Salle A",
    capacity: 6,
    roomType: "MEETING",
    equipment: [{ equipment: { name: "Wifi" } }],
    reservations: [],
    ...overrides,
  };
}

beforeEach(() => {
  findCandidateRooms.mockReset();
});

describe("searchAvailableRooms", () => {
  test("retourne les salles sans réservation", async () => {
    findCandidateRooms.mockResolvedValue([room()]);

    const result = await searchAvailableRooms(query);

    expect(result).toEqual([
      {
        id: "room-1",
        name: "Salle A",
        capacity: 6,
        roomType: "MEETING",
        equipment: ["Wifi"],
      },
    ]);
  });

  test("exclut une salle dont une réservation chevauche le créneau", async () => {
    findCandidateRooms.mockResolvedValue([
      room({
        id: "busy",
        reservations: [{ startAt: utc("10:00"), endAt: utc("11:30") }],
      }),
      room({ id: "free" }),
    ]);

    const result = await searchAvailableRooms(query);

    expect(result.map((r) => r.id)).toEqual(["free"]);
  });

  test("garde une salle dont la réservation se termine en respectant le temps de battement", async () => {
    findCandidateRooms.mockResolvedValue([
      room({
        reservations: [{ startAt: utc("07:00"), endAt: utc("08:45") }],
      }),
    ]);

    expect(await searchAvailableRooms(query)).toHaveLength(1);
  });

  test("exclut une salle dont la réservation se termine pendant le temps de battement avant le créneau", async () => {
    findCandidateRooms.mockResolvedValue([
      room({
        reservations: [{ startAt: utc("07:00"), endAt: utc("08:50") }],
      }),
    ]);

    expect(await searchAvailableRooms(query)).toHaveLength(0);
  });

  test("garde une salle dont la réservation commence en respectant le temps de battement", async () => {
    findCandidateRooms.mockResolvedValue([
      room({
        reservations: [{ startAt: utc("11:15"), endAt: utc("13:00") }],
      }),
    ]);

    expect(await searchAvailableRooms(query)).toHaveLength(1);
  });

  test("exclut une salle dont la réservation commence pendant le temps de battement après le créneau", async () => {
    findCandidateRooms.mockResolvedValue([
      room({
        reservations: [{ startAt: utc("11:10"), endAt: utc("13:00") }],
      }),
    ]);

    expect(await searchAvailableRooms(query)).toHaveLength(0);
  });

  test("transmet la capacité demandée au dépôt (filtre de capacité)", async () => {
    findCandidateRooms.mockResolvedValue([]);

    await searchAvailableRooms(query);

    expect(findCandidateRooms).toHaveBeenCalledWith(
      expect.objectContaining({ minCapacity: 4 })
    );
  });

  test("déduit le type de salle de l'objet de réservation", async () => {
    findCandidateRooms.mockResolvedValue([]);

    await searchAvailableRooms({ ...query, purpose: "GROUP_TRAINING" });

    expect(findCandidateRooms).toHaveBeenCalledWith(
      expect.objectContaining({ roomType: "TRAINING" })
    );
  });

  test("ne filtre pas par type de salle sans objet", async () => {
    findCandidateRooms.mockResolvedValue([]);

    await searchAvailableRooms(query);

    expect(findCandidateRooms).toHaveBeenCalledWith(
      expect.objectContaining({ roomType: undefined })
    );
  });

  test("transmet les équipements demandés", async () => {
    findCandidateRooms.mockResolvedValue([]);

    await searchAvailableRooms({ ...query, equipment: ["Wifi", "Tableau"] });

    expect(findCandidateRooms).toHaveBeenCalledWith(
      expect.objectContaining({ equipmentNames: ["Wifi", "Tableau"] })
    );
  });

  test("rejette une saisie invalide avec le statut 400, sans interroger la base", async () => {
    await expect(
      searchAvailableRooms({ ...query, endTime: "09:00" })
    ).rejects.toMatchObject({ status: 400 });

    expect(findCandidateRooms).not.toHaveBeenCalled();
  });

  test("rejette un nombre de participants invalide avec le statut 400", async () => {
    await expect(
      searchAvailableRooms({ ...query, participants: "0" })
    ).rejects.toMatchObject({ status: 400 });
  });
});
