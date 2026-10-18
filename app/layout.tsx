import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Newsreader } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:4321";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Reasonable Doubt — a trial argued against a model",
  description:
    "A procedurally generated criminal case. Read the State's file, find the defects in its chain of proof, and argue it out in open court against a model prosecutor. A decision model scores every exchange.",
  openGraph: {
    title: "Reasonable Doubt",
    description:
      "Argue a procedurally generated criminal case in free text against a model prosecutor. A decision model scores every exchange.",
    images: [{ url: "/art/bench.jpg", width: 1376, height: 768 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#12100e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
