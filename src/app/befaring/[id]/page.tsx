import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function VisBefaring({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const befaring = await db.befaring.findUnique({
    where: { id: Number(id) },
    include: { kunde: true },
  });
  if (!befaring) notFound();
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

      <button
        disabled
        className="mt-6 w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white opacity-40"
        title="Kommer i steg 4"
      >
        Generer tilbud
      </button>
      <p className="mt-2 text-center text-sm text-gray-400">Prisagenten kobles på i steg 4</p>
    </main>
  );
}
