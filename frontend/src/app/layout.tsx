import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "@/components/Navigation";
import Beams from "@/components/Beams";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart IoT Resource Monitor",
  description: "Live water and electricity monitoring dashboard",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/*
          LAYER 0 — Beams background canvas (position: fixed, z-index: 0)
          The canvas itself sets backgroundColor="#000000" so it IS the page background.
          pointer-events: none so it never blocks interaction.
        */}
        <div className="app-bg-layer">
          <Beams
            beamWidth={3}
            beamHeight={18}
            beamNumber={10}
            lightColor="#00E5FF"
            beamColor="#083B4A"
            backgroundColor="#000000"
            speed={1.5}
            noiseIntensity={1.5}
            scale={0.25}
            rotation={-12}
            lightMode={false}
          />
        </div>

        {/*
          LAYER 1 — Application shell (position: relative, z-index: 1)
          All backgrounds here must be transparent or translucent to let
          the Beams canvas show through the gaps between cards.
        */}
        <div className="app-shell">
          <Navigation />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
