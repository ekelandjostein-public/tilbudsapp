// Første kontroll: uten innloggings-informasjonskapsel sendes du til /logg-inn.
// Dette er bare en snarvei for å gi en fin omdirigering. Selve sikkerheten ligger i
// krevBruker() i src/lib/innlogging.ts, som sjekker informasjonskapselen mot databasen.
import { NextResponse, type NextRequest } from "next/server";

const APNE_SIDER = ["/logg-inn"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (APNE_SIDER.includes(pathname)) return NextResponse.next();
  if (req.cookies.has("okt")) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/logg-inn";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Gjelder alt unntatt Next.js sine egne filer, ikoner og manifestet
  // (telefonen må kunne hente ikonet selv om du ikke er logget inn)
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|ico|svg|webmanifest)$).*)"],
};
