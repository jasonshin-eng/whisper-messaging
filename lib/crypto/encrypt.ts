/**
 * @browser-only
 *
 * Client-side encryption using NaCl box (Curve25519 + XSalsa20 + Poly1305).
 *
 * Wire format of the output base64 blob:
 *   [0..31]  ephemeral sender public key  (32 bytes, Curve25519)
 *   [32..55] random nonce                 (24 bytes)
 *   [56..]   NaCl box ciphertext          (plaintext.length + 16 bytes MAC)
 *
 * The private key of the recipient is never involved in encryption and
 * never touches this file.
 */

import * as naclModule from "tweetnacl";
// CJS interop: webpack may wrap the default export
const nacl = (naclModule as any).default ?? naclModule;
import { toB64, fromB64, encodeUtf8, concat } from "./encoding";
import type { PlaintextPayload } from "./types";

/**
 * Encrypt a plaintext payload for the recipient identified by recipientPublicKeyB64.
 *
 * @param payload         The plaintext payload to encrypt.
 * @param recipientPublicKeyB64  The recipient's long-term public key in base64.
 * @returns  Base64-encoded sealed blob (ephemeralPk || nonce || ciphertext).
 */
export function encryptMessage(
  payload: PlaintextPayload,
  recipientPublicKeyB64: string
): string {
  const plaintext = encodeUtf8(JSON.stringify(payload));
  const recipientPk = fromB64(recipientPublicKeyB64);

  if (recipientPk.length !== 32) {
    throw new Error("Invalid recipient public key length");
  }

  // Generate a fresh ephemeral keypair for this message only.
  // The ephemeral private key is discarded immediately after use — this
  // provides forward secrecy per message.
  const ephemeral = nacl.box.keyPair();

  // Random nonce — 24 bytes as required by NaCl box.
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Encrypt using the ephemeral private key and the recipient's public key.
  const boxed = nacl.box(plaintext, nonce, recipientPk, ephemeral.secretKey);

  // Zero out the ephemeral secret key from memory.
  ephemeral.secretKey.fill(0);

  // Concatenate: ephemeralPk || nonce || ciphertext → base64
  return toB64(concat(ephemeral.publicKey, nonce, boxed));
}
