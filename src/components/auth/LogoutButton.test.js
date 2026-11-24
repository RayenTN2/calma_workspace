import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LogoutButton, { LOGOUT_FAILED_MESSAGE } from "./LogoutButton";
import { LOGOUT_STORAGE_KEY } from "@/features/auth/config";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

describe("LogoutButton — déconnexion", () => {
  test("appelle l'API de déconnexion puis renvoie vers la connexion", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200 }));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: /déconnexion/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login?reason=logout"));
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(mockRefresh).toHaveBeenCalled();
    // Les autres onglets sont prévenus.
    expect(window.localStorage.getItem(LOGOUT_STORAGE_KEY)).not.toBeNull();
  });

  test("reste sur la page et affiche une erreur si le serveur échoue", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 }));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: /déconnexion/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGOUT_FAILED_MESSAGE);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("affiche une erreur si le serveur est injoignable", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: /déconnexion/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGOUT_FAILED_MESSAGE);
  });
});
