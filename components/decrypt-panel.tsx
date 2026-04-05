"use client";

/**
 * @browser-only
 *
 * DecryptPanel — accepts a private key in React state (never stored anywhere)
 * and decrypts the selected message client-side.
 *
 * The private key is held exclusively in component state for the lifetime of
 * the current page session. It is not written to localStorage, sessionStorage,
 * cookies, or any server-side endpoint.
 */

import { useState } from "react";
import { decryptMessage } from "@/lib/crypto/decrypt";
import type { PlaintextPayload } from "@/lib/crypto/types";
import { DecryptionError } from "@/lib/crypto/types";

interface DecryptPanelProps {
  ciphertext: string;
  messageId: string;
  receivedAt: string;
}

type PanelState = "idle" | "decrypting" | "decrypted" | "error";

export function DecryptPanel({
  ciphertext,
  messageId,
  receivedAt,
}: DecryptPanelProps) {
  // Private key held in React state only — not persisted
  const [privateKey, setPrivateKey] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [decrypted, setDecrypted] = useState<PlaintextPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleDecrypt(e: React.FormEvent) {
    e.preventDefault();
    if (!privateKey.trim()) return;

    setPanelState("decrypting");
    setErrorMsg(null);
    setDecrypted(null);

    try {
      const result = decryptMessage(ciphertext, privateKey.trim());
      setDecrypted(result);
      setPanelState("decrypted");
    } catch (err) {
      setPanelState("error");
      if (err instanceof DecryptionError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Unexpected decryption error.");
      }
    }
  }

  function handleClear() {
    setPrivateKey("");
    setPanelState("idle");
    setDecrypted(null);
    setErrorMsg(null);
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">
          Decrypt message
        </h3>
        <span className="text-xs text-zinc-600 font-mono">{messageId.slice(0, 12)}…</span>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2">
        <p className="text-xs text-zinc-600 mb-1">Received at</p>
        <p className="text-xs text-zinc-400 font-mono">
          {new Date(receivedAt).toLocaleString()}
        </p>
      </div>

      {panelState === "decrypted" && decrypted ? (
        <div className="space-y-3">
          <div className="rounded border border-zinc-700 bg-zinc-950 p-3 space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Codeword
              </p>
              <p className="text-sm text-zinc-200 font-mono break-all">
                {decrypted.codeword}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Message
              </p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">
                {decrypted.message}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Sender timestamp
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                {decrypted.clientTimestamp
                  ? new Date(decrypted.clientTimestamp).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>
          <div className="rounded border border-amber-800 bg-amber-950 px-3 py-2">
            <p className="text-xs text-amber-400">
              Decrypted locally in your browser. The plaintext above is not
              stored anywhere.
            </p>
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear decrypted content
          </button>
        </div>
      ) : (
        <form onSubmit={handleDecrypt} className="space-y-3">
          <div>
            <label
              htmlFor={`private-key-${messageId}`}
              className="mb-1 block text-xs font-medium text-zinc-400"
            >
              Your private key
            </label>
            <p className="mb-2 text-xs text-zinc-600">
              Paste your base64 private key. It is held only in browser memory
              and never sent to the server.
            </p>
            <textarea
              id={`private-key-${messageId}`}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              rows={3}
              placeholder="Paste your base64 private key here..."
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 font-mono placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {panelState === "error" && errorMsg && (
            <div className="rounded border border-red-700 bg-red-950 px-3 py-2 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!privateKey.trim() || panelState === "decrypting"}
              className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {panelState === "decrypting" ? "Decrypting..." : "Decrypt locally"}
            </button>
            {privateKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
