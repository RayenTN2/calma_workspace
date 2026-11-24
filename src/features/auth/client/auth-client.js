// Appels HTTP d'authentification côté navigateur (US-02, S1-T08).
import { LOGOUT_STORAGE_KEY } from "../config";

export const LOGIN_MESSAGES = Object.freeze({
  missingFields: "Veuillez saisir votre email et votre mot de passe.",
  invalidEmail: "Adresse email invalide.",
  // Volontairement identique pour un email inconnu ou un mauvais mot de passe :
  // le message ne révèle pas quel champ est faux.
  invalidCredentials: "Email ou mot de passe incorrect.",
  emailNotVerified:
    "Votre adresse email n'est pas encore vérifiée. Consultez le code reçu par email avant de vous connecter.",
  network: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
  server: "Une erreur est survenue. Veuillez réessayer dans un instant.",
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Contrôle côté client, avant tout appel réseau. Renvoie un message ou null. */
export function validateLoginInput({ email, password }) {
  if (!email?.trim() || !password) return LOGIN_MESSAGES.missingFields;
  if (!EMAIL_PATTERN.test(email.trim())) return LOGIN_MESSAGES.invalidEmail;
  return null;
}

/** Message affiché pour un statut HTTP de /api/auth/login. */
export function loginErrorMessage(status) {
  if (status === 400) return LOGIN_MESSAGES.missingFields;
  if (status === 401) return LOGIN_MESSAGES.invalidCredentials;
  if (status === 403) return LOGIN_MESSAGES.emailNotVerified;
  return LOGIN_MESSAGES.server;
}

/**
 * Connecte l'utilisateur puis récupère son profil (rôle compris).
 * @returns {Promise<{ ok: true, user: object } | { ok: false, message: string }>}
 */
export async function login({ email, password }) {
  let response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    return { ok: false, message: LOGIN_MESSAGES.network };
  }

  if (!response.ok) {
    return { ok: false, message: loginErrorMessage(response.status) };
  }

  // La réponse de connexion ne contient pas le rôle : /api/auth/me le fournit.
  try {
    const meResponse = await fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (meResponse.ok) {
      const { user } = await meResponse.json();
      return { ok: true, user };
    }
  } catch {
    // Connexion réussie malgré tout : on redirigera vers la page par défaut.
  }
  return { ok: true, user: null };
}

/**
 * Déconnecte l'utilisateur côté serveur (révocation du jeton de rafraîchissement
 * et suppression des cookies) et prévient les autres onglets.
 * @returns {Promise<boolean>} true si le serveur a confirmé la déconnexion
 */
export async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) return false;
  } catch {
    return false;
  }

  try {
    window.localStorage.setItem(LOGOUT_STORAGE_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible (navigation privée) : seul l'onglet courant est concerné.
  }
  return true;
}

/**
 * Renouvelle le jeton d'accès.
 * @returns {Promise<"ok" | "expired" | "error">}
 */
export async function refreshSession() {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    if (response.ok) return "ok";
    return response.status === 401 ? "expired" : "error";
  } catch {
    return "error";
  }
}

export const REGISTER_MESSAGES = Object.freeze({
  missingFirstName: "Veuillez saisir votre prénom.",
  missingLastName: "Veuillez saisir votre nom.",
  missingEmail: "Veuillez saisir votre adresse email.",
  invalidEmail: "Adresse email invalide.",
  missingPhone: "Veuillez saisir votre numéro de téléphone.",
  invalidPhone: "Numéro de téléphone invalide.",
  missingProfile: "Veuillez sélectionner un profil.",
  invalidProfile: "Profil sélectionné invalide.",
  missingPassword: "Veuillez saisir un mot de passe.",
  weakPassword: "Le mot de passe doit contenir au moins 8 caractères.",
  passwordTooLong: "Le mot de passe ne doit pas dépasser 72 caractères.",
  duplicateEmail: "Cette adresse email est déjà enregistrée.",
  network: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
  server: "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
});

export const PROFILE_OPTIONS = Object.freeze([
  { value: "STUDENT", label: "Étudiant" },
  { value: "PUPIL", label: "Élève" },
  { value: "DEVELOPER", label: "Développeur" },
  { value: "ENTREPRENEUR", label: "Entrepreneur" },
  { value: "PERSONNEL", label: "Personnel" },
]);

/**
 * Validation côté client du formulaire d'inscription.
 * Renvoie un objet de messages d'erreur par champ ({ [champ]: string }) ou null.
 */
export function validateRegisterInput(data) {
  const { firstName, lastName, email, phone, profileType, password } = data ?? {};
  const errors = {};

  if (!firstName?.trim()) {
    errors.firstName = REGISTER_MESSAGES.missingFirstName;
  }

  if (!lastName?.trim()) {
    errors.lastName = REGISTER_MESSAGES.missingLastName;
  }

  if (!email?.trim()) {
    errors.email = REGISTER_MESSAGES.missingEmail;
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = REGISTER_MESSAGES.invalidEmail;
  }

  if (!phone?.trim()) {
    errors.phone = REGISTER_MESSAGES.missingPhone;
  } else {
    const cleaned = phone.replace(/[\s.-]/g, "");
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      errors.phone = REGISTER_MESSAGES.invalidPhone;
    }
  }

  if (!profileType?.trim()) {
    errors.profileType = REGISTER_MESSAGES.missingProfile;
  } else if (!PROFILE_OPTIONS.some((opt) => opt.value === profileType)) {
    errors.profileType = REGISTER_MESSAGES.invalidProfile;
  }

  if (!password) {
    errors.password = REGISTER_MESSAGES.missingPassword;
  } else if (password.length < 8) {
    errors.password = REGISTER_MESSAGES.weakPassword;
  } else if (password.length > 72) {
    errors.password = REGISTER_MESSAGES.passwordTooLong;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Envoie la requête d'inscription au backend.
 * @returns {Promise<{ ok: true, data: object } | { ok: false, message: string, fieldErrors?: Record<string, string> }>}
 */
export async function registerAccount(formData) {
  let response;
  try {
    response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim(),
        email: formData.email?.trim(),
        password: formData.password,
        profileType: formData.profileType,
        phone: formData.phone?.trim(),
      }),
    });
  } catch {
    return { ok: false, message: REGISTER_MESSAGES.network };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response fallback
  }

  if (!response.ok) {
    if (response.status === 409) {
      return {
        ok: false,
        message: REGISTER_MESSAGES.duplicateEmail,
        fieldErrors: { email: REGISTER_MESSAGES.duplicateEmail },
      };
    }
    return {
      ok: false,
      message: payload?.message || REGISTER_MESSAGES.server,
    };
  }

  return { ok: true, data: payload };
}

