import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 900; // 15 minutes — short window, must re-login if idle

// File that stores the current valid session nonce.
// When a new login happens, a new nonce is written here,
// instantly invalidating all previously issued tokens.
const NONCE_PATH = path.join(process.cwd(), ".session-nonce");

function getNonce(): string {
  try {
    if (fs.existsSync(NONCE_PATH)) return fs.readFileSync(NONCE_PATH, "utf8").trim();
  } catch { /* fall through */ }
  return rotateNonce();
}

function rotateNonce(): string {
  const nonce = randomBytes(16).toString("hex");
  try { fs.writeFileSync(NONCE_PATH, nonce, "utf8"); } catch { /* ignore */ }
  return nonce;
}

function getSecret(): string {
  const s = process.env.INBOX_PASSWORD_HASH;
  if (!s) throw new Error("INBOX_PASSWORD_HASH is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function buildToken(nonce: string): string {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${expires}.${nonce}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const pipeIdx = decoded.lastIndexOf("|");
    if (pipeIdx === -1) return false;
    const payload = decoded.slice(0, pipeIdx);
    const sig = decoded.slice(pipeIdx + 1);
    const expected = sign(payload);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const [expiresStr, nonce] = payload.split(".");
    if (Date.now() >= parseInt(expiresStr, 10)) return false;
    // Check nonce matches current — rejects all tokens issued before last login
    return nonce === getNonce();
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
  // Rotate nonce on every login — invalidates all previous sessions
  const nonce = rotateNonce();
  const token = buildToken(nonce);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  // No Max-Age → dies when browser closes; also expires server-side after 15 min
  return `${SESSION_COOKIE}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/`;
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function destroySession(_request: NextRequest): Promise<void> {
  rotateNonce(); // Invalidate all existing tokens on logout too
}
