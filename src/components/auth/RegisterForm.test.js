import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterForm from "./RegisterForm";
import {
  PROFILE_OPTIONS,
  REGISTER_MESSAGES,
} from "@/features/auth/client/auth-client";

function apiResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function mockApi({ registerStatus = 201, payload = {}, networkError = false } = {}) {
  global.fetch = jest.fn(async (url) => {
    if (networkError) throw new TypeError("Failed to fetch");
    if (url === "/api/auth/register") {
      return apiResponse(
        { message: "Verification code sent to your email.", ...payload },
        registerStatus
      );
    }
    throw new Error(`URL inattendue : ${url}`);
  });
}

function fillForm({
  firstName = "Rayan",
  lastName = "Ben Yahia",
  profileType = "DEVELOPER",
  phone = "20123456",
  email = "rayan@calma.tn",
  password = "MotDePasseSecurise123",
} = {}) {
  if (firstName !== undefined) {
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: firstName } });
  }
  if (lastName !== undefined) {
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: lastName } });
  }
  if (profileType !== undefined) {
    fireEvent.change(screen.getByLabelText("Profil"), { target: { value: profileType } });
  }
  if (phone !== undefined) {
    fireEvent.change(screen.getByLabelText("Numéro de téléphone"), { target: { value: phone } });
  }
  if (email !== undefined) {
    fireEvent.change(screen.getByLabelText("Adresse email"), { target: { value: email } });
  }
  if (password !== undefined) {
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: password } });
  }
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: /s'inscrire/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RegisterForm — Inscription valide pour chaque profil", () => {
  test.each(PROFILE_OPTIONS)(
    "inscription réussie pour le profil %s (%s) avec affichage de la confirmation",
    async ({ value: profileValue, label: profileLabel }) => {
      mockApi({ registerStatus: 201 });
      render(<RegisterForm />);

      fillForm({
        firstName: "Sami",
        lastName: "Trabelsi",
        profileType: profileValue,
        phone: "+216 20 123 456",
        email: `sami.${profileValue.toLowerCase()}@calma.tn`,
        password: "SuperMotDePasse123",
      });

      submitForm();

      // Vérifie l'appel API avec le bon payload
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe("/api/auth/register");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        firstName: "Sami",
        lastName: "Trabelsi",
        email: `sami.${profileValue.toLowerCase()}@calma.tn`,
        phone: "+216 20 123 456",
        profileType: profileValue,
        password: "SuperMotDePasse123",
      });

      // Vérifie l'écran de confirmation
      await waitFor(() => {
        expect(screen.getByTestId("registration-confirmation")).toBeInTheDocument();
      });
      expect(screen.getByText("Inscription confirmée !")).toBeInTheDocument();
      expect(screen.getByText(profileLabel)).toBeInTheDocument();
      expect(
        screen.getByText(`sami.${profileValue.toLowerCase()}@calma.tn`)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /aller à la page de connexion/i })
      ).toHaveAttribute("href", "/login");
    }
  );
});

describe("RegisterForm — Validation des erreurs de champs", () => {
  test("profil manquant : affiche l'erreur de profil sans appel réseau", () => {
    mockApi();
    render(<RegisterForm />);

    fillForm({ profileType: "" });
    submitForm();

    expect(screen.getByText(REGISTER_MESSAGES.missingProfile)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("email invalide : affiche l'erreur d'email sans appel réseau", () => {
    mockApi();
    render(<RegisterForm />);

    fillForm({ email: "adresse-email-invalide" });
    submitForm();

    expect(screen.getByText(REGISTER_MESSAGES.invalidEmail)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("mot de passe faible : affiche l'erreur de mot de passe trop court (< 8 caractères)", () => {
    mockApi();
    render(<RegisterForm />);

    fillForm({ password: "court" });
    submitForm();

    expect(screen.getByText(REGISTER_MESSAGES.weakPassword)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("téléphone invalide : affiche l'erreur de numéro de téléphone sans appel réseau", () => {
    mockApi();
    render(<RegisterForm />);

    fillForm({ phone: "123" });
    submitForm();

    expect(screen.getByText(REGISTER_MESSAGES.invalidPhone)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("prénom et nom manquants : affiche les erreurs de champs respectives", () => {
    mockApi();
    render(<RegisterForm />);

    fillForm({ firstName: "", lastName: "" });
    submitForm();

    expect(screen.getByText(REGISTER_MESSAGES.missingFirstName)).toBeInTheDocument();
    expect(screen.getByText(REGISTER_MESSAGES.missingLastName)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("RegisterForm — Erreurs retournées par l'API", () => {
  test("email en double : affiche l'erreur email en double (409)", async () => {
    mockApi({
      registerStatus: 409,
      payload: { message: "This email is already registered." },
    });
    render(<RegisterForm />);

    fillForm({ email: "existant@calma.tn" });
    submitForm();

    await waitFor(() => {
      expect(screen.getAllByText(REGISTER_MESSAGES.duplicateEmail).length).toBeGreaterThan(0);
    });
  });

  test("erreur réseau : affiche un message d'erreur de connexion", async () => {
    mockApi({ networkError: true });
    render(<RegisterForm />);

    fillForm();
    submitForm();

    await waitFor(() => {
      expect(screen.getByText(REGISTER_MESSAGES.network)).toBeInTheDocument();
    });
  });
});

describe("RegisterForm — Interactions utilisateur", () => {
  test("afficher puis masquer le mot de passe", () => {
    render(<RegisterForm />);
    const passwordInput = screen.getByLabelText("Mot de passe");

    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByRole("button", { name: "Afficher le mot de passe" });
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("efface l'erreur de champ lorsque l'utilisateur modifie sa saisie", () => {
    mockApi();
    render(<RegisterForm />);

    fillForm({ email: "mauvais" });
    submitForm();
    expect(screen.getByText(REGISTER_MESSAGES.invalidEmail)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Adresse email"), {
      target: { value: "bon@calma.tn" },
    });
    expect(screen.queryByText(REGISTER_MESSAGES.invalidEmail)).not.toBeInTheDocument();
  });
});
