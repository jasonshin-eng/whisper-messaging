/**
 * Encoding utilities for the crypto layer.
 * All functions return strict Uint8Array (not Buffer, not plain Array)
 * so that tweetnacl accepts them in the browser.
 */

export function toB64(bytes: Uint8Array): string {
  // Works in both browser and Node
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
