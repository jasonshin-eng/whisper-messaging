import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 900; // 15 minutes

function getSecret(): string {
  const s = process.env.INBOX_PASSWORD_HASH;
  if (!s) throw new Error("INBOX_PASSWORD_HASH is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function buildToken(): string {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = String(expires);
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const dotIdx = decoded.lastIndexOf(".");
    if (dotIdx === -1) return false;
    const payload = decoded.slice(0, dotIdx);
    const sig = decoded.slice(dotIdx + 1);
    const expected = sign(payload);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const expires = parseInt(payload, 10);
    return Date.now() < expires;
  } catch {
    return false;
  }
}

export async function verifyInboxPassword(password: string): Promise<boolean> {
  const hash = process.env.INBOX_PASSWORD_HASH;
  if (!hash) throw new Error("INBOX_PASSWORD_HASH is not set");
  return bcrypt.compare(password, hash);
}

export function createSessionCookie(): string {
  const token = buildToken();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/`;
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function destroySession(_request: NextRequest): Promise<void> {
  // Stateless — cookie is cleared by the logout route
}
