import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import GenererKnapp from "@/app/tilbud/GenererKnapp";

export default async function VisBefaring({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const befaring = await db.befaring.findUnique({
    where: { id: Number(id) },
    include: { kunde: true, tilbud: { orderBy: { opprettet: "desc" }, include: { linjer: true } } },
  });
  if (!befaring) notFound();
  const harFakturaer = (await db.faktura.count()) > 0;
  const { kunde } = befaring;

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="text-sm text-blue-600">← Alle befaringer</Link>
      <h1 className="mt-2 text-2xl font-bold">Befaring hos {kunde.navn}</h1>
      <p className="text-gray-500">{befaring.dato.toLocaleDateString("nb-NO")}</p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Kunde</h2>
        <p className="mt-2">{kunde.adresse}</p>
        {kunde.telefon && <p>{kunde.telefon}</p>}
        <p>{kunde.epost}</p>
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Arbeidsbeskrivelse
        </h2>
        <p className="mt-2 whitespace-pre-wrap">{befaring.arbeidsbeskrivelse}</p>
      </section>

      {befaring.tilbud.length > 0 && (
        <section className="mt-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Tilbud</h2>
          <ul className="mt-2 divide-y">
            {befaring.tilbud.map((t) => (
              <li key={t.id}>
                <Link href={`/tilbud/${t.id}`} className="flex justify-between py-2 text-blue-600">
                  <span>{t.status} · {t.opprettet.toLocaleDateString("nb-NO")}</span>
                  <span>
                    {(t.linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0) * 1.25).toLocaleString("nb-NO", { maximumFractionDigits: 0 })} kr inkl. mva
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GenererKnapp befaringId={befaring.id} harFakturaer={harFakturaer} />
    </main>
  );
}
