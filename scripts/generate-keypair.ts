/**
 * Key generation script — run once to produce a recipient keypair.
 *
 * Usage:
 *   npm run generate-keypair
 *
 * Output:
 *   PUBLIC KEY  — copy to NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY in your environment
 *   PRIVATE KEY — store securely (password manager). NEVER deploy or commit.
 *
 * Both keys are standard base64, compatible with the tweetnacl encrypt/decrypt
 * functions in lib/crypto/.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nacl = require("tweetnacl");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { encodeBase64 } = require("tweetnacl-util");

const keypair = nacl.box.keyPair();

const publicKeyB64 = encodeBase64(keypair.publicKey);
const privateKeyB64 = encodeBase64(keypair.secretKey);

console.log("\n========================================");
console.log("  Secure Dropbox — Recipient Keypair");
console.log("========================================\n");

console.log("PUBLIC KEY (safe to expose — add to NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY):");
console.log(publicKeyB64);

console.log("\nPRIVATE KEY (keep secret — store in password manager only):");
console.log(privateKeyB64);

console.log("\n========================================");
console.log("IMPORTANT:");
console.log("  - Do NOT commit the private key to version control.");
console.log("  - Do NOT add the private key to .env.local or any deployed file.");
console.log("  - Do NOT share the private key with anyone.");
console.log("  - The public key is safe to embed in your deployed site.");
console.log("  - To rotate keys: generate a new pair, update the public key");
console.log("    in your deployment, and re-decrypt old messages with the old");
console.log("    private key before retiring it.");
console.log("========================================\n");
