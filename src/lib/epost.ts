// E-posten som skal følge tilbudet. Foreløpig bare et utkast som vises på skjermen –
// selve sendingen kobles på senere.
import { kr } from "@/lib/tilbud";
import { datoTekst, gyldigTil } from "@/lib/tilbudspdf";

export type Epostutkast = {
  fra: string | null;
  til: string;
  emne: string;
  tekst: string;
  vedlegg: string; // filnavn på PDF-en
};

export function lagEpostutkast(d: {
  nummer: number;
  dato: Date;
  totalInklMva: number;
  firma: { navn: string; epost: string | null; telefon: string | null };
  kunde: { navn: string; epost: string };
}): Epostutkast {
  const fornavn = d.kunde.navn.trim().split(/\s+/)[0];
  const kontakt = [d.firma.telefon && `Tlf. ${d.firma.telefon}`, d.firma.epost].filter(Boolean).join(" · ");

  return {
    fra: d.firma.epost,
    til: d.kunde.epost,
    emne: `Tilbud ${d.nummer} fra ${d.firma.navn}`,
    vedlegg: pdfFilnavn(d.nummer),
    tekst: [
      `Hei ${fornavn},`,
      "",
      "Takk for at vi fikk komme på befaring. Vedlagt finner du tilbudet vårt på jobben.",
      "",
      `Totalpris: ${kr(d.totalInklMva)} kr inkl. mva.`,
      `Tilbudet gjelder til ${datoTekst(gyldigTil(d.dato))}.`,
      "",
      "Ønsker du å gå videre, er det bare å svare på denne e-posten, så finner vi et tidspunkt som passer. Ta gjerne kontakt hvis du har spørsmål.",
      "",
      "Med vennlig hilsen",
      d.firma.navn,
      ...(kontakt ? [kontakt] : []),
    ].join("\n"),
  };
}

export const pdfFilnavn = (nummer: number) => `Tilbud-${nummer}.pdf`;
