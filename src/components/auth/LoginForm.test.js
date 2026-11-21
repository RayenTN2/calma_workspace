import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginForm, { LOGIN_NOTICES } from "./LoginForm";
import { LOGIN_MESSAGES } from "@/features/auth/client/auth-client";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

function apiResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function mockApi({ loginStatus = 200, role = "USER", networkError = false } = {}) {
  global.fetch = jest.fn(async (url) => {
    if (networkError) throw new TypeError("Failed to fetch");
    if (url === "/api/auth/login") return apiResponse({ message: "x" }, loginStatus);
    if (url === "/api/auth/me") return apiResponse({ user: { id: "u-1", role } });
    throw new Error(`URL inattendue : ${url}`);
  });
}

function fillAndSubmit(email = "client@calma.tn", password = "MotDePasse123") {
  fireEvent.change(screen.getByLabelText("Adresse email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LoginForm — connexion réussie", () => {
  test("envoie les identifiants et redirige un client vers la recherche de salles", async () => {
    mockApi({ role: "USER" });
    render(<LoginForm />);

    fillAndSubmit("  Client@Calma.tn ");

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/rooms"));
    expect(mockRefresh).toHaveBeenCalled();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ email: "Client@Calma.tn", password: "MotDePasse123" });
  });

  test("redirige le gérant vers son tableau de bord", async () => {
    mockApi({ role: "GERANT" });
    render(<LoginForm />);

    fillAndSubmit();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/gerant/salles"));
  });

  test("revient sur la page protégée demandée avant la connexion", async () => {
    mockApi({ role: "GERANT" });
    render(<LoginForm next="/gerant/salles?vue=liste" />);

    fillAndSubmit();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/gerant/salles?vue=liste"));
  });
});

describe("LoginForm — connexion échouée", () => {
  test("identifiants incorrects : message générique qui ne révèle pas le champ faux", async () => {
    mockApi({ loginStatus: 401 });
    render(<LoginForm />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_MESSAGES.invalidCredentials);
    expect(screen.getByLabelText("Mot de passe")).toHaveValue("");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("email non vérifié", async () => {
    mockApi({ loginStatus: 403 });
    render(<LoginForm />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_MESSAGES.emailNotVerified);
  });

  test("erreur serveur", async () => {
    mockApi({ loginStatus: 500 });
    render(<LoginForm />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_MESSAGES.server);
  });

  test("serveur injoignable", async () => {
    mockApi({ networkError: true });
    render(<LoginForm />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_MESSAGES.network);
  });

  test("champs vides : aucun appel au serveur", () => {
    mockApi();
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(LOGIN_MESSAGES.missingFields);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("email mal formé : aucun appel au serveur", () => {
    mockApi();
    render(<LoginForm />);

    fillAndSubmit("pas-un-email");

    expect(screen.getByRole("alert")).toHaveTextContent(LOGIN_MESSAGES.invalidEmail);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("LoginForm — messages d'arrivée", () => {
  test.each(Object.entries(LOGIN_NOTICES))("motif %s", (reason, message) => {
    render(<LoginForm reason={reason} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  test("le mot de passe peut être affiché puis masqué", () => {
    render(<LoginForm />);
    const input = screen.getByLabelText("Mot de passe");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
