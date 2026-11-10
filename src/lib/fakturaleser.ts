// Fakturaleseren: sender en PDF til Claude og får tilbake strukturerte data.
//
// Slik fungerer det:
//  1. PDF-en sendes til Claude som et dokument.
//  2. Vi beskriver nøyaktig hvilket format svaret skal ha (et "skjema" laget med zod).
//  3. Claude leser alle fakturaene i PDF-en og fyller ut skjemaet.
//  4. Vi REGNER UT totalen selv fra linjene, i stedet for å stole på summen i PDF-en,
//     og lagrer alt i databasen.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import { claudeFeil } from "@/lib/claudeFeil";

const Linje = z.object({
  type: z
    .enum(["ARBEID", "MATERIELL", "KJORING", "ANNET"])
    .describe("ARBEID = timer, MATERIELL = produkter/kabel, KJORING = servicebil/oppmøte, ANNET = dokumentasjon o.l."),
  beskrivelse: z.string(),
  antall: z.number(),
  enhet: z.string().describe("f.eks. time, stk, m, oppmøte"),
  enhetspris: z.number().describe("pris per enhet eks. mva, i kroner"),
});

const Faktura = z.object({
  fakturanr: z.string().nullable(),
  dato: z.string().nullable().describe("fakturadato i formatet ÅÅÅÅ-MM-DD"),
  kundenavn: z.string().nullable(),
  sted: z.string().nullable(),
  arbeidsbeskrivelse: z
    .string()
    .describe("kort beskrivelse av selve jobben, 1 setning, slik en fagmann ville sagt det"),
  linjer: z.array(Linje),
  oppgittSumInklMva: z
    .number()
    .nullable()
    .describe("«Å betale inkl. mva» hvis den står tydelig knyttet til DENNE fakturaen, ellers null"),
});

const Svar = z.object({ fakturaer: z.array(Faktura) });

export type LestFaktura = z.infer<typeof Faktura>;

const INSTRUKS = `Du leser fakturaer fra en norsk håndverksbedrift (elektriker/rørlegger).
En PDF kan inneholde flere fakturaer. Hent ut hver faktura for seg med alle linjene.
Tall skrives på norsk med komma som desimaltegn og mellomrom som tusenskille: «1 250,00» = 1250.
Beskrivelser kan gå over to linjer i PDF-en – slå dem sammen.
Vær forsiktig med «Å betale»-summer: en sum nederst på en side hører ikke nødvendigvis til alle fakturaene på siden.`;

// Lages først når den trengs, så appen kan starte selv om nøkkelen mangler
let _client: Anthropic | undefined;
const client = () => (_client ??= new Anthropic());

/** Leser alle fakturaene i én PDF med Claude. */
export async function lesFakturaPdf(pdf: Buffer): Promise<LestFaktura[]> {
  let svar;
  try {
    svar = await client().beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(Svar) },
      // Hvis modellen avslår forespørselen, prøver API-et automatisk en annen modell
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: INSTRUKS,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") },
            },
            { type: "text", text: "Hent ut alle fakturaene i dette dokumentet." },
          ],
        },
      ],
    });
  } catch (e) {
    throw claudeFeil(e);
  }

  if (svar.stop_reason === "refusal") throw new Error("Claude ville ikke lese dokumentet.");
  if (svar.stop_reason === "max_tokens") throw new Error("Dokumentet var for langt – del det opp.");
  if (!svar.parsed_output) throw new Error("Fikk ikke et gyldig svar fra Claude.");

  return svar.parsed_output.fakturaer;
}

/** Regner ut sum eks. mva fra linjene (rundet til hele øre). */
export function sumEksMva(linjer: { antall: number; enhetspris: number }[]) {
  return Math.round(linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0) * 100) / 100;
}

export type ImportResultat = {
  lagret: number;
  hoppetOver: string[]; // fakturanumre som fantes fra før
  avvik: string[];      // fakturaer der oppgitt sum ikke stemmer med linjene
};

/** Leser en PDF og lagrer fakturaene i databasen. */
export async function importerFakturaPdf(pdf: Buffer, filnavn: string): Promise<ImportResultat> {
  const fakturaer = await lesFakturaPdf(pdf);
  const res: ImportResultat = { lagret: 0, hoppetOver: [], avvik: [] };

  for (const f of fakturaer) {
    if (f.fakturanr && (await db.faktura.findFirst({ where: { fakturanr: f.fakturanr } }))) {
      res.hoppetOver.push(f.fakturanr);
      continue;
    }

    const total = sumEksMva(f.linjer);
    if (f.oppgittSumInklMva != null && Math.abs(total * 1.25 - f.oppgittSumInklMva) > 1) {
      res.avvik.push(
        `Faktura ${f.fakturanr ?? "?"}: linjene gir ${(total * 1.25).toFixed(2)} inkl. mva, PDF-en sier ${f.oppgittSumInklMva.toFixed(2)}`
      );
    }

    await db.faktura.create({
      data: {
        fakturanr: f.fakturanr,
        dato: f.dato ? new Date(f.dato) : null,
        kundenavn: [f.kundenavn, f.sted].filter(Boolean).join(", ") || null,
        arbeidsbeskrivelse: f.arbeidsbeskrivelse,
        totalEksMva: total,
        filnavn,
        raatekst: JSON.stringify(f),
        linjer: { create: f.linjer },
      },
    });
    res.lagret++;
  }
  return res;
}
