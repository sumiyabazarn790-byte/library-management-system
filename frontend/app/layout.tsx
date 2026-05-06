import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "../src/index.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aetheria - The Archive of Time",
  description: "A cinematic digital sanctuary of curated wisdom, manuscripts, and ideas across the centuries.",
  authors: [{ name: "Aetheria" }],
  icons: {
    icon: "/aetheria-mark.svg",
    shortcut: "/aetheria-mark.svg",
  },
  openGraph: {
    title: "Aetheria - The Archive of Time",
    description: "A cinematic digital sanctuary of curated wisdom, manuscripts, and ideas across the centuries.",
    type: "website",
    images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@Lovable",
    images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="overflow-x-hidden font-manrope antialiased min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
