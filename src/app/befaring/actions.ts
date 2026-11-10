"use server";
// "Server actions": kode som kjører på serveren når skjemaet sendes inn.

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export type SkjemaTilstand = {
  feil?: Record<string, string>;
  verdier?: Record<string, string>;
};

export async function opprettBefaring(
  _forrige: SkjemaTilstand,
  formData: FormData
): Promise<SkjemaTilstand> {
  const felt = (navn: string) => String(formData.get(navn) ?? "").trim();

  const verdier = {
    navn: felt("navn"),
    adresse: felt("adresse"),
    telefon: felt("telefon"),
    epost: felt("epost"),
    dato: felt("dato"),
    arbeidsbeskrivelse: felt("arbeidsbeskrivelse"),
  };

  // Sjekk at det viktigste er fylt inn riktig
  const feil: Record<string, string> = {};
  if (!verdier.navn) feil.navn = "Skriv inn kundens navn";
  if (!verdier.adresse) feil.adresse = "Skriv inn adressen";
  if (!/^\S+@\S+\.\S+$/.test(verdier.epost))
    feil.epost = "Skriv inn en gyldig e-postadresse (tilbudet sendes hit)";
  if (verdier.telefon && !/^[+\d][\d\s]{7,}$/.test(verdier.telefon))
    feil.telefon = "Ugyldig telefonnummer";
  if (!verdier.dato) feil.dato = "Velg dato";
  if (verdier.arbeidsbeskrivelse.length < 10)
    feil.arbeidsbeskrivelse =
      "Beskriv jobben litt mer – agenten trenger dette for å lage prisforslag";

  if (Object.keys(feil).length > 0) return { feil, verdier };

  // Lagre kunde og befaring i databasen
  const befaring = await db.befaring.create({
    data: {
      dato: new Date(verdier.dato),
      arbeidsbeskrivelse: verdier.arbeidsbeskrivelse,
      kunde: {
        create: {
          navn: verdier.navn,
          adresse: verdier.adresse,
          telefon: verdier.telefon || null,
          epost: verdier.epost,
        },
      },
    },
  });

  redirect(`/befaring/${befaring.id}`);
}
