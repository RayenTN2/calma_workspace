import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RoomsDashboard from "./RoomsDashboard";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const roomId = "fc05dca0-14a9-46c6-a2d4-16c4b367aa8c";
const equipmentId = "a906c61a-c93d-4a26-b58b-62bc8f3b8b10";
const equipmentCatalog = [{ id: equipmentId, name: "Projecteur", _count: { rooms: 0 } }];

function apiResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function roomEquipment(equipmentIds = []) {
  return equipmentIds.map((id) => ({
    equipmentId: id,
    equipment: equipmentCatalog.find((item) => item.id === id),
  }));
}

function makeRoom(overrides = {}) {
  return {
    id: roomId,
    name: "Salle existante",
    capacity: 8,
    roomType: "MEETING",
    customRoomType: null,
    isActive: true,
    equipment: roomEquipment([equipmentId]),
    ...overrides,
  };
}

function setupDashboard(initialRooms = [makeRoom()]) {
  let rooms = initialRooms;
  const calls = [];

  global.fetch = jest.fn(async (url, options = {}) => {
    const method = options.method || "GET";
    calls.push({ url, method, body: options.body ? JSON.parse(options.body) : undefined });

    if (url === "/api/gerant/rooms" && method === "GET") {
      return apiResponse({ rooms });
    }
    if (url === "/api/gerant/equipment" && method === "GET") {
      return apiResponse({ equipment: equipmentCatalog });
    }
    if (url === "/api/gerant/rooms" && method === "POST") {
      const body = JSON.parse(options.body);
      const room = makeRoom({
        ...body,
        id: "f04b715b-e3e0-42e0-bdfd-b305d67b9132",
        equipment: roomEquipment(body.equipmentIds),
      });
      rooms = [...rooms, room];
      return apiResponse({ room }, 201);
    }
    if (url.startsWith("/api/gerant/rooms/") && method === "PATCH") {
      const id = url.split("/").at(-1);
      const body = JSON.parse(options.body);
      rooms = rooms.map((room) => room.id === id
        ? { ...room, ...body, equipment: roomEquipment(body.equipmentIds || []) }
        : room);
      return apiResponse({ room: rooms.find((room) => room.id === id) });
    }
    if (url.startsWith("/api/gerant/rooms/") && method === "DELETE") {
      const id = url.split("/").at(-1);
      rooms = rooms.map((room) => room.id === id ? { ...room, isActive: false } : room);
      return apiResponse({ room: rooms.find((room) => room.id === id) });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  return calls;
}

async function renderLoadedDashboard() {
  render(<RoomsDashboard />);
  await waitFor(() => {
    expect(screen.queryByText("Chargement des salles…")).not.toBeInTheDocument();
  });
}

describe("manager rooms dashboard", () => {
  beforeEach(() => {
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("lists rooms and their equipment", async () => {
    setupDashboard();
    await renderLoadedDashboard();

    expect(await screen.findByRole("heading", { name: "Salle existante" })).toBeInTheDocument();
    expect(screen.getByText("8 places")).toBeInTheDocument();
    expect(screen.getByText("Projecteur")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  test("creates a custom room type and submits selected equipment", async () => {
    const calls = setupDashboard([]);
    await renderLoadedDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Nouvelle salle" }));
    fireEvent.change(screen.getByPlaceholderText("Ex. Atelier des oliviers"), {
      target: { value: "Espace projet" },
    });
    fireEvent.change(screen.getByPlaceholderText("8"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText(/Type de salle/), { target: { value: "OTHER" } });
    fireEvent.change(screen.getByPlaceholderText("Ex. Salle de coworking"), {
      target: { value: "Salle de coworking" },
    });
    fireEvent.click(screen.getByLabelText("Projecteur"));
    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    await waitFor(() => expect(calls.some((call) => call.method === "POST" && call.url === "/api/gerant/rooms")).toBe(true));
    const createCall = calls.find((call) => call.method === "POST" && call.url === "/api/gerant/rooms");
    expect(createCall.body).toEqual({
      name: "Espace projet",
      capacity: 6,
      roomType: "OTHER",
      customRoomType: "Salle de coworking",
      equipmentIds: [equipmentId],
    });
  });

  test("edits an existing room", async () => {
    const calls = setupDashboard();
    await renderLoadedDashboard();

    await screen.findByRole("heading", { name: "Salle existante" });
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.change(screen.getByPlaceholderText("Ex. Atelier des oliviers"), {
      target: { value: "Salle mise à jour" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(calls.some((call) => call.method === "PATCH" && call.url.endsWith(roomId))).toBe(true));
    const updateCall = calls.find((call) => call.method === "PATCH" && call.url.endsWith(roomId));
    expect(updateCall.body).toMatchObject({
      name: "Salle mise à jour",
      capacity: 8,
      equipmentIds: [equipmentId],
    });
  });

  test("deactivates a room after confirmation", async () => {
    const calls = setupDashboard();
    await renderLoadedDashboard();

    await screen.findByRole("heading", { name: "Salle existante" });
    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));

    await waitFor(() => expect(calls.some((call) => call.method === "DELETE" && call.url.endsWith(roomId))).toBe(true));
    expect(window.confirm).toHaveBeenCalled();
  });
});
