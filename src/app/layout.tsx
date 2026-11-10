import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { db } from "@/lib/db";
import { hentBruker } from "@/lib/innlogging";
import { Monogram } from "@/components/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tilbudsapp",
  description: "Fra befaring til tilbud",
};

export const viewport: Viewport = {
  themeColor: "#f6f5f1",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bruker = await hentBruker();
  const firma = bruker ? await db.firma.findFirst() : null;
  const firmanavn = firma?.navn ?? "Tilbudsapp";

  return (
    <html lang="nb">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {bruker && (
          <nav className="sticky top-0 z-20 border-b border-zinc-200/70 bg-papir/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-3 px-5">
              <Link href="/" className="flex min-w-0 items-center gap-2.5">
                <Monogram navn={firmanavn} />
                <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {firmanavn}
                </span>
              </Link>
              <div className="ml-auto flex items-center gap-1 text-sm">
                {bruker.rolle === "ADMIN" && (
                  <Link href="/brukere" className="knapp knapp-stille">
                    Brukere
                  </Link>
                )}
                <Link
                  href="/konto"
                  className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-zinc-600 transition hover:bg-zinc-900/5 hover:text-zinc-900"
                  title="Min konto"
                >
                  <span className="hidden sm:inline">{bruker.navn.split(" ")[0]}</span>
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
                    {bruker.navn.trim()[0]?.toUpperCase()}
                  </span>
                </Link>
              </div>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
