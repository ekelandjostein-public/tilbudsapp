// /tilbud/123/pdf – lager PDF-en til tilbudet og sender den til nettleseren.
import { db } from "@/lib/db";
import { lagTilbudPdf } from "@/lib/tilbudspdf";
import { pdfFilnavn } from "@/lib/epost";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tilbud = await db.tilbud.findUnique({
    where: { id: Number(id) },
    include: { linjer: { orderBy: { id: "asc" } }, befaring: { include: { kunde: true } } },
  });
  const firma = await db.firma.findFirst();
  if (!tilbud || !firma) return new Response("Fant ikke tilbudet", { status: 404 });

  const pdf = await lagTilbudPdf({
    nummer: tilbud.id,
    dato: tilbud.godkjent ?? new Date(),
    erUtkast: tilbud.status === "UTKAST",
    firma,
    kunde: tilbud.befaring.kunde,
    linjer: tilbud.linjer,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // «inline» = åpnes i nettleseren; filnavnet brukes hvis du lagrer den
      "Content-Disposition": `inline; filename="${pdfFilnavn(tilbud.id)}"`,
      "Cache-Control": "no-store",
    },
  });
}
