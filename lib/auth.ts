import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "encuesta_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

type SessionPayload = { username: string; name: string; role: string; exp: number };

function secret() {
  return process.env.AUTH_SECRET || "local-only-change-this-secret";
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(user: Omit<SessionPayload, "exp">) {
  const payload = encode(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const session = JSON.parse(decode(payload)) as SessionPayload;
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
