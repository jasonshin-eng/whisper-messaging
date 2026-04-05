"use client";

import { useState, useEffect, useRef } from "react";
import { decryptMessage } from "@/lib/crypto/decrypt";
import type { PlaintextPayload } from "@/lib/crypto/types";

interface MessageRecord {
  id: string;
  ciphertext: string;
  receivedAt: string | Date;
  status: string;
}

interface Props {
  initialMessages: MessageRecord[];
}

// Codewords are not exposed to the browser — groups are built dynamically from decrypted payloads
const KNOWN_CODEWORDS: string[] = [];

export function InboxClient({ initialMessages }: Props) {
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const [privateKey, setPrivateKey] = useState("");
  const [decrypted, setDecrypted] = useState<Map<string, PlaintextPayload>>(new Map());
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) return;
        const data = await res.json();
        const incoming: MessageRecord[] = data.messages ?? [];
        const newMsgs = incoming.filter((m) => !knownIds.current.has(m.id));
        if (newMsgs.length > 0) {
          newMsgs.forEach((m) => knownIds.current.add(m.id));
          setMessages((prev) => [...newMsgs, ...prev]);
        }
      } catch { /* network error — try again next tick */ }
    };

    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, []);

  function handleDecryptAll() {
    setDecryptError(null);

    if (!privateKey.trim()) {
      setDecryptError("Please paste your private key.");
      return;
    }

    const results = new Map<string, PlaintextPayload>();
    let failures = 0;

    for (const msg of messages) {
      try {
        results.set(msg.id, decryptMessage(msg.ciphertext, privateKey.trim()));
      } catch {
        failures++;
      }
    }

    setDecrypted(results);

    if (results.size === 0 && messages.length > 0) {
      setDecryptError("Incorrect private key — no messages could be decrypted.");
    } else if (failures > 0) {
      setDecryptError(`${failures} message${failures > 1 ? "s" : ""} could not be decrypted.`);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
    } catch { /* silent */ }
  }

  async function deleteMessage(id: string) {
    try {
      await fetch(`/api/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setDecrypted((prev) => { const next = new Map(prev); next.delete(id); return next; });
      if (expandedId === id) setExpandedId(null);
    } catch { /* silent */ }
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  const isDecrypted = decrypted.size > 0;

  type DecryptedMsg = MessageRecord & { payload: PlaintextPayload };
  function buildGroups(): { label: string; msgs: DecryptedMsg[] }[] {
    const map = new Map<string, DecryptedMsg[]>();
    for (const cw of KNOWN_CODEWORDS) map.set(cw, []);
    for (const msg of messages) {
      const payload = decrypted.get(msg.id);
      if (!payload) continue;
      const key = payload.codeword.trim().toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...msg, payload });
    }
    return Array.from(map.entries())
      .filter(([, msgs]) => msgs.length > 0)
      .map(([label, msgs]) => ({
        label,
        msgs: msgs.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
      }));
  }

  const groups = buildGroups();

  function fmt(d: string | Date) {
    return new Date(d).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (messages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="mb-3 text-xs text-zinc-500">Paste your private key to decrypt messages.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDecryptAll(); }}
              placeholder="base64 private key..."
              autoComplete="off"
              className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="button"
              onClick={handleDecryptAll}
              className="rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              Decrypt all
            </button>
          </div>
          {decryptError && <p className="mt-2 text-sm font-medium text-red-400">{decryptError}</p>}
        </div>
        <div className="rounded-lg border border-zinc-800 py-16 text-center">
          <p className="text-sm text-zinc-600">No messages yet.</p>
          <p className="mt-1 text-xs text-zinc-700">Messages sent to the public page will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Private key + decrypt */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <p className="text-xs text-zinc-500">
          Paste your private key to decrypt and group messages by codeword.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleDecryptAll(); }}
            placeholder="Paste base64 private key..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="button"
            onClick={handleDecryptAll}
            className="rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors whitespace-nowrap"
          >
            {isDecrypted ? "Re-decrypt" : "Decrypt all"}
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
        </div>

        {decryptError && (
          <p className="text-sm font-medium text-red-400">{decryptError}</p>
        )}

        {isDecrypted && !decryptError && (
          <p className="text-xs text-zinc-600">
            Decrypted {decrypted.size} of {messages.length} — grouped by codeword below.
          </p>
        )}
      </div>

      {/* Before decryption: raw message list */}
      {!isDecrypted && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden divide-y divide-zinc-800/50">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-xs font-mono text-zinc-600 truncate max-w-xs">{msg.id}</p>
                <p className="mt-0.5 text-xs text-zinc-700">{fmt(msg.receivedAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                {msg.status === "new" && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-black">new</span>
                )}
                <button
                  type="button"
                  onClick={() => deleteMessage(msg.id)}
                  className="text-xs text-red-900 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* After decryption: grouped by codeword */}
      {isDecrypted && (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-center text-sm text-zinc-600 py-8">No messages could be grouped — check your private key.</p>
          )}
          {groups.map(({ label, msgs }) => (
            <div key={label} className="rounded-lg border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(label)}
                className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-zinc-900/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-medium text-zinc-200">{label}</span>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
                    {msgs.length}
                  </span>
                  {msgs.some((m) => m.status === "new") && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-black">new</span>
                  )}
                </div>
                <svg className={`h-4 w-4 text-zinc-600 transition-transform ${collapsedGroups.has(label) ? "-rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!collapsedGroups.has(label) && (
                <div className="divide-y divide-zinc-800/50 border-t border-zinc-800">
                  {msgs.map((msg) => (
                    <div key={msg.id}>
                      <div
                        className="flex cursor-pointer items-start gap-4 px-5 py-4 hover:bg-zinc-900/40 transition-colors"
                        onClick={() => {
                          const opening = expandedId !== msg.id;
                          setExpandedId(opening ? msg.id : null);
                          if (opening && msg.status === "new") updateStatus(msg.id, "read");
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug line-clamp-2 ${msg.status === "new" ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>
                            {msg.payload.message}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <p className="text-xs text-zinc-600">{fmt(msg.receivedAt)}</p>
                            {msg.status === "new" && <span className="text-xs text-zinc-400">· new</span>}
                            {msg.status === "archived" && <span className="text-xs text-zinc-700">· archived</span>}
                          </div>
                        </div>
                        <svg className={`mt-1 h-3.5 w-3.5 shrink-0 text-zinc-700 transition-transform ${expandedId === msg.id ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {expandedId === msg.id && (
                        <div className="border-t border-zinc-800/50 bg-zinc-950 px-5 py-4 space-y-3">
                          <div className="space-y-1">
                            <p className="text-xs text-zinc-600 uppercase tracking-wide">Codeword</p>
                            <p className="text-sm font-mono text-zinc-300">{msg.payload.codeword}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-zinc-600 uppercase tracking-wide">Message</p>
                            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{msg.payload.message}</p>
                          </div>
                          <p className="text-xs text-zinc-700">
                            {msg.payload.clientTimestamp ? fmt(msg.payload.clientTimestamp) : "—"}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-700">Mark as:</span>
                              {(["new", "read", "archived"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => updateStatus(msg.id, s)}
                                  disabled={msg.status === s}
                                  className="rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-20 disabled:cursor-not-allowed capitalize transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteMessage(msg.id)}
                              className="rounded border border-zinc-800 px-2.5 py-1 text-xs text-red-800 hover:text-red-400 hover:border-red-900 transition-colors"
                            >
                              Delete
                            </button>
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
    </div>
  );
}
