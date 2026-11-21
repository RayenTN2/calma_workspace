import { act, fireEvent, render, screen } from "@testing-library/react";
import SessionGuard from "./SessionGuard";
import { ACTIVITY_STORAGE_KEY, LOGOUT_STORAGE_KEY } from "@/features/auth/config";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => "/gerant/salles",
}));

const SECOND = 1000;
const MINUTE = 60 * SECOND;

// Délais courts pour les tests : 5 min d'inactivité, avertissement 1 min avant.
// Vérification toutes les 10 s (au lieu de 1 s en production) : même logique,
// mais beaucoup moins de ticks à simuler, sinon les tests dépassent 5 s.
const props = {
  timeoutMs: 5 * MINUTE,
  warningMs: 1 * MINUTE,
  refreshIntervalMs: 2 * MINUTE,
  checkIntervalMs: 10 * SECOND,
};

function mockApi({ refreshStatus = 200 } = {}) {
  global.fetch = jest.fn(async (url) => {
    if (url === "/api/auth/refresh") return { ok: refreshStatus === 200, status: refreshStatus };
    if (url === "/api/auth/logout") return { ok: true, status: 200 };
    throw new Error(`URL inattendue : ${url}`);
  });
}

function calls(url) {
  return global.fetch.mock.calls.filter(([called]) => called === url);
}

async function advance(ms) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  window.localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("SessionGuard — déconnexion automatique après inactivité", () => {
  test("déconnecte après le délai d'inactivité et indique le motif", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    await advance(5 * MINUTE + 10 * SECOND);

    expect(calls("/api/auth/logout")).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fgerant%2Fsalles&reason=idle");
  });

  test("avertit une minute avant la déconnexion", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    await advance(4 * MINUTE + 30 * SECOND);

    expect(screen.getByRole("alertdialog")).toHaveTextContent(/déconnecté dans 30 secondes/);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("« Rester connecté » annule la déconnexion", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    await advance(4 * MINUTE + 30 * SECOND);
    fireEvent.click(screen.getByRole("button", { name: "Rester connecté" }));
    await advance(2 * MINUTE);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(calls("/api/auth/logout")).toHaveLength(0);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("une activité régulière garde la session ouverte et renouvelle le jeton", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    for (let minute = 0; minute < 8; minute += 1) {
      await advance(MINUTE);
      fireEvent.keyDown(window, { key: "a" });
    }

    expect(mockReplace).not.toHaveBeenCalled();
    expect(calls("/api/auth/logout")).toHaveLength(0);
    // Renouvellement immédiat au chargement, puis toutes les 2 minutes d'activité.
    expect(calls("/api/auth/refresh").length).toBeGreaterThanOrEqual(4);
  });

  test("ne renouvelle pas le jeton d'un utilisateur inactif", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    await advance(4 * MINUTE);

    // Seul le renouvellement initial a lieu.
    expect(calls("/api/auth/refresh")).toHaveLength(1);
  });

  test("session expirée côté serveur : retour à la connexion", async () => {
    mockApi({ refreshStatus: 401 });
    render(<SessionGuard {...props} />);

    await advance(11 * SECOND);

    expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fgerant%2Fsalles&reason=expired");
  });

  test("l'activité dans un autre onglet garde cet onglet connecté", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    await advance(4 * MINUTE);
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    await advance(2 * MINUTE);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("une déconnexion dans un autre onglet déconnecte cet onglet", async () => {
    mockApi();
    render(<SessionGuard {...props} />);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: LOGOUT_STORAGE_KEY, newValue: String(Date.now()) }),
      );
    });

    expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fgerant%2Fsalles&reason=logout");
  });

  test("n'affiche rien tant que l'utilisateur est actif", () => {
    mockApi();
    const { container } = render(<SessionGuard {...props} />);
    expect(container).toBeEmptyDOMElement();
  });
});
