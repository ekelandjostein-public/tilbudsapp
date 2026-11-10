"use server";
import { redirect } from "next/navigation";
import { lagTilbudsutkast } from "@/lib/prisagent";

export type GenererTilstand = { feil?: string };

export async function genererTilbud(
  befaringId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _forrige: GenererTilstand
): Promise<GenererTilstand> {
  let tilbudId: number;
  try {
    tilbudId = await lagTilbudsutkast(befaringId);
  } catch (e) {
    return { feil: e instanceof Error ? e.message : "Noe gikk galt" };
  }
  redirect(`/tilbud/${tilbudId}`);
}
