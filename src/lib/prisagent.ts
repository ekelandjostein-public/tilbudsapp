// Prisagenten: lager et tilbudsutkast fra en befaring, basert på tidligere fakturaer.
//
// Slik fungerer det:
//  1. Vi henter alle tidligere fakturaer og gjør dem om til en kort, fast "prisliste-tekst".
//  2. Claude får arbeidsbeskrivelsen + fakturaene, finner de mest like jobbene og
//     foreslår tilbudslinjer. For hver linje oppgir Claude hvilken faktura prisen kommer fra.
//  3. Vanlig kode KONTROLLERER forslaget etterpå (timepris, kilder, tall), og totalen
//     regnes ut her – ikke av AI.
//  4. Utkastet lagres med status UTKAST. Fagmannen godkjenner det i neste steg.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import { claudeFeil } from "@/lib/claudeFeil";

// ---------- Formatet vi ber Claude svare i ----------

const LINJETYPER = ["ARBEID", "MATERIELL", "KJORING", "ANNET"] as const;

const Forslag = z.object({
  lignende: z
    .array(z.object({ fakturanr: z.string(), hvorfor: z.string() }))
    .describe("1–4 tidligere fakturaer som ligner mest på denne jobben, mest lik først"),
  linjer: z.array(
    z.object({
      type: z.enum(LINJETYPER),
      beskrivelse: z.string().describe("tekst slik kunden skal se den på tilbudet"),
      antall: z.number(),
      enhet: z.string().describe("time, stk, m, oppmøte …"),
      enhetspris: z.number().describe("kroner eks. mva per enhet"),
      kilde: z
        .string()
        .describe("fakturanummeret prisen/antallet er hentet fra, f.eks. «1007», eller «skjønn» hvis anslått"),
    })
  ),
  begrunnelse: z
    .string()
    .describe("2–4 setninger til fagmannen: hvordan prisen er satt og hva som skiller jobben fra de tidligere"),
  forutsetninger: z
    .array(z.string())
    .describe("ting tilbudet forutsetter, eller som fagmannen bør sjekke før det sendes"),
  sikkerhet: z
    .enum(["høy", "middels", "lav"])
    .describe("høy = nesten identisk jobb finnes; lav = lite å sammenligne med"),
});

export type Forslag = z.infer<typeof Forslag>;
export type ForslagLinje = Forslag["linjer"][number];

// ---------- Fakturaene som tekst ----------

export type FakturaMedLinjer = {
  fakturanr: string | null;
  dato: Date | null;
  arbeidsbeskrivelse: string;
  linjer: { type: string; beskrivelse: string; antall: number; enhet: string; enhetspris: number }[];
};

/** Gjør fakturaene om til kompakt tekst. Alltid samme rekkefølge, så Claude-svaret kan caches. */
export function fakturaerSomTekst(fakturaer: FakturaMedLinjer[]): string {
  return [...fakturaer]
    .sort((a, b) => (a.fakturanr ?? "").localeCompare(b.fakturanr ?? ""))
    .map((f) => {
      const hode = `### Faktura ${f.fakturanr ?? "?"} (${f.dato?.toISOString().slice(0, 10) ?? "ukjent dato"}): ${f.arbeidsbeskrivelse}`;
      const linjer = f.linjer.map(
        (l) => `- ${l.type}: ${l.beskrivelse} | ${l.antall} ${l.enhet} × ${l.enhetspris} kr`
      );
      return [hode, ...linjer].join("\n");
    })
    .join("\n\n");
}

// ---------- Instruksen til Claude ----------

function instruks(timepris: number) {
  return `Du er prisagent for en norsk elektrobedrift. Du lager utkast til tilbud ut fra en
arbeidsbeskrivelse fra befaring, og setter prisene ut fra bedriftens egne tidligere fakturaer.

Slik gjør du det:
- Finn de tidligere jobbene som ligner mest, og bruk dem som mal for hvilke linjer tilbudet trenger.
- Arbeid: én eller flere ARBEID-linjer i timer, med timepris ${timepris} kr eks. mva.
  Anslå timene ut fra lignende jobber og skaler etter omfanget i beskrivelsen
  (f.eks. dobbelt så mange punkter gir ikke nødvendigvis dobbelt så mange timer). Rund av til nærmeste halve time.
- Materiell: bruk samme produkt og pris som i fakturaene når det passer. Mangler produktet,
  anslå en realistisk pris, sett kilde «skjønn» og nevn det under forutsetninger.
- Ta med servicebil/kjøring som på tidligere fakturaer, og samsvarserklæring/dokumentasjon når
  jobben er en ny installasjon eller endring i anlegget som krever det.
- Ikke legg til arbeid eller utstyr beskrivelsen ikke gir grunn til. Er noe uklart, gjør en
  rimelig antakelse og skriv den under forutsetninger.
- Alle priser er eks. mva. Ikke regn ut summer – det gjør systemet.
- Skriv på norsk. Linjebeskrivelsene skal kunne leses av kunden.`;
}

// ---------- Kontroll av forslaget (vanlig kode, ingen AI) ----------

export type KontrollertForslag = Forslag & {
  sumEksMva: number;
  merknader: string[]; // hva kontrollen endret
};

export function kontrollerForslag(
  forslag: Forslag,
  timepris: number,
  kjenteFakturanr: string[]
): KontrollertForslag {
  const kjente = new Set(kjenteFakturanr);
  const merknader: string[] = [];

  const linjer = forslag.linjer
    .filter((l) => {
      const ok = l.antall > 0 && l.enhetspris >= 0;
      if (!ok) merknader.push(`Fjernet linjen «${l.beskrivelse}» (ugyldig antall eller pris).`);
      return ok;
    })
    .map((l) => {
      const linje = { ...l };
      // Timeprisen er firmaets, ikke noe agenten bestemmer
      if (linje.type === "ARBEID" && linje.enhetspris !== timepris) {
        merknader.push(`Timepris på «${linje.beskrivelse}» rettet fra ${linje.enhetspris} til ${timepris} kr.`);
        linje.enhetspris = timepris;
      }
      // Kilden må være en faktura som faktisk finnes
      const nr = linje.kilde.match(/\d+/)?.[0];
      if (linje.kilde.trim().toLowerCase() === "skjønn") {
        linje.kilde = "skjønn";
      } else if (!(nr && kjente.has(nr))) {
        merknader.push(`Ukjent kilde «${linje.kilde}» på «${linje.beskrivelse}» – merket som skjønn.`);
        linje.kilde = "skjønn";
      } else if (nr) {
        linje.kilde = nr;
      }
      return linje;
    });

  const lignende = forslag.lignende.filter((x) => kjente.has(x.fakturanr));
  const sumEksMva = Math.round(linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0) * 100) / 100;

  return { ...forslag, lignende, linjer, sumEksMva, merknader };
}

// ---------- Selve kallet til Claude ----------

// Lages først når den trengs, så appen kan starte selv om nøkkelen mangler
let _client: Anthropic | undefined;
const client = () => (_client ??= new Anthropic());

/** Lager et prisforslag. Lagrer ingenting – det gjør lagTilbudsutkast. */
export async function foreslaTilbud(input: {
  arbeidsbeskrivelse: string;
  timepris: number;
  fakturaer: FakturaMedLinjer[];
}): Promise<KontrollertForslag> {
  if (input.fakturaer.length === 0)
    throw new Error("Ingen tidligere fakturaer er lest inn – prisagenten har ingenting å sammenligne med.");

  let svar;
  try {
    svar = await client().beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(Forslag) },
      // Hvis modellen avslår forespørselen, prøver API-et automatisk en annen modell
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: instruks(input.timepris) },
        {
          // Fakturaene endrer seg sjelden, så de caches: kall nr. 2 og utover blir billigere og raskere
          type: "text",
          text: `Tidligere fakturaer fra bedriften:\n\n${fakturaerSomTekst(input.fakturaer)}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Arbeidsbeskrivelse fra befaringen:\n\n${input.arbeidsbeskrivelse}\n\nLag et tilbudsutkast.`,
        },
      ],
    });
  } catch (e) {
    throw claudeFeil(e);
  }

  if (svar.stop_reason === "refusal") throw new Error("Claude ville ikke lage dette tilbudet.");
  if (svar.stop_reason === "max_tokens") throw new Error("Svaret ble for langt – prøv en kortere beskrivelse.");
  if (!svar.parsed_output) throw new Error("Fikk ikke et gyldig svar fra Claude.");

  const kjente = input.fakturaer.map((f) => f.fakturanr).filter((n): n is string => !!n);
  return kontrollerForslag(svar.parsed_output, input.timepris, kjente);
}

// ---------- Lagring ----------

export type Grunnlag = Pick<KontrollertForslag, "lignende" | "forutsetninger" | "sikkerhet" | "merknader">;

/** Lager et tilbudsutkast for en befaring og lagrer det. Returnerer id-en til tilbudet. */
export async function lagTilbudsutkast(befaringId: number): Promise<number> {
  const [befaring, firma, fakturaer] = await Promise.all([
    db.befaring.findUnique({ where: { id: befaringId } }),
    db.firma.findFirst(),
    db.faktura.findMany({ include: { linjer: true } }),
  ]);
  if (!befaring) throw new Error("Fant ikke befaringen.");
  if (!firma) throw new Error("Firmaopplysninger mangler – kjør «npx prisma db seed».");

  const f = await foreslaTilbud({
    arbeidsbeskrivelse: befaring.arbeidsbeskrivelse,
    timepris: firma.timepris,
    fakturaer,
  });

  const grunnlag: Grunnlag = {
    lignende: f.lignende,
    forutsetninger: f.forutsetninger,
    sikkerhet: f.sikkerhet,
    merknader: f.merknader,
  };

  const tilbud = await db.tilbud.create({
    data: {
      befaringId,
      status: "UTKAST",
      begrunnelse: f.begrunnelse,
      grunnlag: JSON.stringify(grunnlag),
      linjer: { create: f.linjer },
    },
  });
  return tilbud.id;
}
