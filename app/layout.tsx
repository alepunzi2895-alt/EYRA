import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config";

const ui = Montserrat({ subsets: ["latin"], variable: "--f-ui", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { name, tagline } = await brand();
  return { title: name, description: tagline || "Assistente gestionale personale" };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14324b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={ui.variable}>
      <body>{children}</body>
    </html>
  );
}
