import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "StewardBridge — Connecting People to Opportunity, Nationwide",
    template: "%s | StewardBridge",
  },
  description:
    "StewardBridge is a Nigeria-based, nationwide workforce and recruitment platform connecting capable people with businesses that need them — across hospitality, healthcare, logistics, facilities and more.",
  metadataBase: new URL("https://stewardbridge.com"),
  openGraph: {
    title: "StewardBridge — Connecting People to Opportunity, Nationwide",
    description:
      "Find work or find workers. StewardBridge is the bridge between capable people and the businesses that need them.",
    type: "website",
    siteName: "StewardBridge",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-[#f7f8f6] text-brand-950 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
