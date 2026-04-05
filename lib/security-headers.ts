/**
 * Security headers applied by middleware.ts on every response.
 * The CSP uses a per-request nonce so that Next.js hydration scripts are
 * trusted without requiring unsafe-inline.
 */

export function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    // strict-dynamic: scripts loaded by a nonced script are also trusted.
    // This covers Next.js's own chunk loading.
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    // Tailwind CSS requires unsafe-inline for styles (no build-time hashing).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://framerusercontent.com",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

export interface SecurityHeaders {
  "Content-Security-Policy": string;
  "X-Frame-Options": string;
  "X-Content-Type-Options": string;
  "Referrer-Policy": string;
  "Permissions-Policy": string;
  "X-DNS-Prefetch-Control": string;
}

export function getSecurityHeaders(nonce: string): SecurityHeaders {
  return {
    "Content-Security-Policy": buildCsp(nonce),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-DNS-Prefetch-Control": "off",
  };
}
