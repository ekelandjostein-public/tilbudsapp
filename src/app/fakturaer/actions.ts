"use server";
import { revalidatePath } from "next/cache";
import { importerFakturaPdf, type ImportResultat } from "@/lib/fakturaleser";

export type OpplastingTilstand = { resultat?: ImportResultat; feil?: string };

export async function lastOppFakturaer(
  _forrige: OpplastingTilstand,
  formData: FormData
): Promise<OpplastingTilstand> {
  const filer = formData.getAll("pdf").filter((f): f is File => f instanceof File && f.size > 0);
  if (filer.length === 0) return { feil: "Velg minst én PDF-fil" };

  const sum: ImportResultat = { lagret: 0, hoppetOver: [], avvik: [] };
  try {
    for (const fil of filer) {
      const r = await importerFakturaPdf(Buffer.from(await fil.arrayBuffer()), fil.name);
      sum.lagret += r.lagret;
      sum.hoppetOver.push(...r.hoppetOver);
      sum.avvik.push(...r.avvik);
    }
  } catch (e) {
    return { feil: e instanceof Error ? e.message : "Noe gikk galt", resultat: sum };
  }
  revalidatePath("/fakturaer");
  return { resultat: sum };
}
