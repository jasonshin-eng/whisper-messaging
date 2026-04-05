import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whisper",
  description:
    "Send an end-to-end encrypted message. Your message is encrypted in your browser before submission.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-zinc-950 text-zinc-100">
      <body className="min-h-screen bg-zinc-950 antialiased">
        {children}
      </body>
    </html>
  );
}
