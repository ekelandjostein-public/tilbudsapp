import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { hentBruker } from "@/lib/innlogging";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bruker = await hentBruker();
  return (
    <html lang="nb">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {bruker && (
          <nav className="border-b bg-gray-50">
            <div className="mx-auto flex max-w-md items-center gap-4 px-6 py-2 text-sm">
              <Link href="/" className="font-semibold">Tilbudsapp</Link>
              {bruker.rolle === "ADMIN" && (
                <Link href="/brukere" className="ml-auto text-gray-600">Brukere</Link>
              )}
              <Link
                href="/konto"
                className={`${bruker.rolle === "ADMIN" ? "" : "ml-auto "}text-gray-600`}
              >
                👤 {bruker.navn.split(" ")[0]}
              </Link>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
