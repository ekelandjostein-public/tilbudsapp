"use server";
import { redirect } from "next/navigation";
import { lagTilbudsutkast } from "@/lib/prisagent";

export type GenererTilstand = { feil?: string };

/** Kjører prisagenten for en befaring og sender brukeren til det nye utkastet. */
export async function genererTilbud(befaringId: number): Promise<GenererTilstand> {
  let tilbudId: number;
  try {
    tilbudId = await lagTilbudsutkast(befaringId);
  } catch (e) {
    console.error(e);
    return { feil: e instanceof Error ? e.message : "Noe gikk galt" };
  }
  redirect(`/tilbud/${tilbudId}`);
}
