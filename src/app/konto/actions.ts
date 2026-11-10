"use server";
import { db } from "@/lib/db";
import { avsluttAndreOkter, krevBruker } from "@/lib/innlogging";
import { hashPassord, passordFeil, sjekkPassord } from "@/lib/passord";

export type PassordTilstand = { feil?: string; ok?: boolean };

export async function byttPassord(
  _forrige: PassordTilstand,
  formData: FormData
): Promise<PassordTilstand> {
  const bruker = await krevBruker();
  const naa = String(formData.get("naa") ?? "");
  const nytt = String(formData.get("nytt") ?? "");
  const gjenta = String(formData.get("gjenta") ?? "");

  const lagret = await db.bruker.findUniqueOrThrow({ where: { id: bruker.id } });
  if (!(await sjekkPassord(naa, lagret.passordHash))) return { feil: "Nåværende passord er feil" };
  const feil = passordFeil(nytt);
  if (feil) return { feil };
  if (nytt !== gjenta) return { feil: "De to nye passordene er ikke like" };

  await db.bruker.update({ where: { id: bruker.id }, data: { passordHash: await hashPassord(nytt) } });
  await avsluttAndreOkter(bruker.id); // logg ut på andre enheter
  return { ok: true };
}
