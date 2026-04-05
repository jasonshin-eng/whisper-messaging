# Secure Dropbox

A personal, one-way encrypted message inbox. Anyone with the URL can send you a short encrypted message. Only you can decrypt it, using a private key you keep locally.

**Not** a chat app. **Not** email. **Not** multi-user. This is a one-way encrypted dropbox for you.

---

## Architecture overview

```
Browser (sender)                 Server                     Browser (you)
─────────────────                ──────────                 ─────────────
Write codeword + message
  ↓
Encrypt in browser using         Receives only ciphertext   Paste private key into
your public key (NaCl box)  →    Stores in Postgres         Decrypt Panel
  ↓                              (never sees plaintext) →   Decrypts locally
POST /api/messages                                          Read plaintext
{ciphertext: "..."}
```

The server is **structurally incapable** of reading messages if the crypto is correct — it only stores opaque base64 blobs.

---

## Encryption flow (step by step)

1. **Sender fills out form** — codeword + message, in their browser.
2. **Client-side validation** — Zod checks field lengths before encryption.
3. **Payload assembled** — `{ version: 1, codeword, message, clientTimestamp }` is JSON-serialized.
4. **Ephemeral keypair generated** — a fresh Curve25519 keypair is created for this message only. The ephemeral private key is discarded immediately after use.
5. **Random nonce generated** — 24 bytes from `nacl.randomBytes`.
6. **NaCl box encryption** — `nacl.box(plaintext, nonce, recipientPubKey, ephemeralSecretKey)` → ciphertext with 16-byte Poly1305 MAC.
7. **Wire blob assembled** — `base64(ephemeralPublicKey[32] || nonce[24] || ciphertext[N+16])`.
8. **POST to server** — only the base64 blob is sent. Server validates size, applies rate limiting, inserts into Postgres.
9. **Decryption (you, in inbox)** — paste your private key into the Decrypt Panel. `nacl.box.open` reconstructs the shared secret using your private key + the embedded ephemeral public key, verifies the MAC, and returns plaintext. Private key stays in React state — never sent to server.

### Wire format

| Offset | Length | Content |
|--------|--------|---------|
| 0      | 32     | Ephemeral sender public key (Curve25519) |
| 32     | 24     | Random nonce |
| 56     | N+16   | NaCl box ciphertext (message + 16-byte MAC) |

Overhead per message: **88 bytes + plaintext length**.

---

## Threat model

### What this protects against

- **Server reading message content** — the server stores only ciphertext. Without your private key, it cannot decrypt.
- **Database breach** — an attacker who dumps the database gets only ciphertext blobs, IDs, and timestamps. No plaintext, no keys.
- **Passive network observers** — all traffic is HTTPS; observers see only that a POST was made to `/api/messages`.
- **Replay of messages** — the Poly1305 MAC and the ephemeral keypair make each message unique. Replaying the same blob is possible but produces no new information for the attacker (they still can't decrypt it).

### What this does NOT protect against

- **Unauthenticated sender identity** — the codeword is social/human identity hint only. It is encrypted, so the server can't see it, but it provides no cryptographic proof of who sent the message. Anyone who knows or guesses your codeword can impersonate you.
- **Metadata** — IP addresses and timestamps may be logged by infrastructure (Vercel, Neon, Upstash, your CDN) even if this app avoids storing them in the database.
- **JavaScript supply chain** — if the JavaScript served to senders is malicious (e.g., via a compromised npm dependency or CDN), browser-side encryption can be undermined. Review your dependencies and use Subresource Integrity where possible.
- **Compromised host** — if the server is fully compromised by an attacker, they could serve modified JavaScript that exfiltrates plaintext before encryption. There is no defense against a fully compromised host.
- **Side-channel leakage** — this is a personal encrypted dropbox, not a full secure messenger like Signal. It does not provide deniability, forward secrecy at the session level (though each message uses an ephemeral key), or protection against timing attacks on the inbox password beyond bcrypt's inherent slowness.
- **Codeword reuse or guessing** — codewords can be guessed, shared, or leaked. Do not rely on them for security — they are identity hints, not authentication.

---

## Setup

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- An [Upstash](https://upstash.com) Redis database

### 1. Install dependencies

```bash
npm install
```

### 2. Generate your recipient keypair

```bash
npm run generate-keypair
```

This prints:
- A **public key** — copy this to `NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY`
- A **private key** — store this in your password manager

**CRITICAL:** The private key must never be committed, deployed, or stored in any `.env` file that ships with the app. Keep it only in your password manager or an offline secure store.

### 3. Generate your inbox password hash

```bash
node -e "const b=require('bcryptjs'); b.hash('yourpassword', 12).then(console.log)"
```

Copy the resulting hash to `INBOX_PASSWORD_HASH`. Never store the plaintext password in an env file.

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgres://...        # Neon pooled connection string
DATABASE_URL_DIRECT=postgres://... # Neon direct connection string (for migrations)
NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY=  # base64 public key from step 2
INBOX_PASSWORD_HASH=               # bcrypt hash from step 3
UPSTASH_REDIS_REST_URL=            # from Upstash dashboard
UPSTASH_REDIS_REST_TOKEN=          # from Upstash dashboard
```

### 5. Run database migrations

```bash
npm run db:generate   # Generate SQL from schema
npm run db:migrate    # Apply migrations to your Neon database
```

> **Note:** `db:migrate` uses `DATABASE_URL_DIRECT` (the direct connection string, not the pooled one). Neon's PgBouncer proxy does not support the extended query protocol used by drizzle-kit migrations.

### 6. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the submit page.  
Open [http://localhost:3000/inbox](http://localhost:3000/inbox) for the private inbox.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon **pooled** connection string (app runtime) |
| `DATABASE_URL_DIRECT` | Yes | Neon **direct** connection string (migrations only) |
| `NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY` | Yes | Base64 recipient public key — safe to expose |
| `INBOX_PASSWORD_HASH` | Yes | bcrypt hash (cost=12) of inbox password — server only |
| `UPSTASH_REDIS_REST_URL` | Yes (prod) | Upstash Redis REST URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (prod) | Upstash Redis REST token |

Only `NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY` has a `NEXT_PUBLIC_` prefix. All other variables are server-side only.

---

## Database migrations

```bash
# Generate migration files from schema changes
npm run db:generate

# Apply pending migrations to the database
npm run db:migrate

# (Dev only) Push schema directly without migration files
npm run db:push
```

The `drizzle/` directory contains the generated migration SQL files. These are safe to commit.

---

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Create a new Vercel project and connect your repository.
3. In Vercel project settings → Environment Variables, add all required variables from `.env.example`.
4. Run migrations against your production Neon database:
   ```bash
   DATABASE_URL_DIRECT=<your-direct-url> npm run db:migrate
   ```
5. Deploy.

### Vercel-specific notes

- Use the **pooled** Neon connection string for `DATABASE_URL` (handles serverless cold starts).
- Use the **direct** Neon connection string for `DATABASE_URL_DIRECT` (migrations only, never used at runtime).
- The app sets `robots: { index: false }` on all pages — consider also adding a `robots.txt` to discourage indexing of your inbox URL.
- Security headers (CSP, X-Frame-Options, etc.) are applied in `middleware.ts` and `next.config.ts`.

---

## Key rotation

If your private key is compromised:

1. Generate a new keypair: `npm run generate-keypair`
2. Before deploying the new public key: use the old private key in your inbox to decrypt and save any messages you want to keep.
3. Update `NEXT_PUBLIC_RECIPIENT_PUBLIC_KEY` in your deployment to the new public key.
4. Store the new private key securely.
5. Redeploy.

> Old messages encrypted with the old public key can only be decrypted with the old private key. They cannot be decrypted with the new private key. Keep the old private key in your password manager if you need to access old messages.

---

## Limitations and future improvements

- **Single recipient only** — this is a personal inbox, not a multi-tenant service.
- **No message search** — ciphertext blobs cannot be searched server-side; decryption is required.
- **No file attachments** — message-only MVP.
- **Session stored in Redis** — if Redis goes down, the inbox session is lost (you can log in again).
- **Rate limiting is IP-based** — can be bypassed by users with multiple IPs, but deters casual abuse.
- **No message pagination** — currently limited to 200 most recent messages.

### Possible future improvements

- Message pagination and sorting
- Webhooks or notifications when new messages arrive
- Multiple recipients (separate keypairs per contact)
- Expiring messages (auto-delete after N days)
- Neon's direct connection string exposed as a separate env var for migration tooling

---

## Package choices

| Package | Why |
|---------|-----|
| `tweetnacl` + `tweetnacl-util` | Pure JavaScript NaCl implementation. No native binaries, no WASM, works identically in browsers and Node.js. Audited, widely used. |
| `@neondatabase/serverless` | HTTP-based Postgres client for Neon. Compatible with Vercel Edge and serverless runtimes without connection pool issues. |
| `@upstash/ratelimit` + `@upstash/redis` | Uses `fetch()` internally — works in Edge Runtime and serverless functions. No persistent TCP connections. |
| `bcryptjs` | Pure JavaScript bcrypt with no native build step. Same API as `bcrypt`. |
| `nanoid@3` | v3.3.x is the last CJS-compatible release. v4+ is ESM-only, which conflicts with drizzle-kit CLI tooling. |
| `zod` | De facto standard for TypeScript runtime validation. Shared between browser (pre-encryption field validation) and server (API input validation). |
| `drizzle-orm` + `drizzle-kit` | Lightweight, type-safe ORM with a minimal abstraction layer. SQL-first with TypeScript inference. |
