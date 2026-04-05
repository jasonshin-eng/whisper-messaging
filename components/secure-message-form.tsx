"use client";

import { useState } from "react";
import { encryptMessage } from "@/lib/crypto/encrypt";

type FormState = "idle" | "encrypting" | "submitting" | "success" | "error";

// SHA-256 hashes of valid codewords — the actual codewords never appear in the browser bundle
const VALID_HASHES: Set<string> = new Set(
  (process.env.NEXT_PUBLIC_VALID_CODEWORD_HASHES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);

async function hashCodeword(codeword: string): Promise<string> {
  const encoded = new TextEncoder().encode(codeword.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function SecureMessageForm() {
  const [codeword, setCodeword] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY ?? "";
  const busy = state === "encrypting" || state === "submitting";

  async function handleSubmit() {
    setErrorMsg(null);

    const cw = codeword.trim().toLowerCase();
    const msg = message.trim();

    if (!cw) {
      setState("error");
      setErrorMsg("Please enter a codeword.");
      return;
    }

    if (VALID_HASHES.size > 0) {
      const hash = await hashCodeword(cw);
      if (!VALID_HASHES.has(hash)) {
        setState("error");
        setErrorMsg("Invalid codeword. Please use an approved codeword.");
        return;
      }
    }

    if (!msg) {
      setState("error");
      setErrorMsg("Please enter a message.");
      return;
    }

    if (msg.length > 5000) {
      setState("error");
      setErrorMsg("Message is too long (max 5000 characters).");
      return;
    }

    if (!publicKey) {
      setState("error");
      setErrorMsg("Recipient public key is not configured.");
      return;
    }

    setState("encrypting");

    let ciphertext: string;
    try {
      ciphertext = encryptMessage(
        { version: 1, codeword: cw, message: msg, clientTimestamp: new Date().toISOString() },
        publicKey
      );
    } catch (err) {
      setState("error");
      setErrorMsg("Encryption failed. Please refresh and try again.");
      console.error("Encryption error:", err);
      return;
    }

    setState("submitting");

    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ciphertext }),
    })
      .then((response) => {
        if (response.status === 429) {
          response.headers.get("Retry-After");
          setState("error");
          setErrorMsg("Too many messages sent. Please wait a few minutes.");
          return;
        }
        if (!response.ok) {
          setState("error");
          setErrorMsg("Submission failed. Please try again.");
          return;
        }
        setState("success");
        setCodeword("");
        setMessage("");
      })
      .catch(() => {
        setState("error");
        setErrorMsg("Network error. Please check your connection.");
      });
  }

  if (state === "success") {
    return (
      <div className="text-center py-8">
        <div className="mb-4 text-2xl text-white">&#10003;</div>
        <p className="text-sm text-zinc-400">Message sent and encrypted in your browser.</p>
        <button
          type="button"
          className="mt-6 text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
          onClick={() => { setState("idle"); setErrorMsg(null); }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Codeword */}
      <div>
        <label htmlFor="codeword" className="block text-xs text-zinc-500 mb-1.5">
          Codeword
        </label>
        <input
          id="codeword"
          type="text"
          value={codeword}
          onChange={(e) => setCodeword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Your agreed codeword"
          maxLength={64}
          autoComplete="off"
          className="w-full rounded-none border-0 border-b border-zinc-800 bg-transparent px-0 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-xs text-zinc-500 mb-1.5">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message here..."
          rows={6}
          maxLength={5000}
          className="w-full rounded-none border-0 border-b border-zinc-800 bg-transparent px-0 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
        />
        <p className="mt-1 text-right text-xs text-zinc-800">{message.length}/5000</p>
      </div>

      {/* Error */}
      {errorMsg && (
        <p className="text-sm font-medium text-red-400">{errorMsg}</p>
      )}

      {/* Submit */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors bg-transparent"
        >
          {state === "encrypting" ? "Encrypting..." : state === "submitting" ? "Sending..." : "Send message"}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-800">
          Encrypted in your browser &middot; Server never sees plaintext
        </p>
      </div>
    </div>
  );
}
