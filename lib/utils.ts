import type { NextRequest } from "next/server";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract the client IP from a request.
 * Checks Vercel/Cloudflare forwarded headers first, then falls back to
 * the standard X-Forwarded-For header.
 *
 * Do not persist this value in the database beyond what rate limiting requires.
 */
export function getClientIp(request: NextRequest): string {
  // Vercel sets x-real-ip; Cloudflare sets cf-connecting-ip
  const realIp =
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first entry
    return forwarded.split(",")[0].trim();
  }

  return "unknown";
}

/**
 * Create a JSON error response.
 */
export function jsonError(
  status: number,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a JSON success response.
 */
export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
