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
          LAYER 0 — Beams background canvas (fixed, z-index: 0, covers entire screen)
          Exact React Bits Beams configuration requested by user
        */}
        <div className="app-bg-layer">
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={20}
            lightColor="#00fdff"
            speed={6}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
            beamColor="#000000"
            backgroundColor="#000000"
          />
        </div>

        {/*
          LAYER 1 — Application shell (relative, z-index: 1)
          Allows Beams to show through translucent cards and gaps
        */}
        <div className="app-shell">
          <Navigation />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
