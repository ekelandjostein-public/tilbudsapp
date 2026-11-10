// Henter alt som trengs for å lage PDF og e-post for ett tilbud.
// Brukes både av PDF-lenken og av sendingen, så de alltid viser det samme.
import { db } from "@/lib/db";
import { lagTilbudPdf } from "@/lib/tilbudspdf";
import { lagEpostutkast } from "@/lib/epost";
import { sumEksMva } from "@/lib/fakturaleser";

export async function hentTilbudsdokument(tilbudId: number) {
  const tilbud = await db.tilbud.findUnique({
    where: { id: tilbudId },
    include: { linjer: { orderBy: { id: "asc" } }, befaring: { include: { kunde: true } } },
  });
  const firma = await db.firma.findFirst();
  if (!tilbud || !firma) return null;

  const dato = tilbud.godkjent ?? new Date();
  const kunde = tilbud.befaring.kunde;
  return {
    tilbud,
    lagPdf: () =>
      lagTilbudPdf({
        nummer: tilbud.id,
        dato,
        erUtkast: tilbud.status === "UTKAST",
        firma,
        kunde,
        linjer: tilbud.linjer,
      }),
    epost: lagEpostutkast({
      nummer: tilbud.id,
      dato,
      totalInklMva: Math.round(sumEksMva(tilbud.linjer) * 125) / 100,
      firma,
      kunde,
    }),
  };
}
