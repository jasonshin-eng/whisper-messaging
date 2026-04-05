// Shared in-memory session store for local development.
// In production, sessions are stored in Upstash Redis.
// This module is a singleton within the Next.js server process.

export const memSessions = new Map<string, number>(); // token → expiry ms
