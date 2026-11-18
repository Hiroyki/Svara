import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import Shell from "@/components/Shell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Svara",
  description: "Svara — a music player for the YouTube Music catalog.",
};

export const viewport: Viewport = {
  themeColor: "#0c0c0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-sans">
        {/* Suspense lets client routes read ?id= while still exporting as a static app (Android) */}
        <Suspense fallback={<div className="h-dvh bg-app" />}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
