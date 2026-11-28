import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import UserReservations from "./UserReservations";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn(), push: jest.fn() }),
}));

const mockUser = {
  firstName: "Rayan",
  lastName: "Ben",
  role: "USER",
};

const mockReservations = [
  {
    id: "res-1",
    roomId: "room-1",
    purpose: "MEETING",
    status: "PENDING_PAYMENT",
    startAt: "2026-11-26T13:00:00.000Z",
    endAt: "2026-11-26T15:00:00.000Z",
    participants: 4,
    room: {
      id: "room-1",
      name: "Salle de Réunion Atlas",
      roomType: "MEETING",
    },
  },
];

describe("UserReservations component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders empty state when there are no reservations", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reservations: [] }),
    });

    render(<UserReservations user={mockUser} />);

    expect(await screen.findByText(/Vous n’avez aucune réservation pour le moment/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Rechercher une salle/i }).length).toBeGreaterThanOrEqual(1);
  });

  test("renders reservations list when reservations exist", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reservations: mockReservations }),
    });

    render(<UserReservations user={mockUser} />);

    expect(await screen.findByText("Salle de Réunion Atlas")).toBeInTheDocument();
    expect(screen.getByText("Réunion")).toBeInTheDocument();
    expect(screen.getByText(/4 pers/i)).toBeInTheDocument();
    expect(screen.getByText("En attente de paiement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  test("cancels a reservation on button click", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reservations: mockReservations }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Reservation cancelled successfully." }),
      });

    render(<UserReservations user={mockUser} />);

    const cancelButton = await screen.findByRole("button", { name: "Annuler" });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/reservations/res-1", {
        method: "DELETE",
      });
    });

    expect(
      await screen.findByText("Réservation annulée avec succès. Le créneau a été libéré.")
    ).toBeInTheDocument();
  });
});
