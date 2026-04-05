import { z } from "zod";

/** Maximum ciphertext size accepted by the API (base64 of ~7KB plaintext + overhead) */
const MAX_CIPHERTEXT_BYTES = 12_000;

/**
 * Schema for the POST /api/messages request body.
 * Only ciphertext is accepted — plaintext fields never reach the server.
 */
export const SubmitMessageSchema = z.object({
  ciphertext: z
    .string()
    .min(1, "Ciphertext is required")
    .max(MAX_CIPHERTEXT_BYTES, `Ciphertext exceeds maximum size of ${MAX_CIPHERTEXT_BYTES} characters`),
});

export type SubmitMessageInput = z.infer<typeof SubmitMessageSchema>;

/**
 * Schema for pre-encryption validation in the browser.
 * Validates that the plaintext payload fields are within acceptable limits
 * before the browser encrypts and submits.
 */
export const PlaintextPayloadSchema = z.object({
  codeword: z
    .string()
    .min(2, "Codeword must be at least 2 characters")
    .max(64, "Codeword must be 64 characters or fewer"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be 5000 characters or fewer"),
});

export type PlaintextPayloadInput = z.infer<typeof PlaintextPayloadSchema>;

/**
 * Valid status values for a stored message.
 */
export const MessageStatusSchema = z.enum(["new", "read", "archived"]);

export const UpdateStatusSchema = z.object({
  status: MessageStatusSchema,
});
