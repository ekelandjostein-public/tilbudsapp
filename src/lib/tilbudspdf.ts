// Lager tilbudet som PDF (A4) med pdf-lib.
//
// pdf-lib tegner tekst på faste koordinater: (0,0) er nederst til venstre på siden,
// og 1 punkt = 1/72 tomme. Vi holder styr på «y» (hvor langt ned vi har kommet) og
// starter en ny side når det ikke er plass til mer.

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { kr } from "@/lib/tilbud";

export const GYLDIG_DAGER = 30;

export type PdfData = {
  nummer: number;
  dato: Date;
  erUtkast: boolean;
  firma: { navn: string; orgnr: string | null; adresse: string | null; telefon: string | null; epost: string | null; timepris: number };
  kunde: { navn: string; adresse: string; telefon: string | null; epost: string };
  linjer: { beskrivelse: string; antall: number; enhet: string; enhetspris: number }[];
};

export const gyldigTil = (dato: Date) => new Date(dato.getTime() + GYLDIG_DAGER * 86_400_000);
export const datoTekst = (d: Date) => d.toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "numeric" });

// A4 og marger
const BREDDE = 595.28;
const HOYDE = 841.89;
const MARG = 50;
const GRA = rgb(0.4, 0.4, 0.4);
const LINJEFARGE = rgb(0.8, 0.8, 0.8);

// Kolonner i linjetabellen: høyrekant for tallkolonnene
const KOL = { beskrivelse: MARG, antall: 350, enhet: 358, pris: 470, sum: BREDDE - MARG };
const BESKRIVELSE_BREDDE = 260;

export async function lagTilbudPdf(d: PdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Tilbud ${d.nummer} – ${d.firma.navn}`);
  pdf.setAuthor(d.firma.navn);
  const vanlig = await pdf.embedFont(StandardFonts.Helvetica);
  const fet = await pdf.embedFont(StandardFonts.HelveticaBold);

  let side = pdf.addPage([BREDDE, HOYDE]);
  let y = HOYDE - MARG;

  // Små hjelpere ---------------------------------------------------------------
  const tekst = (t: string, x: number, str = 10, font: PDFFont = vanlig, farge = rgb(0, 0, 0), s: PDFPage = side) =>
    s.drawText(rens(t, font), { x, y, size: str, font, color: farge });
  const hoyre = (t: string, xHoyre: number, str = 10, font: PDFFont = vanlig) =>
    tekst(t, xHoyre - font.widthOfTextAtSize(rens(t, font), str), str, font);
  const strek = () =>
    side.drawLine({ start: { x: MARG, y }, end: { x: BREDDE - MARG, y }, thickness: 0.5, color: LINJEFARGE });
  const nySideVedBehov = (trenger: number) => {
    if (y - trenger > MARG + 30) return false;
    side = pdf.addPage([BREDDE, HOYDE]);
    y = HOYDE - MARG;
    return true;
  };

  // Topp: firma til venstre, tilbudsinfo til høyre ----------------------------
  tekst(d.firma.navn, MARG, 18, fet);
  hoyre(d.erUtkast ? "TILBUD (UTKAST)" : "TILBUD", BREDDE - MARG, 18, fet);
  y -= 18;
  const firmalinjer = [d.firma.adresse, d.firma.telefon && `Tlf. ${d.firma.telefon}`, d.firma.epost, d.firma.orgnr && `Org.nr. ${d.firma.orgnr}`]
    .filter((x): x is string => !!x);
  const infolinjer: [string, string][] = [
    ["Tilbudsnr.", String(d.nummer)],
    ["Dato", datoTekst(d.dato)],
    ["Gyldig til", datoTekst(gyldigTil(d.dato))],
  ];
  for (let i = 0; i < Math.max(firmalinjer.length, infolinjer.length); i++) {
    if (firmalinjer[i]) tekst(firmalinjer[i], MARG, 9, vanlig, GRA);
    if (infolinjer[i]) {
      tekst(infolinjer[i][0], 400, 9, vanlig, GRA);
      hoyre(infolinjer[i][1], BREDDE - MARG, 9);
    }
    y -= 13;
  }

  // Kunde ----------------------------------------------------------------------
  y -= 20;
  tekst("TIL", MARG, 8, fet, GRA);
  y -= 14;
  for (const l of [d.kunde.navn, d.kunde.adresse, d.kunde.epost, d.kunde.telefon].filter((x): x is string => !!x)) {
    tekst(l, MARG, 10, l === d.kunde.navn ? fet : vanlig);
    y -= 14;
  }

  // Linjetabell ------------------------------------------------------------------
  const tabellhode = () => {
    tekst("Beskrivelse", KOL.beskrivelse, 8, fet, GRA);
    hoyre("Antall", KOL.antall, 8, fet);
    tekst("Enhet", KOL.enhet, 8, fet, GRA);
    hoyre("Pris", KOL.pris, 8, fet);
    hoyre("Sum", KOL.sum, 8, fet);
    y -= 6;
    strek();
    y -= 14;
  };
  y -= 20;
  tabellhode();

  for (const l of d.linjer) {
    const rader = brytLinjer(rens(l.beskrivelse, vanlig), vanlig, 10, BESKRIVELSE_BREDDE);
    if (nySideVedBehov(rader.length * 13 + 8)) tabellhode();
    const topp = y;
    for (const r of rader) {
      tekst(r, KOL.beskrivelse, 10);
      y -= 13;
    }
    const bunn = y;
    y = topp;
    hoyre(tallTekst(l.antall), KOL.antall);
    tekst(l.enhet, KOL.enhet, 10);
    hoyre(kr(l.enhetspris), KOL.pris);
    hoyre(kr(l.antall * l.enhetspris), KOL.sum);
    y = bunn - 2;
    strek();
    y -= 14;
  }

  // Summer -----------------------------------------------------------------------
  const sum = Math.round(d.linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0) * 100) / 100;
  const mva = Math.round(sum * 25) / 100;
  nySideVedBehov(60);
  y -= 4;
  for (const [navn, belop, font, str] of [
    ["Sum eks. mva", sum, vanlig, 10],
    ["Mva 25 %", mva, vanlig, 10],
    ["Totalt inkl. mva (NOK)", sum + mva, fet, 12],
  ] as const) {
    tekst(navn, 310, str, font);
    hoyre(kr(belop), KOL.sum, str, font);
    y -= str + 6;
  }

  // Vilkår -------------------------------------------------------------------------
  const vilkar = [
    `Tilbudet gjelder i ${GYLDIG_DAGER} dager fra tilbudsdato.`,
    `Arbeid utover det som er beskrevet faktureres etter medgått tid à ${kr(d.firma.timepris)} kr eks. mva per time, etter avtale med deg.`,
    "Materiell kan avvike noe dersom forholdene på stedet er annerledes enn antatt på befaringen.",
    "Svar på e-posten for å akseptere tilbudet.",
  ];
  y -= 20;
  nySideVedBehov(80);
  tekst("Vilkår", MARG, 9, fet);
  y -= 13;
  for (const v of vilkar) {
    for (const r of brytLinjer(rens(v, vanlig), vanlig, 9, BREDDE - 2 * MARG)) {
      nySideVedBehov(12);
      tekst(r, MARG, 9, vanlig, GRA);
      y -= 12;
    }
  }

  // Bunntekst og sidetall på alle sider ----------------------------------------------
  const sider = pdf.getPages();
  sider.forEach((s, i) => {
    const bunntekst = [d.firma.navn, d.firma.orgnr && `Org.nr. ${d.firma.orgnr}`, `Side ${i + 1} av ${sider.length}`]
      .filter(Boolean)
      .join("  ·  ");
    s.drawText(rens(bunntekst, vanlig), {
      x: (BREDDE - vanlig.widthOfTextAtSize(rens(bunntekst, vanlig), 8)) / 2,
      y: MARG / 2,
      size: 8,
      font: vanlig,
      color: GRA,
    });
    if (d.erUtkast)
      s.drawText("UTKAST", { x: 150, y: 350, size: 90, font: fet, color: rgb(0.9, 0.9, 0.9), opacity: 0.5, rotate: degrees(35) });
  });

  return pdf.save();
}

/** 2.5 → «2,5» */
const tallTekst = (n: number) => n.toLocaleString("nb-NO", { maximumFractionDigits: 2 });

/**
 * Standardfontene i PDF kan bare tegne vesteuropeiske tegn (æøå går fint).
 * Andre tegn (f.eks. emoji) fjernes, ellers krasjer pdf-lib.
 */
function rens(t: string, font: PDFFont): string {
  return Array.from(t.replace(/[\r\n\t]+/g, " "))
    .map((tegn) => {
      try {
        font.encodeText(tegn);
        return tegn;
      } catch {
        return "";
      }
    })
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Deler en tekst i linjer som får plass innenfor gitt bredde. */
function brytLinjer(t: string, font: PDFFont, str: number, bredde: number): string[] {
  const linjer: string[] = [];
  let naa = "";
  for (const ord of t.split(" ")) {
    const forsok = naa ? `${naa} ${ord}` : ord;
    if (font.widthOfTextAtSize(forsok, str) <= bredde || !naa) naa = forsok;
    else {
      linjer.push(naa);
      naa = ord;
    }
  }
  if (naa) linjer.push(naa);
  return linjer.length ? linjer : [""];
}
