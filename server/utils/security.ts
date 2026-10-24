import { SignJWT } from "jose";

type TokenType = "access" | "reset-password" | "refresh";

const refreshTokenDays = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS);
const accessTokenMins = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES);

if (isNaN(refreshTokenDays) || isNaN(accessTokenMins)) {
  throw new Error(
    "REFRESH_TOKEN_EXPIRE_DAYS || ACCESS_TOKEN_MINS is not defined or is not a valid number."
  );
}

async function createToken(
  subject: unknown,
  expiresInMs: number,
  tokenType: TokenType
): Promise<string> {
  if (!process.env.JWT_SECRET_KEY || !process.env.ALGORITHM) {
    throw new Error(
      "Security Token Based Keys are not defined in the environment variables!"
    );
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
  const expiresAt = new Date(Date.now() + expiresInMs);

  return new SignJWT({
    type: tokenType,
  })
    .setProtectedHeader({ alg: process.env.ALGORITHM })
    .setSubject(String(subject))
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export function createAccessToken(subject: unknown): Promise<string> {
  if (
    !process.env.ACCESS_TOKEN_EXPIRE_MINUTES ||
    !process.env.REFRESH_TOKEN_EXPIRE_DAYS
  ) {
    throw new Error(
      "Security Token Based Keys are not defined in the environment variables!"
    );
  }
  return createToken(subject, accessTokenMins * 60 * 1000, "access");
}

export function createResetToken(subject: unknown): Promise<string> {
  return createToken(subject, accessTokenMins * 60 * 1000, "reset-password");
}

export function createRefreshToken(subject: unknown): Promise<string> {
  return createToken(
    subject,
    refreshTokenDays * 24 * 60 * 60 * 1000,
    "refresh"
  );
}
