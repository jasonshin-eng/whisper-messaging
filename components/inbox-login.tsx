"use client";

import { useState } from "react";

export function InboxLogin() {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Full page reload so the server sees the session cookie
        window.location.href = "/inbox";
      } else {
        setError("Incorrect password.");
        setChecking(false);
      }
    } catch {
      setError("Network error. Try again.");
      setChecking(false);
    }
  }

  return (
    <div className="w-full max-w-xs space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-zinc-100">Private Inbox</h2>
        <p className="mt-1 text-sm text-zinc-500">Enter your password to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />

        {error && (
          <p className="text-sm font-medium text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={checking}
          className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-50 transition-colors"
        >
          {checking ? "Verifying..." : "Unlock inbox"}
        </button>
      </form>
    </div>
  );
}
