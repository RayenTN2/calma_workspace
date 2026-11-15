
import bcrypt from "bcryptjs";

import {
  findUserByEmail,
  createUserWithVerification,
  updatePendingUser,
} from "@/features/auth/repositories/auth.repository";

import { validateRegistration } from "@/features/auth/validators/auth.validator";

import {
  generateOtp,
  hashOtp,
} from "@/features/auth/utils/otp";

import { sendVerificationEmail } from "@/infrastructure/email/mailer";

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function registerUser(data) {
  // 1. Validate the information.
  const validationError = validateRegistration(data);

  if (validationError) {
    throw createError(validationError, 400);
  }

  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const profileType = data.profileType;

  // 2. Check whether the email already exists.
  const existingUser = await findUserByEmail(email);

  if (existingUser?.emailVerified) {
    throw createError(
      "This email is already registered.",
      409
    );
  }

  // 3. Hash the password.
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Generate the verification code.
  const code = generateOtp();
  const codeHash = hashOtp(code);

  // 5. Set expiration to 10 minutes.
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 6. Create a new user or update an unverified user.
  if (existingUser) {
    await updatePendingUser({
      userId: existingUser.id,
      firstName,
      lastName,
      passwordHash,
      profileType,
      codeHash,
      expiresAt,
    });
  } else {
    await createUserWithVerification({
      firstName,
      lastName,
      email,
      passwordHash,
      profileType,
      codeHash,
      expiresAt,
    });
  }

  // 7. Send the code to the user's email.
  await sendVerificationEmail(email, code);

  return {
    message: "Verification code sent to your email.",
    email,
  };
}
