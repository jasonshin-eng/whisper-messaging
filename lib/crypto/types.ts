/**
 * The plaintext payload shape that gets JSON-serialized and encrypted in the browser.
 * This structure is never sent to the server or stored in plaintext.
 */
export interface PlaintextPayload {
  version: 1;
  /** Human/social identity hint — NOT a password, NOT proof of identity */
  codeword: string;
  message: string;
  /** ISO 8601 timestamp set by the sender's browser */
  clientTimestamp: string;
}

/**
 * Decryption error with a user-friendly message.
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}
