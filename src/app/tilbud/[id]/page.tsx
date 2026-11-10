import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { Grunnlag } from "@/lib/prisagent";

const kr = (n: number) => n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sikkerhetFarge = { høy: "bg-green-100 text-green-800", middels: "bg-yellow-100 text-yellow-800", lav: "bg-red-100 text-red-800" };

export default async function VisTilbud({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tilbud = await db.tilbud.findUnique({
    where: { id: Number(id) },
    include: { linjer: true, befaring: { include: { kunde: true } } },
  });
  if (!tilbud) notFound();

  const grunnlag: Grunnlag | null = tilbud.grunnlag ? JSON.parse(tilbud.grunnlag) : null;
  const sum = tilbud.linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0);
  const { befaring } = tilbud;

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href={`/befaring/${befaring.id}`} className="text-sm text-blue-600">← Befaringen</Link>
      <h1 className="mt-2 text-2xl font-bold">Tilbudsutkast</h1>
      <p className="text-gray-500">
        {befaring.kunde.navn} · {tilbud.opprettet.toLocaleDateString("nb-NO")} ·{" "}
        <span className="font-medium">{tilbud.status}</span>
      </p>

      <section className="mt-6 rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {tilbud.linjer.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-2">
                  {l.beskrivelse}
                  <div className="text-xs text-gray-500">
                    {l.antall.toLocaleString("nb-NO")} {l.enhet} × {kr(l.enhetspris)}
                    {l.kilde && (
                      <span className="ml-2 rounded bg-gray-100 px-1">
                        {l.kilde === "skjønn" ? "anslått" : `fra faktura ${l.kilde}`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right whitespace-nowrap">{kr(l.antall * l.enhetspris)}</td>
              </tr>
            ))}
            <tr className="border-b">
              <td className="p-2 font-medium">Sum eks. mva</td>
              <td className="p-2 text-right font-medium whitespace-nowrap">{kr(sum)}</td>
            </tr>
            <tr className="border-b text-gray-500">
              <td className="p-2">Mva 25 %</td>
              <td className="p-2 text-right whitespace-nowrap">{kr(sum * 0.25)}</td>
            </tr>
            <tr>
              <td className="p-2 text-lg font-bold">Totalt inkl. mva</td>
              <td className="p-2 text-right text-lg font-bold whitespace-nowrap">{kr(sum * 1.25)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Slik er prisen satt</h2>
          {grunnlag && (
            <span className={`rounded px-2 py-0.5 text-xs ${sikkerhetFarge[grunnlag.sikkerhet]}`}>
              sikkerhet: {grunnlag.sikkerhet}
            </span>
          )}
        </div>
        <p className="mt-2">{tilbud.begrunnelse}</p>

        {grunnlag && grunnlag.lignende.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold">Lignende jobber</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {grunnlag.lignende.map((x) => (
                <li key={x.fakturanr}>Faktura {x.fakturanr}: {x.hvorfor}</li>
              ))}
            </ul>
          </>
        )}
        {grunnlag && grunnlag.forutsetninger.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold">Sjekk før du sender</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {grunnlag.forutsetninger.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </>
        )}
        {grunnlag && grunnlag.merknader.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">Automatisk kontroll: {grunnlag.merknader.join(" ")}</p>
        )}
      </section>

      <p className="mt-6 text-center text-sm text-gray-400">Redigering og godkjenning kommer i steg 5</p>
    </main>
  );
}
