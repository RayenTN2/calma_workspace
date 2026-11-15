
const allowedProfiles = [
  "STUDENT",
  "PUPIL",
  "DEVELOPER",
  "ENTREPRENEUR",
  "PERSONNEL",
];

export function validateRegistration(data) {
  const {
    firstName,
    lastName,
    email,
    password,
    profileType,
  } = data ?? {};

  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof profileType !== "string"
  ) {
    return "All fields are required.";
  }

  if (
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !password
  ) {
    return "All fields are required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Invalid email address.";
  }

  if (password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (password.length > 72) {
    return "Password is too long.";
  }

  if (!allowedProfiles.includes(profileType)) {
    return "Invalid profile type.";
  }

  return null;
}

export function validateVerification(data) {
  const { email, code } = data ?? {};

  if (
    typeof email !== "string" ||
    typeof code !== "string"
  ) {
    return "Email and verification code are required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Invalid email address.";
  }

  if (!/^\d{6}$/.test(code)) {
    return "The verification code must contain exactly 6 digits.";
  }

  return null;
}
