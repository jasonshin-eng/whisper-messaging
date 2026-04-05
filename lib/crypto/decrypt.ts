/**
 * @browser-only
 *
 * Client-side decryption — the exact inverse of encrypt.ts.
 *
 * The private key is accepted as a parameter (from React state in the
 * DecryptPanel component). It is never persisted, never sent to the server,
 * and never stored in localStorage or sessionStorage.
 */

import * as naclModule from "tweetnacl";
// CJS interop: webpack may wrap the default export
const nacl = (naclModule as any).default ?? naclModule;
import { fromB64, decodeUtf8 } from "./encoding";
import { DecryptionError, type PlaintextPayload } from "./types";

/** Byte offsets within the sealed blob */
const EPHEMERAL_PK_END = 32;
const NONCE_END = 32 + 24; // 56

/**
 * Decrypt a sealed blob using the recipient's private key.
 *
 * @param ciphertextB64   Base64-encoded sealed blob (ephemeralPk || nonce || ciphertext).
 * @param privateKeyB64   Recipient's private key in base64 (from user input, held in React state).
 * @returns               Decrypted PlaintextPayload.
 * @throws DecryptionError if the key is wrong or the ciphertext is tampered.
 */
export function decryptMessage(
  ciphertextB64: string,
  privateKeyB64: string
): PlaintextPayload {
  let raw: Uint8Array;
  let recipientSk: Uint8Array;

  try {
    raw = fromB64(ciphertextB64);
    recipientSk = fromB64(privateKeyB64);
  } catch {
    throw new DecryptionError("Invalid base64 encoding in ciphertext or key");
  }

  if (raw.length < NONCE_END + 16) {
    throw new DecryptionError("Ciphertext is too short to be valid");
  }

  if (recipientSk.length !== 32) {
    throw new DecryptionError("Private key must be 32 bytes (256 bits)");
  }

  const ephemeralPk = raw.slice(0, EPHEMERAL_PK_END);
  const nonce = raw.slice(EPHEMERAL_PK_END, NONCE_END);
  const boxed = raw.slice(NONCE_END);

  // nacl.box.open returns null on MAC failure (wrong key or tampered ciphertext).
  // This is not an exception — we must check explicitly.
  const plaintext = nacl.box.open(boxed, nonce, ephemeralPk, recipientSk);

  if (plaintext === null) {
    throw new DecryptionError(
      "Decryption failed — wrong private key or corrupted ciphertext"
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeUtf8(plaintext));
  } catch {
    throw new DecryptionError("Decrypted payload is not valid JSON");
  }

  // Basic shape validation
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).codeword !== "string" ||
    typeof (parsed as Record<string, unknown>).message !== "string"
  ) {
    throw new DecryptionError("Decrypted payload has unexpected shape");
  }

  return parsed as PlaintextPayload;
}
