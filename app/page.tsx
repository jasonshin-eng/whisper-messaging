import { SecureMessageForm } from "@/components/secure-message-form";

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16 overflow-hidden">

      {/* Grid background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#000000",
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Whisper logo — top-left */}
      <span className="absolute top-4 left-5 text-[11px] text-zinc-600 select-none z-10 tracking-widest uppercase">
        Whisper
      </span>

      {/* Inbox link — subtle, top-right corner */}
      <a
        href="/inbox"
        className="absolute top-4 right-5 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors select-none z-10"
        tabIndex={-1}
      >
        inbox
      </a>

      {/* About link — subtle, bottom-right corner */}
      <a
        href="/about"
        className="absolute bottom-5 right-5 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors select-none z-10"
        tabIndex={-1}
      >
        about
      </a>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-widest text-zinc-400">
            End-to-end encrypted
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white leading-snug drop-shadow-lg">
            Send a private message<br />to Jason
          </h1>
          <p className="mt-4 text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
            Your message is encrypted in your browser before it leaves your device.
          </p>
        </div>

        {/* Form — card with dark backdrop to lift it off the grid */}
        <div className="rounded-xl bg-black/60 backdrop-blur-sm border border-zinc-800 px-6 py-7">
          <SecureMessageForm />
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-5 text-xs text-zinc-800 z-10">
        End-to-end encrypted &middot; No accounts &middot; No tracking
      </p>
    </main>
  );
}
