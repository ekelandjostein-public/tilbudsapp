// Felles regler og navn for tilbud – brukes både i nettleseren og på serveren.
import { z } from "zod";

export const LINJETYPER = ["ARBEID", "MATERIELL", "KJORING", "ANNET"] as const;

export const TYPE_NAVN: Record<string, string> = {
  ARBEID: "Arbeid",
  MATERIELL: "Materiell",
  KJORING: "Kjøring",
  ANNET: "Annet",
};

export const STATUS_NAVN: Record<string, string> = {
  UTKAST: "Utkast",
  GODKJENT: "Godkjent",
  SENDT: "Sendt",
  AKSEPTERT: "Akseptert",
  AVSLATT: "Avslått",
};

/** Formaterer kroner på norsk: 1 234,50 */
export const kr = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Leser et tall skrevet på norsk («1 250,50») eller engelsk («1250.5»). Gir NaN hvis ugyldig. */
export function lesTall(tekst: string): number {
  const renset = tekst.replace(/[\s ]/g, "").replace(",", ".");
  return renset === "" ? NaN : Number(renset);
}

/** Reglene en tilbudslinje må følge før den kan lagres. */
export const TilbudslinjeSkjema = z.object({
  type: z.enum(LINJETYPER),
  beskrivelse: z.string().trim().min(1, "Skriv en beskrivelse"),
  antall: z.number({ error: "Ugyldig antall" }).positive("Antall må være mer enn 0"),
  enhet: z.string().trim().min(1, "Skriv enhet (f.eks. time, stk, m)"),
  enhetspris: z.number({ error: "Ugyldig pris" }).min(0, "Prisen kan ikke være negativ"),
});

export const TilbudslinjerSkjema = z
  .array(TilbudslinjeSkjema)
  .min(1, "Tilbudet må ha minst én linje");

export type Tilbudslinje = z.infer<typeof TilbudslinjeSkjema>;
