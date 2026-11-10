"use server";
// Administrasjon av brukere. Bare administratorer slipper til (krevAdmin).
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { krevAdmin } from "@/lib/innlogging";
import { hashPassord, lagMidlertidigPassord } from "@/lib/passord";
import { nullstillForsok } from "@/lib/forsok";

export type BrukerTilstand = {
  feil?: string;
  // Det midlertidige passordet vises én gang, så admin kan gi det videre
  nyttPassord?: { navn: string; epost: string; passord: string };
};

export async function leggTilBruker(
  _forrige: BrukerTilstand,
  formData: FormData
): Promise<BrukerTilstand> {
  const admin = await krevAdmin();
  const navn = String(formData.get("navn") ?? "").trim();
  const epost = String(formData.get("epost") ?? "").trim().toLowerCase();
  const rolle = formData.get("rolle") === "ADMIN" ? "ADMIN" : "ANSATT";

  if (!navn) return { feil: "Skriv inn navn" };
  if (!/^\S+@\S+\.\S+$/.test(epost)) return { feil: "Skriv inn en gyldig e-postadresse" };
  if (await db.bruker.findUnique({ where: { epost } }))
    return { feil: "Det finnes allerede en bruker med den e-postadressen" };

  const passord = lagMidlertidigPassord();
  await db.bruker.create({
    data: { navn, epost, rolle, firmaId: admin.firmaId, passordHash: await hashPassord(passord) },
  });
  revalidatePath("/brukere");
  return { nyttPassord: { navn, epost, passord } };
}

/** Lager et nytt midlertidig passord for en bruker som har glemt sitt. */
export async function nyttPassordFor(brukerId: number): Promise<BrukerTilstand> {
  const admin = await krevAdmin();
  const bruker = await db.bruker.findFirst({ where: { id: brukerId, firmaId: admin.firmaId } });
  if (!bruker) return { feil: "Fant ikke brukeren" };

  const passord = lagMidlertidigPassord();
  await db.$transaction([
    db.bruker.update({ where: { id: bruker.id }, data: { passordHash: await hashPassord(passord) } }),
    db.okt.deleteMany({ where: { brukerId: bruker.id } }), // logg ut overalt
  ]);
  nullstillForsok(bruker.epost); // opphev eventuell sperre etter mange feil
  return { nyttPassord: { navn: bruker.navn, epost: bruker.epost, passord } };
}

export async function fjernBruker(brukerId: number): Promise<BrukerTilstand> {
  const admin = await krevAdmin();
  if (brukerId === admin.id) return { feil: "Du kan ikke fjerne deg selv" };
  const bruker = await db.bruker.findFirst({ where: { id: brukerId, firmaId: admin.firmaId } });
  if (!bruker) return { feil: "Fant ikke brukeren" };

  // Befaringer og tilbud blir liggende; navnet på hvem som laget dem forsvinner.
  await db.bruker.delete({ where: { id: bruker.id } });
  revalidatePath("/brukere");
  return {};
}
