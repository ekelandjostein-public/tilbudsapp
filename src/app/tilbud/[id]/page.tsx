import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lesGrunnlag, sumEksMva } from "@/lib/prisagent";

const kr = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_NAVN: Record<string, string> = {
  ARBEID: "Arbeid",
  MATERIELL: "Materiell",
  KJORING: "Kjøring",
  ANNET: "Annet",
};

export default async function VisTilbud({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tilbud = await db.tilbud.findUnique({
    where: { id: Number(id) },
    include: { linjer: true, befaring: { include: { kunde: true } } },
  });
  if (!tilbud) notFound();

  const { befaring } = tilbud;
  const grunnlag = lesGrunnlag(tilbud);
  const sum = sumEksMva(tilbud.linjer);
  const mva = Math.round(sum * 25) / 100;

  // Slå opp de lignende fakturaene så vi kan vise totalen deres
  const lignende = await db.faktura.findMany({
    where: { fakturanr: { in: grunnlag.lignendeFakturaer.map((f) => f.fakturanr) } },
  });
  const totalFor = (nr: string) => lignende.find((f) => f.fakturanr === nr)?.totalEksMva;

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href={`/befaring/${befaring.id}`} className="text-sm text-blue-600">
        ← Befaringen
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Tilbudsutkast til {befaring.kunde.navn}</h1>
      <p className="text-gray-500">
        Laget av prisagenten {tilbud.opprettet.toLocaleString("nb-NO")} · {tilbud.status}
      </p>

      <section className="mt-6 rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {tilbud.linjer.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-3">
                  {l.beskrivelse}
                  <div className="text-xs text-gray-500">
                    {TYPE_NAVN[l.type] ?? l.type} · {l.antall} {l.enhet} × {kr(l.enhetspris)}
                  </div>
                </td>
                <td className="p-3 text-right whitespace-nowrap">{kr(l.antall * l.enhetspris)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-3 pt-3">Sum eks. mva</td>
              <td className="px-3 pt-3 text-right">{kr(sum)}</td>
            </tr>
            <tr className="text-gray-500">
              <td className="px-3">Mva 25 %</td>
              <td className="px-3 text-right">{kr(mva)}</td>
            </tr>
            <tr className="font-bold">
              <td className="px-3 pb-3">Totalt inkl. mva</td>
              <td className="px-3 pb-3 text-right whitespace-nowrap">{kr(sum + mva)} kr</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {tilbud.begrunnelse && (
        <section className="mt-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Hvordan prisen er satt
          </h2>
          <p className="mt-2">{tilbud.begrunnelse}</p>
        </section>
      )}

      {grunnlag.lignendeFakturaer.length > 0 && (
        <section className="mt-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Bygger på disse fakturaene
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {grunnlag.lignendeFakturaer.map((f) => (
              <li key={f.fakturanr}>
                <span className="font-medium">#{f.fakturanr}</span>
                {totalFor(f.fakturanr) != null && (
                  <span className="text-gray-500"> · {kr(totalFor(f.fakturanr)!)} kr eks. mva</span>
                )}
                <p className="text-gray-600">{f.hvorfor}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grunnlag.forutsetninger.length > 0 && (
        <section className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
            Sjekk før du sender
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {grunnlag.forutsetninger.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-sm text-gray-400">
        Redigering og godkjenning kommer i steg 5
      </p>
    </main>
  );
}
