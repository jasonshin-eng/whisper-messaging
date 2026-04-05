"use client";

import { useState, type ReactNode } from "react";

interface PasswordGateProps {
  children: ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setUnlocked(true);
      } else {
        setError("Incorrect password. Try again.");
        setChecking(false);
      }
    } catch {
      setError("Network error. Try again.");
      setChecking(false);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-100">Private Inbox</h2>
          <p className="mt-1 text-sm text-zinc-500">Enter your inbox password to continue.</p>
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
            <p className="text-sm text-red-400">{error}</p>
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
    </div>
  );
}
