
import { SignJWT, jwtVerify } from "jose";

const JWT_ISSUER = "calma-workspace";
const JWT_AUDIENCE = "calma-workspace-api";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short.");
  }

  return new TextEncoder().encode(secret);
}

// Generate an access token
export async function generateAccessToken(userId) {
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime("15m")
    .sign(getJwtSecret());
}

// Verify an access token
export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return payload;
}
