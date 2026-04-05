"use client";

import { useState, useEffect, useCallback } from "react";
import { decryptMessage } from "@/lib/crypto/decrypt";
import { DecryptionError } from "@/lib/crypto/types";
import type { PlaintextPayload } from "@/lib/crypto/types";

interface MessageRecord {
  id: string;
  ciphertext: string;
  receivedAt: string;
  status: "new" | "read" | "archived";
}

interface DecryptedMessage extends MessageRecord {
  payload: PlaintextPayload;
}

const KNOWN_CODEWORDS = (process.env.NEXT_PUBLIC_VALID_CODEWORDS ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

export function InboxList() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Decryption
  const [privateKey, setPrivateKey] = useState("");
  const [decrypted, setDecrypted] = useState<Map<string, PlaintextPayload>>(new Map());
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  // Expanded message
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/messages", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        setLoadError("Failed to load messages.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      setLoadError("Could not load messages.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  function handleDecryptAll(e: React.FormEvent) {
    e.preventDefault();
    if (!privateKey.trim()) return;
    setDecrypting(true);
    setDecryptError(null);

    const results = new Map<string, PlaintextPayload>();
    let failures = 0;

    for (const msg of messages) {
      try {
        results.set(msg.id, decryptMessage(msg.ciphertext, privateKey.trim()));
      } catch (err) {
        if (err instanceof DecryptionError) failures++;
      }
    }

    setDecrypted(results);
    setDecrypting(false);

    if (results.size === 0 && messages.length > 0) {
      setDecryptError("Wrong private key — could not decrypt any messages.");
    } else if (failures > 0) {
      setDecryptError(`${failures} message${failures > 1 ? "s" : ""} could not be decrypted.`);
    }
  }

  async function updateStatus(id: string, status: MessageRecord["status"]) {
    try {
      await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
    } catch { /* silent */ }
  }

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  function buildGroups(): Array<{ label: string; messages: DecryptedMessage[] }> {
    const groups = new Map<string, DecryptedMessage[]>();
    for (const cw of KNOWN_CODEWORDS) groups.set(cw, []);

    for (const msg of messages) {
      const payload = decrypted.get(msg.id);
      if (!payload) continue;
      const key = payload.codeword.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ ...msg, payload });
    }

    return Array.from(groups.entries())
      .filter(([, msgs]) => msgs.length > 0)
      .map(([label, msgs]) => ({
        label,
        messages: msgs.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
      }));
  }

  const isDecrypted = decrypted.size > 0;
  const groups = buildGroups();
  const newCount = messages.filter((m) => m.status === "new").length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-zinc-600">Loading messages...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">{loadError}</p>
        <button onClick={loadMessages} className="mt-3 text-xs text-zinc-600 underline hover:text-zinc-400">
          Retry
        </button>
      </div>
    );
  }

  // ── Main inbox ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            Inbox
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-black">
                {newCount} new
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMessages}
            className="rounded border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="rounded border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Decrypt panel */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <p className="text-xs text-zinc-500">
          Paste your private key to decrypt and group messages by codeword.
        </p>
        <form onSubmit={handleDecryptAll} className="flex gap-2">
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Paste base64 private key..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={!privateKey.trim() || decrypting}
            className="rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {decrypting ? "Decrypting..." : isDecrypted ? "Re-decrypt" : "Decrypt all"}
          </button>
          {isDecrypted && (
            <button
              type="button"
              onClick={() => { setDecrypted(new Map()); setPrivateKey(""); setDecryptError(null); }}
              className="rounded border border-zinc-800 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
        {decryptError && <p className="text-xs text-red-400">{decryptError}</p>}
        {isDecrypted && !decryptError && (
          <p className="text-xs text-zinc-600">
            Decrypted {decrypted.size} of {messages.length} — grouped by codeword below.
          </p>
        )}
      </div>

      {/* No messages at all */}
      {messages.length === 0 && (
        <div className="rounded-lg border border-zinc-800 py-16 text-center">
          <p className="text-sm text-zinc-600">No messages yet.</p>
        </div>
      )}

      {/* Grouped view after decryption */}
      {isDecrypted && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map(({ label, messages: gMsgs }) => (
            <div key={label} className="rounded-lg border border-zinc-800 overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(label)}
                className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-zinc-900/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-medium text-zinc-200">{label}</span>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
                    {gMsgs.length}
                  </span>
                  {gMsgs.some((m) => m.status === "new") && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-black">new</span>
                  )}
                </div>
                <svg
                  className={`h-4 w-4 text-zinc-600 transition-transform ${collapsedGroups.has(label) ? "-rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Messages in group */}
              {!collapsedGroups.has(label) && (
                <div className="divide-y divide-zinc-800/60 border-t border-zinc-800">
                  {gMsgs.map((msg) => (
                    <div key={msg.id}>
                      {/* Message row */}
                      <div
                        className="flex cursor-pointer items-start gap-4 px-5 py-4 hover:bg-zinc-900/40 transition-colors"
                        onClick={() => {
                          const opening = expandedId !== msg.id;
                          setExpandedId(opening ? msg.id : null);
                          if (opening && msg.status === "new") updateStatus(msg.id, "read");
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug line-clamp-2 ${msg.status === "new" ? "text-zinc-100" : "text-zinc-400"}`}>
                            {msg.payload.message}
                          </p>
                          <p className="mt-1.5 text-xs text-zinc-600">
                            {new Date(msg.receivedAt).toLocaleString()}
                            {msg.status === "new" && <span className="ml-2 text-zinc-400">· new</span>}
                            {msg.status === "archived" && <span className="ml-2 text-zinc-700">· archived</span>}
                          </p>
                        </div>
                        <svg
                          className={`mt-1 h-3.5 w-3.5 shrink-0 text-zinc-700 transition-transform ${expandedId === msg.id ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Expanded */}
                      {expandedId === msg.id && (
                        <div className="border-t border-zinc-800/60 bg-zinc-950 px-5 py-4 space-y-4">
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                            {msg.payload.message}
                          </p>
                          <p className="text-xs text-zinc-600">
                            Sent: {msg.payload.clientTimestamp ? new Date(msg.payload.clientTimestamp).toLocaleString() : "—"}
                          </p>
                          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                            <span className="text-xs text-zinc-700">Mark as:</span>
                            {(["new", "read", "archived"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(msg.id, s)}
                                disabled={msg.status === s}
                                className="rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed capitalize transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Raw list before decryption */}
      {!isDecrypted && messages.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden divide-y divide-zinc-800/60">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-xs font-mono text-zinc-600 truncate max-w-xs">{msg.id}</p>
                <p className="mt-0.5 text-xs text-zinc-700">{new Date(msg.receivedAt).toLocaleString()}</p>
              </div>
              {msg.status === "new" && (
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">new</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
