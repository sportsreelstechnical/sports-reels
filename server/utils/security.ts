import { SignJWT } from "jose";

type TokenType = "access" | "reset-password" | "refresh";
console.log(
  process.env.JWT_SECRET_KEY,
  process.env.JWT_SECRET_KEY,
  process.env.ACCESS_TOKEN_EXPIRE_MINUTES
);

async function createToken(
  subject: unknown,
  expiresInMs: number,
  tokenType: TokenType
): Promise<string> {
  if (
    !process.env.JWT_SECRET_KEY ||
    !process.env.ALGORITHM ||
    !process.env.ACCESS_TOKEN_EXPIRE_MINUTES ||
    !process.env.REFRESH_TOKEN_EXPIRE_DAYS
  ) {
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
  return createToken(
    subject,
    process.env.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000,
    "access"
  );
}

export function createResetToken(subject: unknown): Promise<string> {
  return createToken(
    subject,
    process.env.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000,
    "reset-password"
  );
}

export function createRefreshToken(subject: unknown): Promise<string> {
  return createToken(
    subject,
    process.env.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
    "refresh"
  );
}
