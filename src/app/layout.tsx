import type { Metadata } from "next";
import { Space_Grotesk, Archivo_Black } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Nefesh — игровой портал",
  description: "Единый центр MMO-сообщества: форум, аукцион, база знаний, профили персонажей и калькулятор билдов.",
  keywords: ["Nefesh", "MMO", "игровой портал", "форум", "аукцион", "база знаний", "билды"],
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.svg` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${archivoBlack.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
