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
