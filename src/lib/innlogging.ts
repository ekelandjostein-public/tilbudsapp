// Innlogging: hvem er brukeren som gjør denne forespørselen?
//
// Ved innlogging får nettleseren en lang, tilfeldig nøkkel i informasjonskapselen «okt».
// I databasen lagrer vi bare SHA-256 av nøkkelen, så en som får tak i databasen ikke
// kan bruke den til å logge inn.
//
// VIKTIG: Alle sider, server actions og ruter som viser eller endrer data, må kalle
// krevBruker() (eller krevAdmin()). Det holder ikke at en knapp er skjult.
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

export const OKT_COOKIE = "okt";
const OKT_DAGER = 30;

const fingeravtrykk = (nokkel: string) => createHash("sha256").update(nokkel).digest("hex");

/** Starter en innlogging for brukeren og setter informasjonskapselen. */
export async function startOkt(brukerId: number) {
  const nokkel = randomBytes(32).toString("base64url");
  const utloper = new Date(Date.now() + OKT_DAGER * 86_400_000);
  await db.okt.create({ data: { id: fingeravtrykk(nokkel), brukerId, utloper } });
  // Rydd bort gamle, utløpte innlogginger
  await db.okt.deleteMany({ where: { utloper: { lt: new Date() } } });
  (await cookies()).set(OKT_COOKIE, nokkel, {
    httpOnly: true, // JavaScript i nettleseren kan ikke lese den
    secure: process.env.NODE_ENV === "production", // bare over https når appen er på nett
    sameSite: "lax",
    path: "/",
    expires: utloper,
  });
}

/** Logger ut: sletter innloggingen både i databasen og i nettleseren. */
export async function avsluttOkt() {
  const jar = await cookies();
  const nokkel = jar.get(OKT_COOKIE)?.value;
  if (nokkel) await db.okt.deleteMany({ where: { id: fingeravtrykk(nokkel) } });
  jar.delete(OKT_COOKIE);
}

/** Den innloggede brukeren, eller null. (cache: slås opp én gang per forespørsel.) */
export const hentBruker = cache(async () => {
  const nokkel = (await cookies()).get(OKT_COOKIE)?.value;
  if (!nokkel) return null;
  const okt = await db.okt.findUnique({
    where: { id: fingeravtrykk(nokkel) },
    include: {
      bruker: { select: { id: true, navn: true, epost: true, rolle: true, firmaId: true } },
    },
  });
  if (!okt || okt.utloper < new Date()) return null;
  return okt.bruker; // passordhashen hentes aldri ut her
});

export type InnloggetBruker = NonNullable<Awaited<ReturnType<typeof hentBruker>>>;

/** Krever innlogging. Sender til innloggingssiden hvis ikke. */
export async function krevBruker(): Promise<InnloggetBruker> {
  const bruker = await hentBruker();
  if (!bruker) redirect("/logg-inn");
  return bruker;
}

/** Krever at brukeren er administrator. */
export async function krevAdmin(): Promise<InnloggetBruker> {
  const bruker = await krevBruker();
  if (bruker.rolle !== "ADMIN") redirect("/");
  return bruker;
}

/** Logger ut brukeren alle andre steder (f.eks. etter passordbytte). */
export async function avsluttAndreOkter(brukerId: number) {
  const nokkel = (await cookies()).get(OKT_COOKIE)?.value;
  await db.okt.deleteMany({
    where: { brukerId, ...(nokkel ? { NOT: { id: fingeravtrykk(nokkel) } } : {}) },
  });
}
