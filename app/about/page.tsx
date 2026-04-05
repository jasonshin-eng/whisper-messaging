export const metadata = {
  title: "About — Whisper",
  robots: { index: false, follow: false },
};

const GRID_BG = {
  backgroundImage: `
    linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)
  `,
  backgroundSize: "40px 40px",
};

export default function AboutPage() {
  return (
    <main
      className="relative min-h-screen bg-black px-6 py-16 flex flex-col items-center"
      style={GRID_BG}
    >
      {/* Back link */}
      <a
        href="/"
        className="absolute top-4 left-5 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors"
      >
        ← back
      </a>

      <div className="relative z-10 w-full max-w-xl pt-8">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">About</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Whisper</h1>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
            A one-way encrypted message dropbox. Anyone can send a message. Only one person can read it.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* What it does */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-600">What it does</h2>
            <p className="text-zinc-400">
              Whisper lets people send private messages to a single recipient without creating an account,
              without revealing their identity, and without the server ever seeing the content of what
              they wrote. Messages are encrypted the moment you type them — before they leave your device.
              The server receives and stores only an unreadable block of scrambled data.
            </p>
            <p className="text-zinc-400">
              The recipient unlocks messages in their private inbox by supplying their secret key directly
              in the browser. The key never leaves their device and is never sent to the server.
            </p>
          </section>

          {/* How encryption works */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-600">How the encryption works</h2>
            <p className="text-zinc-400">
              Whisper uses <span className="text-zinc-200">public-key encryption</span> — the same
              mathematical principle that secures online banking and private messaging apps like Signal.
              There are two keys: a <span className="text-zinc-200">public key</span> (shared openly,
              used to lock messages) and a <span className="text-zinc-200">private key</span> (kept
              secret by the recipient, used to unlock them). Anything locked with the public key can
              only be unlocked with the matching private key.
            </p>
            <p className="text-zinc-400">
              When you click Send, your browser runs the following steps entirely locally:
            </p>
            <ol className="space-y-2 text-zinc-500 list-none">
              {[
                ["Generate ephemeral keypair", "A one-time throwaway key pair is created for this message only. It is discarded immediately after sending. This means no two messages are mathematically linked."],
                ["Encrypt with NaCl box", "Your message is encrypted using the NaCl box construction — Curve25519 for key agreement, XSalsa20 for encryption, and Poly1305 for authentication. The result is a sealed blob of ciphertext with a 16-byte authentication tag."],
                ["Pack and encode", "The ephemeral public key, a random nonce (one-time number), and the ciphertext are packed together and encoded as base64 — a compact text-safe format."],
                ["Send to server", "Only this base64 blob is transmitted. The server stores it without any ability to read it."],
              ].map(([title, desc], i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-zinc-700 font-mono shrink-0 mt-0.5">{i + 1}.</span>
                  <span>
                    <span className="text-zinc-300">{title}. </span>
                    {desc}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Codewords */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-600">Codewords</h2>
            <p className="text-zinc-400">
              Messages require a pre-agreed codeword known only to the sender and recipient. This
              acts as a lightweight filter — not a password, not proof of identity — but a way to
              group and organise messages by context once they are decrypted. Only approved codewords
              are accepted, so unsolicited messages are silently rejected before reaching the inbox.
            </p>
          </section>

          {/* What it protects against */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-600">What it protects against</h2>
            <ul className="space-y-2 text-zinc-500">
              {[
                "Server compromise — even if the database is breached, all stored data is ciphertext with no key.",
                "Interception in transit — messages are encrypted before leaving your device. HTTPS adds a second layer.",
                "Spam and mass messaging — rate limiting and codeword validation block unsolicited senders.",
                "Persistent sessions — the inbox requires a password each visit. Sessions expire after 15 minutes and logging in anywhere immediately invalidates all other sessions.",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-zinc-700 shrink-0 mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* What it does not protect against */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-600">Limitations</h2>
            <ul className="space-y-2 text-zinc-500">
              {[
                "Sender identity is not verified. Anyone who knows a valid codeword can send a message.",
                "Metadata such as IP address and send time are visible to the server infrastructure.",
                "If your private key is compromised, all messages can be decrypted. Keep it in a password manager.",
                "Browser-side security depends on the integrity of the JavaScript delivered to you. A compromised CDN or network is a risk.",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-zinc-700 shrink-0 mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Tech */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-600">Built with</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-zinc-500">
              {[
                ["Next.js 14", "Web framework"],
                ["TweetNaCl", "Cryptography library"],
                ["Curve25519", "Key agreement algorithm"],
                ["XSalsa20-Poly1305", "Encryption + authentication"],
                ["bcrypt", "Inbox password hashing"],
                ["HMAC-SHA256", "Session token signing"],
                ["Drizzle ORM + Neon", "Database (production)"],
                ["Tailwind CSS", "Styling"],
              ].map(([name, role]) => (
                <div key={name} className="flex justify-between gap-4">
                  <span className="text-zinc-300">{name}</span>
                  <span className="text-zinc-700 text-xs self-center">{role}</span>
                </div>
              ))}
            </div>
          </section>

        </div>

        <div className="mt-16 border-t border-zinc-900 pt-6">
          <p className="text-xs text-zinc-800">
            Whisper &mdash; end-to-end encrypted &middot; no accounts &middot; no tracking
          </p>
        </div>

      </div>
    </main>
  );
}
