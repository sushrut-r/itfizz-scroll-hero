import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Instrument Sans for display + body, JetBrains Mono for labels, numbers and
 * the instrument readouts. Both are variable fonts, so the page ships two files. */
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-tech",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ITFIZZ — dispatch operations for cloud kitchens",
  description:
    "ITFIZZ turns a kitchen's shift into a board your team can run: pickup points, courier handoffs and support calls on one timeline, with the weekly delta to prove it.",
  keywords: ["dispatch operations", "cloud kitchens", "delivery ops", "scroll animation"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
