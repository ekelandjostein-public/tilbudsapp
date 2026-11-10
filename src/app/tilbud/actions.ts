"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lagTilbudsutkast } from "@/lib/prisagent";
import { TilbudslinjerSkjema } from "@/lib/tilbud";

// --- Generer (steg 4) --------------------------------------------------------

export type GenererTilstand = { feil?: string };

export async function genererTilbud(
  befaringId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _forrige: GenererTilstand
): Promise<GenererTilstand> {
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
  const tilbud = await db.tilbud.findUnique({ where: { id: tilbudId } });
  if (tilbud?.status !== "GODKJENT") return;
  await db.tilbud.update({ where: { id: tilbudId }, data: { status: "UTKAST" } });
  revalidatePath(`/tilbud/${tilbudId}`);
  revalidatePath(`/befaring/${tilbud.befaringId}`);
}
