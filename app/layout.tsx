import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";

import { SiteChrome } from "@/components/site-chrome";
import { APP_NAME } from "@/lib/brand";
import { DocumentProvider } from "@/lib/store";

import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-grotesk",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Pantex document change review — UI wireframe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen font-sans">
        <DocumentProvider>
          <SiteChrome>{children}</SiteChrome>
        </DocumentProvider>
      </body>
    </html>
  );
}
