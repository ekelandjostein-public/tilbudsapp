"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { avsluttOkt, startOkt } from "@/lib/innlogging";
import { sjekkPassord } from "@/lib/passord";
import { forMangeForsok, nullstillForsok, registrerFeil } from "@/lib/forsok";

export type InnloggingTilstand = { feil?: string; epost?: string };

// Brukes når e-posten ikke finnes, så svaret tar like lang tid som med feil passord
const DUMMY_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export async function loggInn(
  _forrige: InnloggingTilstand,
  formData: FormData
): Promise<InnloggingTilstand> {
  const epost = String(formData.get("epost") ?? "").trim().toLowerCase();
  const passord = String(formData.get("passord") ?? "");
  if (!epost || !passord) return { feil: "Skriv inn e-post og passord", epost };

  if (forMangeForsok(epost))
    return { feil: "For mange forsøk. Vent 15 minutter og prøv igjen.", epost };

  const bruker = await db.bruker.findUnique({ where: { epost } });
  const riktig = await sjekkPassord(passord, bruker?.passordHash ?? DUMMY_HASH);
  if (!bruker || !riktig) {
    registrerFeil(epost);
    // Samme melding uansett, så ingen kan finne ut hvilke e-poster som har konto
    return { feil: "Feil e-post eller passord", epost };
  }

  nullstillForsok(epost);
  await startOkt(bruker.id);
  redirect("/");
}

export async function loggUt() {
  await avsluttOkt();
  redirect("/logg-inn");
}
