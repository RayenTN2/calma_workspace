
import {
  randomInt,
  createHash,
  timingSafeEqual,
} from "crypto";

export function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(code) {
  const secret = process.env.OTP_SECRET;

  if (!secret) {
    throw new Error("OTP_SECRET is not configured.");
  }

  return createHash("sha256")
    .update(`${code}${secret}`)
    .digest("hex");
}

export function compareOtp(code, storedHash) {
  const submittedHash = hashOtp(code);

  const submittedBuffer = Buffer.from(submittedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  return (
    submittedBuffer.length === storedBuffer.length &&
    timingSafeEqual(submittedBuffer, storedBuffer)
  );
}
