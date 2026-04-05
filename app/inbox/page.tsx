import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { InboxClient } from "@/components/inbox-client";

export const metadata = {
  title: "Inbox — Secure Dropbox",
  robots: { index: false, follow: false },
};

async function getMessages() {
  if (!process.env.DATABASE_URL) {
    const { devList } = await import("@/lib/dev-store");
    return devList();
  }
  try {
    const { db } = await import("@/lib/db/client");
    const { messages } = await import("@/lib/db/schema");
    const { desc } = await import("drizzle-orm");
    return await db
      .select()
      .from(messages)
      .orderBy(desc(messages.receivedAt))
      .limit(200);
  } catch {
    return [];
  }
}

const GRID_BG = {
  backgroundImage: `
    linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)
  `,
  backgroundSize: "40px 40px",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const token = cookies().get("session")?.value ?? "";
  const authed = token ? verifyToken(token) : false;
  const hasError = searchParams.error === "1";

  // ── Not authenticated: show login ─────────────────────────────────────────
  if (!authed) {
    return (
      <main className="relative min-h-screen bg-black flex items-center justify-center px-4" style={GRID_BG}>
        <a href="/" className="absolute top-4 left-5 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">
          ← back
        </a>

        <div className="w-full max-w-xs">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-zinc-100">Private Inbox</h2>
            <p className="mt-1 text-sm text-zinc-500">Enter your password to continue.</p>
          </div>

          <form action="/api/auth/login" method="POST" className="space-y-3">
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            {hasError && (
              <p className="text-sm font-medium text-red-400">Incorrect password. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 transition-colors"
            >
              Unlock inbox
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Authenticated: load messages server-side ──────────────────────────────
  const msgs = await getMessages();

  return (
    <main className="relative min-h-screen bg-black px-4 py-12" style={GRID_BG}>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-5">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Inbox</h1>
            <p className="mt-0.5 text-xs text-zinc-600">
              {msgs.length} message{msgs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="rounded border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Public page
            </a>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        {/* Client component receives messages as props — no fetch needed */}
        <InboxClient initialMessages={msgs} />
      </div>
    </main>
  );
}
