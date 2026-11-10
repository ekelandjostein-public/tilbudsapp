"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { krevBruker } from "@/lib/innlogging";
import { lagTilbudsutkast } from "@/lib/prisagent";
import { TilbudslinjerSkjema } from "@/lib/tilbud";
import { hentTilbudsdokument } from "@/lib/tilbudsdokument";
import { sendEpost, testadresse } from "@/lib/sending";

// --- Generer (steg 4) --------------------------------------------------------

export type GenererTilstand = { feil?: string };

export async function genererTilbud(
  befaringId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _forrige: GenererTilstand
): Promise<GenererTilstand> {
  await krevBruker();
  let tilbudId: number;
  try {
    tilbudId = await lagTilbudsutkast(befaringId);
  } catch (e) {
    return { feil: e instanceof Error ? e.message : "Noe gikk galt" };
  }
  redirect(`/tilbud/${tilbudId}`);
}

// --- Lagre / godkjenne (steg 5) ---------------------------------------------

export type RedigerTilstand = {
  feil?: string;
  linjefeil?: Record<number, string>; // linjenummer → feilmelding
  lagret?: number; // tidspunkt, så skjermen kan vise «Lagret»
};

/**
 * Lagrer linjene fra godkjenningsskjermen.
 * Knappen som ble trykket («lagre» eller «godkjenn») sendes med som «handling».
 */
export async function lagreTilbud(
  tilbudId: number,
  _forrige: RedigerTilstand,
  formData: FormData
): Promise<RedigerTilstand> {
  const bruker = await krevBruker();
  const tilbud = await db.tilbud.findUnique({ where: { id: tilbudId } });
  if (!tilbud) return { feil: "Fant ikke tilbudet." };
  if (tilbud.status !== "UTKAST")
    return { feil: "Tilbudet er allerede godkjent. Gjør det om til utkast for å endre det." };

  let data: unknown;
  try {
    data = JSON.parse(String(formData.get("linjer")));
  } catch {
    return { feil: "Kunne ikke lese linjene." };
  }

  // Sjekk alle linjene mot reglene i src/lib/tilbud.ts
  const res = TilbudslinjerSkjema.safeParse(data);
  if (!res.success) {
    const linjefeil: Record<number, string> = {};
    let feil: string | undefined;
    for (const f of res.error.issues) {
      if (typeof f.path[0] === "number") linjefeil[f.path[0]] ??= f.message;
      else feil = f.message;
    }
    return { feil: feil ?? "Rett feilene i linjene som er merket med rødt.", linjefeil };
  }

  const godkjenn = formData.get("handling") === "godkjenn";

  // Bytt ut alle linjene i én operasjon, så vi aldri ender med et halvt lagret tilbud
  await db.$transaction([
    db.tilbudslinje.deleteMany({ where: { tilbudId } }),
    db.tilbud.update({
      where: { id: tilbudId },
      data: {
        status: godkjenn ? "GODKJENT" : "UTKAST",
        godkjent: godkjenn ? new Date() : null,
        godkjentAvId: godkjenn ? bruker.id : null,
        linjer: { create: res.data },
      },
    }),
  ]);

  revalidatePath(`/tilbud/${tilbudId}`);
  revalidatePath(`/befaring/${tilbud.befaringId}`);
  return { lagret: Date.now() };
}

/** Angrer godkjenningen så tilbudet kan endres igjen (bare før det er sendt). */
export async function gjorOmTilUtkast(tilbudId: number) {
  await krevBruker();
  const tilbud = await db.tilbud.findUnique({ where: { id: tilbudId } });
  if (tilbud?.status !== "GODKJENT") return;
  await db.tilbud.update({ where: { id: tilbudId }, data: { status: "UTKAST", godkjent: null, godkjentAvId: null } });
  revalidatePath(`/tilbud/${tilbudId}`);
  revalidatePath(`/befaring/${tilbud.befaringId}`);
}

// --- Testsending (steg 6) ----------------------------------------------------

export type TestsendingTilstand = { feil?: string; sendtTil?: string };

/**
 * Sender tilbudet (e-post + PDF) til fagmannens egen testadresse, IKKE til kunden.
 * Statusen på tilbudet endres ikke.
 */
export async function sendTestTilMeg(tilbudId: number): Promise<TestsendingTilstand> {
  await krevBruker();
  const til = testadresse();
  if (!til) return { feil: "TEST_EPOST mangler i innstillingene (.env)." };

  const dok = await hentTilbudsdokument(tilbudId);
  if (!dok) return { feil: "Fant ikke tilbudet." };
  if (dok.tilbud.status !== "GODKJENT") return { feil: "Tilbudet må være godkjent først." };

  const { epost } = dok;
  try {
    await sendEpost({
      avsendernavn: (await db.firma.findFirst())?.navn ?? "Tilbudsapp",
      til,
      emne: `[TEST] ${epost.emne}`,
      tekst:
        `--- TEST: Denne e-posten ville gått til ${epost.til} ---\n\n` + epost.tekst,
      svarTil: epost.fra,
      vedlegg: [{ filnavn: epost.vedlegg, innhold: await dok.lagPdf() }],
    });
  } catch (e) {
    return { feil: e instanceof Error ? e.message : "Sendingen feilet." };
  }
  return { sendtTil: til };
}
