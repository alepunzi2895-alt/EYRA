import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config";

const ui = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-ui", display: "swap" });
const testo = Source_Serif_4({ subsets: ["latin"], variable: "--f-testo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { name, tagline } = await brand();
  return { title: name, description: tagline || "Assistente gestionale personale" };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14324b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${ui.variable} ${testo.variable}`}>
      <body>{children}</body>
    </html>
  );
}

