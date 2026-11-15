
import {
  findUserWithVerification,
  activateUser,
} from "@/features/auth/repositories/auth.repository";

import {
  compareOtp,
} from "@/features/auth/utils/otp";

import {
  validateVerification,
} from "@/features/auth/validators/auth.validator";

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function verifyUserEmail(data) {
  // 1. Validate input.
  const validationError = validateVerification(data);

  if (validationError) {
    throw createError(validationError, 400);
  }

  const email = data.email.trim().toLowerCase();
  const code = data.code;

  // 2. Find the user and their verification code.
  const user = await findUserWithVerification(email);

  if (!user) {
    throw createError("Account not found.", 404);
  }

  if (user.emailVerified) {
    throw createError("Email is already verified.", 409);
  }

  const verification = user.verificationCode;

  if (!verification) {
    throw createError(
      "No active verification code. Please register again.",
      400
    );
  }

  // 3. Check expiration.
  if (verification.expiresAt < new Date()) {
    throw createError(
      "Verification code expired. Please register again.",
      400
    );
  }

  // 4. Compare submitted code with the stored hash.
  const isCorrect = compareOtp(
    code,
    verification.codeHash
  );

  if (!isCorrect) {
    throw createError("Incorrect verification code.", 400);
  }

  // 5. Activate the user and delete the verification code.
  const activated = await activateUser(
    user.id,
    verification.id
  );

  if (!activated) {
    throw createError(
      "Email is already verified.",
      409
    );
  }

  return {
    message: "Email verified successfully. Your account is now active.",
  };
}
