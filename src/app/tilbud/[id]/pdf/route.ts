// /tilbud/123/pdf – lager PDF-en til tilbudet og sender den til nettleseren.
import { hentTilbudsdokument } from "@/lib/tilbudsdokument";
import { hentBruker } from "@/lib/innlogging";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hentBruker())) return new Response("Ikke logget inn", { status: 401 });
  const { id } = await params;
  const dok = await hentTilbudsdokument(Number(id));
  if (!dok) return new Response("Fant ikke tilbudet", { status: 404 });

  return new Response(Buffer.from(await dok.lagPdf()), {
    headers: {
      "Content-Type": "application/pdf",
      // «inline» = åpnes i nettleseren; filnavnet brukes hvis du lagrer den
      "Content-Disposition": `inline; filename="${dok.epost.vedlegg}"`,
      "Cache-Control": "no-store",
    },
  });
}
