// Prisagenten: lager et tilbudsutkast fra en befaring.
//
// Slik fungerer det:
//  1. Vi henter befaringen og firmaets timepris.
//  2. Vi plukker ut tidligere fakturaer som ligner (enkelt ordsøk). Med få fakturaer
//     sendes alle – Claude er flinkere enn et ordsøk til å se hva som faktisk ligner.
//  3. Claude får befaringen + fakturaene og fyller ut et fast skjema: hvilke fakturaer
//     den bygget på, tilbudslinjene, en begrunnelse og hva fagmannen bør dobbeltsjekke.
//  4. Vi kontrollerer svaret (timepris, tall som gir mening) og lagrer et UTKAST.
//     Ingenting sendes til kunden før fagmannen har godkjent (steg 5).

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import { claude, MODELL } from "@/lib/claude";
import { sumEksMva } from "@/lib/fakturaleser";

/** Så mange fakturaer sender vi til Claude på én gang. */
const MAKS_FAKTURAER = 40;

const Linje = z.object({
  type: z.enum(["ARBEID", "MATERIELL", "KJORING", "ANNET"]),
  beskrivelse: z.string().describe("slik den skal stå på tilbudet til kunden"),
  antall: z.number(),
  enhet: z.string().describe("time, stk, m, oppmøte …"),
  enhetspris: z.number().describe("kroner eks. mva per enhet"),
  kilde: z
    .string()
    .describe("fakturanummeret prisen/antallet er hentet fra, eller «skjønn» hvis anslått"),
});

const Utkast = z.object({
  lignendeFakturaer: z
    .array(z.object({ fakturanr: z.string(), hvorfor: z.string().describe("kort, én setning") }))
    .describe("de 1–4 fakturaene som ligner mest på jobben, mest lik først"),
  linjer: z.array(Linje),
  begrunnelse: z
    .string()
    .describe("2–4 setninger til fagmannen: hvordan prisen er satt og hva som skiller jobben fra de lignende"),
  forutsetninger: z
    .array(z.string())
    .describe("antakelser og ting fagmannen bør sjekke før tilbudet sendes, korte punkter"),
});

export type Prisutkast = z.infer<typeof Utkast>;
export type Grunnlag = Pick<Prisutkast, "lignendeFakturaer" | "forutsetninger">;

const INSTRUKS = `Du er prisagenten til en norsk elektrikerbedrift. Du lager et tilbudsutkast
ut fra en befaring, basert på bedriftens egne tidligere fakturaer.

Slik jobber du:
- Finn fakturaene som ligner mest på jobben i befaringen. Bruk antall timer, materiell og
  priser fra dem som utgangspunkt, og juster for forskjeller (størrelse, antall punkter o.l.).
- Arbeid prises alltid med firmaets timepris. Bruk enhet «time».
- Ta med kjøring/oppmøte slik bedriften pleier å fakturere det.
- Ta med dokumentasjon (samsvarserklæring o.l.) der tidligere fakturaer for samme type jobb har det.
- Materiell: bruk konkrete produkter og priser fra fakturaene når de passer. Ellers et
  realistisk anslag, merket «skjønn» som kilde.
- Ikke finn på ting kunden ikke har bedt om. Er noe uklart, gjør en fornuftig antakelse og
  skriv den under forutsetninger.
- Linjebeskrivelsene leses av kunden: korte, saklige og på norsk.
- Alle priser er eks. mva.`;

// --- Steg 2: finn kandidater ------------------------------------------------

const ord = (tekst: string) =>
  new Set(tekst.toLowerCase().split(/[^a-zæøå0-9]+/).filter((o) => o.length > 3));

/** Rangerer fakturaer etter hvor mange ord de deler med befaringen. */
function rangerEtterLikhet<T extends { arbeidsbeskrivelse: string; linjer: { beskrivelse: string }[] }>(
  befaring: string,
  fakturaer: T[]
): T[] {
  const b = ord(befaring);
  const poeng = (f: T) => {
    const fo = ord([f.arbeidsbeskrivelse, ...f.linjer.map((l) => l.beskrivelse)].join(" "));
    let n = 0;
    for (const o of b) if (fo.has(o)) n++;
    return n;
  };
  return fakturaer
    .map((f) => ({ f, p: poeng(f) }))
    .sort((a, c) => c.p - a.p)
    .map((x) => x.f);
}

const formaterFaktura = (f: {
  fakturanr: string | null;
  arbeidsbeskrivelse: string;
  totalEksMva: number;
  linjer: { type: string; beskrivelse: string; antall: number; enhet: string; enhetspris: number }[];
}) =>
  [
    `<faktura nr="${f.fakturanr ?? "?"}" total_eks_mva="${f.totalEksMva}">`,
    f.arbeidsbeskrivelse,
    ...f.linjer.map((l) => `- ${l.type} | ${l.beskrivelse} | ${l.antall} ${l.enhet} × ${l.enhetspris} kr`),
    "</faktura>",
  ].join("\n");

// --- Steg 3 og 4: spør Claude og lagre ---------------------------------------

/** Lager et tilbudsutkast for en befaring og lagrer det. Returnerer id-en til tilbudet. */
export async function lagTilbudsutkast(befaringId: number): Promise<number> {
  const befaring = await db.befaring.findUnique({ where: { id: befaringId } });
  if (!befaring) throw new Error("Fant ikke befaringen.");

  const firma = await db.firma.findFirst();
  if (!firma) throw new Error("Firmaet mangler – kjør «npx prisma db seed».");

  const alle = await db.faktura.findMany({ include: { linjer: true } });
  if (alle.length === 0)
    throw new Error("Ingen tidligere fakturaer lest inn ennå – prisagenten har ingenting å lære av.");
  const utvalg = rangerEtterLikhet(befaring.arbeidsbeskrivelse, alle).slice(0, MAKS_FAKTURAER);

  const svar = await claude.beta.messages.parse({
    model: MODELL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Utkast) },
    // Hvis modellen avslår forespørselen, prøver API-et automatisk en annen modell
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: INSTRUKS,
    messages: [
      {
        role: "user",
        content: [
          `<firma navn="${firma.navn}" timepris_eks_mva="${firma.timepris}" />`,
          `<tidligere_fakturaer>\n${utvalg.map(formaterFaktura).join("\n\n")}\n</tidligere_fakturaer>`,
          `<befaring dato="${befaring.dato.toISOString().slice(0, 10)}">\n${befaring.arbeidsbeskrivelse}\n</befaring>`,
          "Lag et tilbudsutkast for jobben i befaringen.",
        ].join("\n\n"),
      },
    ],
  });

  if (svar.stop_reason === "refusal") throw new Error("Claude ville ikke lage tilbud for denne jobben.");
  if (svar.stop_reason === "max_tokens") throw new Error("Svaret ble for langt – prøv igjen.");
  const utkast = svar.parsed_output;
  if (!utkast || utkast.linjer.length === 0) throw new Error("Fikk ikke et gyldig tilbudsutkast fra Claude.");

  const linjer = kontrollerLinjer(utkast.linjer, firma.timepris);

  const tilbud = await db.tilbud.create({
    data: {
      befaringId,
      begrunnelse: utkast.begrunnelse,
      grunnlag: JSON.stringify({
        lignendeFakturaer: utkast.lignendeFakturaer,
        forutsetninger: utkast.forutsetninger,
      } satisfies Grunnlag),
      linjer: {
        create: linjer.map(({ type, beskrivelse, antall, enhet, enhetspris }) => ({
          type, beskrivelse, antall, enhet, enhetspris,
        })),
      },
    },
  });
  return tilbud.id;
}

/**
 * Sikkerhetsnett: vi stoler ikke blindt på tallene fra Claude.
 * - Arbeid får alltid firmaets timepris.
 * - Linjer med 0 eller negative tall fjernes.
 * - Priser rundes til hele øre.
 */
export function kontrollerLinjer(linjer: Prisutkast["linjer"], timepris: number) {
  return linjer
    .filter((l) => l.antall > 0 && l.enhetspris >= 0 && l.beskrivelse.trim())
    .map((l) => ({
      ...l,
      enhetspris: l.type === "ARBEID" ? timepris : Math.round(l.enhetspris * 100) / 100,
    }));
}

/** Leser grunnlaget som er lagret på et tilbud. */
export function lesGrunnlag(tilbud: { grunnlag: string | null }): Grunnlag {
  try {
    return tilbud.grunnlag ? JSON.parse(tilbud.grunnlag) : { lignendeFakturaer: [], forutsetninger: [] };
  } catch {
    return { lignendeFakturaer: [], forutsetninger: [] };
  }
}

export { sumEksMva };
